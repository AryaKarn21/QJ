const { GoogleGenAI } = require("@google/genai");

// Single shared factory for the Gemini client, following the same
// model/version already used in controllers/blogController.js. Centralized
// here so every AI feature (caption generation, grammar correction,
// summarization, moderation, hiring detection, job recommendations) reads
// GEMINI_API_KEY from the same place and fails the same, readable way if
// it's missing — instead of five copies of `new GoogleGenAI(...)`.
let cachedClient = null;

// SDK: this used to run on @google/generative-ai, which Google fully
// retired — that package's repo is archived and its support window (ended
// Nov 30, 2025) is long closed. Every AI feature in this app (autofill,
// captions, moderation, etc.) was failing with 500/503s in production
// because of it, not because of the model name. Migrated to the current
// official package, @google/genai. Its generateContent call shape is
// different (ai.models.generateContent({ model, contents }) instead of a
// stateful model.generateContent(prompt), and response.text is a plain
// property instead of a response.text() method) — that difference is
// contained entirely inside this shim, so every one of the ~8 controllers
// that already call `getGeminiModel().generateContent(prompt)` and read
// `result.response.text()` keeps working unchanged.
function getGeminiModel(modelName = "gemini-3.6-flash") {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error(
      "GEMINI_API_KEY is not set. AI features (caption generation, grammar " +
      "correction, summarization, moderation, hiring detection, job " +
      "recommendations) are disabled until it's added to backend/.env."
    );
    err.code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return {
    generateContent: async (prompt) => {
      const response = await cachedClient.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      return { response: { text: () => response.text } };
    },
  };
}

// Gemini sometimes wraps JSON replies in ```json ... ``` fences even when
// asked not to — strip them before JSON.parse instead of letting every
// caller reimplement this. Previously a parse failure here threw a bare
// `SyntaxError` that every caller's catch block treated identically to any
// other unrelated failure (auth, quota, network) — tagging it lets
// classifyGeminiError()/friendlyAiError() give a specific, honest message
// ("the AI response was in an unexpected format") instead of a generic one.
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

// Classifies whatever the @google/generative-ai SDK (or a plain network
// failure) throws into one of a small set of known `.code`s, so the
// controller layer (friendlyAiError) can give the user a specific, honest
// reason instead of one generic "AI request failed" message no matter what
// actually went wrong. Before this, an expired/invalid/quota-exceeded key
// and a genuine network blip all looked identical to the caller — there
// was no way to tell "the key needs rotating" from "try again in a bit"
// from "we have a real bug".
//
// The SDK (v0.24.1) throws errors from the underlying REST call with a
// numeric `.status` (mirroring the Gemini API's HTTP status) and a
// `.message` that usually echoes the API's error body — matched here by
// status first (most reliable), falling back to message substrings for
// cases where a status isn't present (e.g. the request never reached
// Google's servers at all).
function classifyGeminiError(error) {
  if (!error) return null;
  if (error.code === "GEMINI_NOT_CONFIGURED" || error.code === "AI_BAD_RESPONSE") {
    return error.code; // already classified — nothing to do
  }

  const status = error.status || error.response?.status;
  const message = String(error.message || "");

  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(message)) return "GEMINI_INVALID_KEY";
  if (status === 401 || status === 403) return "GEMINI_INVALID_KEY";
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message)) return "GEMINI_QUOTA_EXCEEDED";
  if (status === 503 || /UNAVAILABLE|overloaded/i.test(message)) return "GEMINI_UNAVAILABLE";
  if (typeof status === "number" && status >= 500) return "GEMINI_UNAVAILABLE";

  // No HTTP status at all usually means the request never reached Google —
  // a DNS failure, connection refused/reset, or timeout from the fetch
  // layer itself, all reported by Node with these codes/message shapes.
  if (!status && /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(message)) {
    return "GEMINI_NETWORK_ERROR";
  }

  return null; // unrecognized — caller falls back to its generic message
}

module.exports = { getGeminiModel, extractJson, classifyGeminiError };