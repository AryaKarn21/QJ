const express = require("express");
const router = express.Router();
const aiUsageController = require("../controllers/aiUsageController");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");

router.post("/log-resume-build", aiUsageController.logResumeBuild);
router.get("/stats", authenticate, authorizeAdmin, aiUsageController.getAiUsageStats);

module.exports = router;