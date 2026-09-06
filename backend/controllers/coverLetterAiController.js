const AiUsageLog = require("../models/AiUsageLog");
const { runCoverLetterAction, VALID_ACTIONS } = require("../services/coverLetterAI.service");

// Same fire-and-forget usage-logging pattern as resumeAiController.js /
// communityAiController.js — never blocks or fails the actual response.
function logAiUsage(feature, userId) {
  AiUsageLog.create({ feature, action: "generated", user: userId || null }).catch((e) =>
    console.error(`Failed to log AI usage (${feature}):`, e.message)
  );
}

// Same shape as resumeAiController.js's friendlyAiError — never leak a raw
// Gemini/axios error message to the client.
function friendlyAiError(res, error, fallbackMessage) {
  if (error.code === "GEMINI_NOT_CONFIGURED") {
    return res.status(503).json({
      message: "AI features aren't configured yet. Add GEMINI_API_KEY to the backend .env file.",
    });
  }
  if (error.status === 400) {
    return res.status(400).json({ message: error.message });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
}

// POST /api/ai/cover-letter
// body: { jobTitle, companyName, jobDescription, candidateProfile,
//         candidateSkills, candidateExperience, resumeText, tone,
//         existingCoverLetter, action, candidateName }
const generateCoverLetter = async (req, res) => {
  try {
    const { action } = req.body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({ message: `Invalid action. Use one of: ${VALID_ACTIONS.join(", ")}.` });
    }

    // candidateName defaults to the authenticated user's real name rather
    // than trusting whatever the client sends, same trust boundary as
    // resumeAiController deriving facts from the owned resource rather
    // than the request body wherever it can.
    const content = await runCoverLetterAction({
      ...req.body,
      candidateName: req.body.candidateName || req.user?.name,
    });

    logAiUsage("cover_letter", req.user?._id);
    res.json({ content });
  } catch (error) {
    friendlyAiError(res, error, "Failed to generate cover letter content.");
  }
};

module.exports = { generateCoverLetter };
