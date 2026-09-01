const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  generateSummary,
  autoFillResume,
  getOccupationSuggestions,
  improveExperienceEntry,
  translateContent,
  getOccupationCategories,
  previewOccupationSuggestions,
  previewImproveExperience,
  getAtsAnalysis,
} = require("../controllers/resumeAiController");

// ── IMPORTANT: static routes MUST come before /:resumeId routes ──────────────
// Otherwise Express matches "occupation-categories" as a resumeId param.

router.get("/occupation-categories", authenticate, getOccupationCategories);
router.post("/occupation-suggestions/preview", authenticate, previewOccupationSuggestions);
router.post("/improve-experience/preview", authenticate, previewImproveExperience);

// ── Routes that need a resumeId ───────────────────────────────────────────────
router.post("/:resumeId/summary", authenticate, generateSummary);
router.post("/:resumeId/autofill", authenticate, autoFillResume);
router.post("/:resumeId/occupation-suggestions", authenticate, getOccupationSuggestions);
router.post("/:resumeId/improve-experience", authenticate, improveExperienceEntry);
router.post("/:resumeId/translate", authenticate, translateContent);
router.get("/:resumeId/ats-analysis", authenticate, getAtsAnalysis);

module.exports = router;