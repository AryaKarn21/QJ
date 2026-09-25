const { GoogleGenAI } = require("@google/genai");

// ─────────────────────────────────────────────────────────────────────────────
// Single shared factory for the Gemini client.
// Reads GEMINI_API_KEY, PRIMARY_GEMINI_MODEL, and FALLBACK_GEMINI_MODEL
// from the environment so nothing is hardcoded.
// ─────────────────────────────────────────────────────────────────────────────

let cachedClient = null;

// Errors that are genuinely temporary — Google's own guidance for these is
// "try again later". We retry with exponential backoff.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_CODES_RE = /UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|rate.limit|internal.error/i;

// Errors that are permanent — retrying wastes time and quota.
// These surface immediately with a clear message.
const PERMANENT_STATUSES = new Set([400, 401, 403, 404]);
const PERMANENT_CODES_RE = /API.key.not.valid|API_KEY_INVALID|invalid.argument|model.not.found|NOT_FOUND|is.no.longer.available/i;

/**
 * Returns true when a thrown Gemini/network error is safe to retry.
 * Returns false for permanent failures (bad key, bad request, retired model).
 */
function isRetryable(error) {
  const status = error.status || error.response?.status;
  const message = String(error.message || "");

  // Permanent errors — never retry.
  if (PERMANENT_STATUSES.has(status) || PERMANENT_CODES_RE.test(message)) {
    return false;
  }

  // Known transient HTTP statuses.
  if (RETRYABLE_STATUSES.has(status)) return true;

  // Known transient error code substrings.
  if (RETRYABLE_CODES_RE.test(message)) return true;

  // Network-level failures (DNS, connection refused, timeout) —
  // these never have an HTTP status.
  if (
    !status &&
    /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(message)
  ) {
    return true;
  }

  return false;
}

/**
 * Sleep for `ms` milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls cachedClient.models.generateContent with exponential backoff.
 *
 * Retry schedule (configurable via env):
 *   Attempt 1  → immediate
 *   Attempt 2  → delay after 1st failure (default 1 500 ms)
 *   Attempt 3  → delay after 2nd failure (default 3 500 ms)
 *   (stop — no infinite loop)
 *
 * Only retries transient errors (503, 429, network). Permanent errors
 * (invalid key, bad request, retired model) are re-thrown immediately.
 */
async function generateWithRetry(modelName, prompt) {
  const MAX_ATTEMPTS = parseInt(process.env.GEMINI_MAX_RETRIES || "3", 10);
  // Base delay in ms — doubles each attempt (1 500 → 3 000 → …)
  const BASE_DELAY_MS = parseInt(process.env.GEMINI_BASE_RETRY_DELAY_MS || "1500", 10);

  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[GEMINI] attempt ${attempt} with model "${modelName}"…`);
      }

      const response = await cachedClient.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      if (attempt > 1) {
        console.log(`[GEMINI] attempt ${attempt} succeeded.`);
      }

      return response;
    } catch (error) {
      lastError = error;
      const status = error.status || error.response?.status;

      if (!isRetryable(error)) {
        // Permanent failure — surface immediately, no retry.
        console.error(
          `[GEMINI] attempt ${attempt} failed with permanent error (${status || "no-status"}): ${error.message}`
        );
        throw error;
      }

      console.warn(
        `[GEMINI] attempt ${attempt} failed with transient error (${status || "no-status"}): ${error.message}`
      );

      if (attempt < MAX_ATTEMPTS) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[GEMINI] retrying in ${delay}ms…`);
        await sleep(delay);
      } else {
        console.error(
          `[GEMINI] all ${MAX_ATTEMPTS} attempts exhausted for model "${modelName}".`
        );
      }
    }
  }

  throw lastError;
}

/**
 * Returns a Gemini model shim.
 *
 * Model resolution order:
 *   1. modelName parameter (if explicitly passed by a caller)
 *   2. PRIMARY_GEMINI_MODEL env var
 *   3. "gemini-flash-latest" hardcoded fallback
 *
 * A FALLBACK_GEMINI_MODEL env var is tried automatically if the primary
 * model exhausts all retries with a permanent 404 / "no longer available"
 * error, so a retired pinned model never silently breaks everything.
 *
 * Every caller that already does `getGeminiModel().generateContent(prompt)`
 * and reads `result.response.text()` keeps working unchanged.
 */
function getGeminiModel(modelName) {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error(
      "GEMINI_API_KEY is not set. AI features are disabled until it's added to backend/.env."
    );
    err.code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  // Resolve which model to use.
  const primaryModel =
    modelName ||
    process.env.PRIMARY_GEMINI_MODEL ||
    "gemini-flash-latest";

  const fallbackModel = process.env.FALLBACK_GEMINI_MODEL || null;

  return {
    generateContent: async (prompt) => {
      // --- Try primary model with retry/backoff ---
      try {
        const response = await generateWithRetry(primaryModel, prompt);
        return { response: { text: () => response.text } };
      } catch (primaryError) {
        // If the primary model is permanently gone (404 / retired) AND a
        // fallback is configured, try the fallback before giving up.
        const isPermanentlyGone =
          primaryError.status === 404 ||
          /is no longer available|model not found|NOT_FOUND/i.test(
            String(primaryError.message || "")
          );

        if (isPermanentlyGone && fallbackModel && fallbackModel !== primaryModel) {
          console.warn(
            `[GEMINI] primary model "${primaryModel}" is unavailable. ` +
            `Falling back to "${fallbackModel}".`
          );
          try {
            const response = await generateWithRetry(fallbackModel, prompt);
            console.log(`[GEMINI] fallback model "${fallbackModel}" succeeded.`);
            return { response: { text: () => response.text } };
          } catch (fallbackError) {
            console.error(
              `[GEMINI] fallback model "${fallbackModel}" also failed:`,
              fallbackError.message
            );
            // Throw the fallback error so classifyGeminiError() sees it.
            throw fallbackError;
          }
        }

        // No fallback configured, or not a model-retirement error — propagate.
        throw primaryError;
      }
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: strip ```json fences before JSON.parse
// ─────────────────────────────────────────────────────────────────────────────

function extractJson(rawText) {
  const cleaned = rawText.replace(/```json\s*|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const err = new Error("Gemini response was not valid JSON after fence-stripping.");
    err.code = "AI_BAD_RESPONSE";
    err.cause = e;
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: classify a raw Gemini/network error into a known code string so
// the controller layer (friendlyAiError) can return a specific, honest
// message instead of a generic fallback.
// ─────────────────────────────────────────────────────────────────────────────

function classifyGeminiError(error) {
  if (!error) return null;
  if (error.code === "GEMINI_NOT_CONFIGURED" || error.code === "AI_BAD_RESPONSE") {
    return error.code; // already classified
  }

  const status = error.status || error.response?.status;
  const message = String(error.message || "");

  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(message)) return "GEMINI_INVALID_KEY";
  if (status === 401 || status === 403) return "GEMINI_INVALID_KEY";
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message)) return "GEMINI_QUOTA_EXCEEDED";

  // Google retires pinned model versions — the API 404s with "no longer available".
  if (status === 404 || /is no longer available|model not found|NOT_FOUND/i.test(message)) return "GEMINI_UNAVAILABLE";
  if (status === 503 || /UNAVAILABLE|overloaded/i.test(message)) return "GEMINI_TEMPORARILY_UNAVAILABLE";
  if (typeof status === "number" && status >= 500) return "GEMINI_TEMPORARILY_UNAVAILABLE";

  // Network-level failure (DNS, connection refused, timeout).
  if (!status && /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(message)) {
    return "GEMINI_NETWORK_ERROR";
  }

  return null; // unrecognized — caller falls back to generic message
}

module.exports = { getGeminiModel, extractJson, classifyGeminiError };