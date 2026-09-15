const express = require("express");
const router = express.Router();
const { authenticate, authorizeSuperAdmin } = require("../middleware/authMiddleware");
const {
  searchEligibleJobs,
  listTrendingJobs,
  addTrendingJob,
  updateTrendingJob,
  removeTrendingJob,
  reorderTrendingJobs,
  getTrendingSettings,
  updateTrendingSettings,
} = require("../controllers/trendingJobsController");

// Super-admin-only trending jobs curation — deliberately a stricter gate
// than the rest of Job Management (authorizeAdmin), matching the sidebar's
// "Platform" tier (Roles & Permissions, Audit Logs, Security). The legacy
// PATCH /api/admin/jobs/:id/trending boolean toggle (authorizeAdmin) is
// untouched and still works for backward compatibility.
router.use(authenticate, authorizeSuperAdmin);

router.get("/eligible", searchEligibleJobs);
router.get("/settings", getTrendingSettings);
router.put("/settings", updateTrendingSettings);
router.get("/", listTrendingJobs);
router.patch("/reorder", reorderTrendingJobs);
router.post("/:jobId", addTrendingJob);
router.patch("/:jobId", updateTrendingJob);
router.delete("/:jobId", removeTrendingJob);

module.exports = router;
