const { getGeminiModel, extractJson } = require("./geminiClient");

// Runs on every text-bearing post/comment at creation time. Fails OPEN
// (treats content as approved) if Gemini isn't configured or errors out —
// a missing API key should degrade the community feature, not take the
// whole posting flow down. Real moderation providers (or a stricter
// fail-closed policy) can replace this later without touching callers.
async function moderateText(text) {
  if (!text || !text.trim()) {
    return { status: "approved", flags: [], reason: "" };
  }

  try {
    const model = getGeminiModel();
    const prompt = `
You are a content moderation classifier for a professional careers/recruitment
community feed (like LinkedIn). Classify the text below.

Flag content that contains: hate speech, harassment, explicit sexual content,
graphic violence, spam/scam links, discriminatory hiring language (e.g. age,
gender, religion, disability-based exclusion in a job post), or clearly fake
job/hiring scams asking for upfront payment.

Do NOT flag: normal career opinions, negative reviews of a company/employer
written respectfully, salary discussions, or blunt career advice.

Respond with ONLY raw JSON, no markdown fences, in this exact shape:
{"status": "approved" | "flagged", "flags": string[], "reason": string}

Text:
"""${text.slice(0, 4000)}"""
`.trim();

    const result = await model.generateContent(prompt);
    const parsed = extractJson(result.response.text());

    const status = parsed.status === "flagged" ? "flagged" : "approved";
    return {
      status,
      flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 10) : [],
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 500) : "",
    };
  } catch (error) {
    if (error.code !== "GEMINI_NOT_CONFIGURED") {
      console.error("AI moderation check failed, defaulting to approved:", error.message);
    }
    return { status: "approved", flags: [], reason: "" };
  }
}

// Lightweight heuristic used alongside/independent of the AI check for
// "hiring intent" — a post whose *text* reads like a hiring announcement
// even though the author picked "text" as the post type. Powers the
// hiring-detection AI feature (offer to switch it to a Hiring post) and
// doesn't require the AI to be configured at all.
const HIRING_KEYWORDS = [
  "we're hiring", "we are hiring", "now hiring", "hiring alert", "urgently hiring",
  "job opening", "job opportunity", "open position", "open role", "join our team",
  "apply now", "send your resume", "send your cv", "looking for a", "looking to hire",
  "we're looking for", "we are looking for", "dm to apply", "walk-in interview",
];

function detectHiringIntentHeuristic(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HIRING_KEYWORDS.some((kw) => lower.includes(kw));
}

module.exports = { moderateText, detectHiringIntentHeuristic };
