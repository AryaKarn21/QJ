const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");
const { coverLetterAiLimiter } = require("../middleware/rateLimiters");
const { generateCoverLetter } = require("../controllers/coverLetterAiController");

// Mounted at /api/ai/cover-letter (server.js). Jobseeker-only — this is the
// applicant-facing cover-letter assistant. Rate-limited since every call
// hits the Gemini API (resume/community AI routes currently have no
// limiter at all — this closes that gap for at least the new endpoint).
router.post("/", authenticate, authorizeRoles("jobseeker"), coverLetterAiLimiter, generateCoverLetter);

module.exports = router;
