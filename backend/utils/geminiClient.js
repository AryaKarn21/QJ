const { GoogleGenerativeAI } = require("@google/generative-ai");

// Single shared factory for the Gemini client, following the same
// model/version already used in controllers/blogController.js. Centralized
// here so every AI feature (caption generation, grammar correction,
// summarization, moderation, hiring detection, job recommendations) reads
// GEMINI_API_KEY from the same place and fails the same, readable way if
// it's missing — instead of five copies of `new GoogleGenerativeAI(...)`.
let cachedClient = null;

// "gemini-3.5-flash" here was a typo (there is no such model — the
// comment above even says this should match blogController.js, which
// used "gemini-2.5-flash") that broke every caller of this shared
// client: chatbot, community AI (captions/grammar/summarize/moderation/
// hiring-detect/job-recs), resume AI, and content moderation all request
// a model that doesn't exist and fail on every call.
function getGeminiModel(modelName = "gemini-2.5-flash")   {
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
    cachedClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  return cachedClient.getGenerativeModel({ model: modelName });
}

// Gemini sometimes wraps JSON replies in ```json ... ``` fences even when
// asked not to — strip them before JSON.parse instead of letting every
// caller reimplement this.
function extractJson(rawText) {
  const cleaned = rawText.replace(/```json\s*|```/g, "").trim();
  return JSON.parse(cleaned);
}

module.exports = { getGeminiModel, extractJson };
