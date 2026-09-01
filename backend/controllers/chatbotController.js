const Faq = require("../models/Faq");
const AiUsageLog = require("../models/AiUsageLog");
const { getGeminiModel } = require("../utils/geminiClient");

// In-app help assistant. Deliberately public (no `authenticate` middleware
// on its route) so a logged-out visitor deciding whether to sign up can
// still get guidance — see routes/chatbotRoutes.js for the rate limit that
// protects it instead of an auth wall.

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 6;

// Grounds the model in what QuickJobs actually has, with real routes, so
// answers link to pages that exist instead of inventing ones. Kept in sync
// by hand with App.tsx's route table — there are only a handful of
// user-facing destinations worth mentioning here.
const SYSTEM_PROMPT = `
You are the "QuickJobs Assistant", an automated in-app help assistant for
the QuickJobs job platform. You are NOT a human agent — if asked, say so
plainly.

Your job is ONLY to guide users on how to use the QuickJobs platform:
- Finding and applying for jobs (/jobs, /jobs/:id, "Apply" button)
- Creating/editing a jobseeker or employer profile (/user/profile,
  /employer/profile)
- The Resume Builder: browsing templates, customizing, and the ATS Score
  tool (keyword matching, missing skills/sections, suggestions) at /resume
- Following people and companies, followers/following counts, and the
  community feed at /community
- Company pages: People, Jobs, About, Posts tabs on a company's profile
- Blogs: creating, editing, drafts, and publishing at /blog
- Notifications: the bell icon, unread count, mark as read
- Subscriptions/plans: /user/subscription (jobseeker) or
  /employer/subscription (employer)
- General platform navigation, FAQ (/faq) and Career Tips (/career-tips)

Hard rules:
- Never claim a resume or ATS score guarantees acceptance, an interview, or
  passing any specific employer's ATS system — ATS scoring here is
  guidance only, not a guarantee.
- Never ask the user for their password, OTP, verification code, card
  number, or any other credential/secret. If asked to reset a password or
  handle a billing dispute, tell them to use the relevant in-app form
  (Settings > Change Password, or Forgot Password) or contact Support —
  don't attempt it yourself.
- If a question is unrelated to using QuickJobs (general knowledge,
  personal advice unrelated to careers, coding help, etc.), politely
  decline and steer back to what you can help with.
- Keep answers short: 2-5 sentences, plain text, no markdown tables. You
  may mention a relevant in-app path like /resume when useful.
- If you don't actually know something about QuickJobs, say so and
  suggest checking /faq or contacting Support rather than guessing.
`.trim();

// Small curated set of starter prompts covering the areas users most often
// need help with — shown as quick-tap suggestions before a user has typed
// anything. Kept separate from the full FAQ list (that's a much longer,
// admin-authored list already served by GET /api/cms/faqs).
const SUGGESTED_QUESTIONS = [
  "How do I apply for a job?",
  "How does the ATS score work?",
  "How do I follow a company or person?",
  "How do I create my resume?",
  "How do I write a blog post?",
  "What subscription plans are available?",
  "How do notifications work?",
];

function logUsage(userId) {
  AiUsageLog.create({ feature: "chatbot", action: "generated", user: userId || null }).catch((e) =>
    console.error("Failed to log chatbot AI usage:", e.message)
  );
}

// Keyword-overlap match against the real, admin-authored FAQ collection —
// used whenever Gemini isn't configured or a call fails, so the assistant
// still gives a grounded, non-fabricated answer instead of an error.
// Pure scoring logic split out from the DB fetch below so it's testable
// without a Mongo connection (see tests/chatbotController.test.js).
function scoreFaqMatch(faqs, message) {
  const words = (message || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return null;

  let best = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const haystack = `${faq.question} ${faq.answer}`.toLowerCase();
    const score = words.reduce((acc, w) => (haystack.includes(w) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  if (best && bestScore >= 1) {
    return { reply: best.answer, source: "faq", matchedQuestion: best.question };
  }
  return null;
}

async function faqFallback(message) {
  const faqs = await Faq.find({ isActive: true }).lean();
  return scoreFaqMatch(faqs, message);
}

function genericFallback() {
  return {
    reply:
      "I couldn't find a specific answer to that. You can browse jobs at /jobs, build a resume at /resume, " +
      "or check the FAQ page for common questions. For anything account-specific, please contact Support.",
    source: "fallback",
  };
}

exports.ask = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Please enter a message." });
    }
    const trimmedMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH);

    const safeHistory = Array.isArray(history)
      ? history
          .filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.text === "string")
          .slice(-MAX_HISTORY_TURNS)
          .map((h) => ({ role: h.role, text: h.text.slice(0, MAX_MESSAGE_LENGTH) }))
      : [];

    try {
      const model = getGeminiModel();
      const transcript = safeHistory
        .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text}`)
        .join("\n");
      const prompt = `${SYSTEM_PROMPT}\n\n${transcript ? transcript + "\n" : ""}User: ${trimmedMessage}\nAssistant:`;

      const result = await model.generateContent(prompt);
      const reply = result.response.text().trim();

      logUsage(req.user?._id);
      return res.json({ reply, source: "ai" });
    } catch (aiError) {
      // Gemini not configured or the call failed — fall back to a
      // grounded FAQ match, then a generic canned response, rather than
      // erroring the whole request out.
      const faqMatch = await faqFallback(trimmedMessage);
      logUsage(req.user?._id);
      return res.json(faqMatch || genericFallback());
    }
  } catch (error) {
    console.error("Chatbot request failed:", error);
    res.status(500).json({ message: "The assistant is temporarily unavailable. Please try again." });
  }
};

exports.getSuggestions = (req, res) => {
  res.json({ suggestions: SUGGESTED_QUESTIONS });
};

// Exported for unit testing (tests/chatbotController.test.js) — both are
// pure functions with no DB/network dependency.
exports.scoreFaqMatch = scoreFaqMatch;
exports.genericFallback = genericFallback;
