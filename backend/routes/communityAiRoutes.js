const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  generateCaption,
  correctGrammar,
  summarizePost,
  checkModeration,
  detectHiringIntent,
  getJobRecommendations,
} = require("../controllers/communityAiController");

router.post("/caption", authenticate, generateCaption);
router.post("/grammar", authenticate, correctGrammar);
router.post("/summarize", authenticate, summarizePost);
router.post("/moderate", authenticate, checkModeration);
router.post("/hiring-detect", authenticate, detectHiringIntent);
router.get("/job-recommendations", authenticate, getJobRecommendations);

module.exports = router;
