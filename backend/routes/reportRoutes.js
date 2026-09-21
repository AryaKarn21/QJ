const express = require("express");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");
const {
  createReport,
  getAllReports,
  getReportStats,
  resolveReportAction,
} = require("../controllers/reportController");

// User submit report
router.post("/", authenticate, createReport);

// Admin moderation
router.get("/", authenticate, authorizeAdmin, getAllReports);
router.get("/stats", authenticate, authorizeAdmin, getReportStats);
router.patch("/:id/action", authenticate, authorizeAdmin, resolveReportAction);

module.exports = router;
