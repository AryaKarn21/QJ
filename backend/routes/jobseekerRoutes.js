const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const userUpload = require("../middleware/userUploadMiddleware");
const {
  getJobseekerProfile,
  updateJobseekerProfile,
  getAppliedJobs,
  getDashboardStats,
  updateJobseekerStatus,
} = require("../controllers/jobseekerController");
const {
  getMyMemberships,
  getMyMembershipAtCompany,
  getUserCompanies,
} = require("../controllers/companyMemberController");

// Get jobseeker profile
router.get("/profile", authenticate, getJobseekerProfile);

// Update jobseeker profile
router.put("/profile", authenticate, userUpload, updateJobseekerProfile);

// Update career status ("Open to Opportunities" etc.) — a focused JSON
// endpoint separate from the multipart full-profile PUT above; see
// jobseekerController.js's updateJobseekerStatus for why. No `/profile/:id`
// param route exists on this router, so there's no ordering hazard here.
router.put("/profile/status", authenticate, updateJobseekerStatus);

// Get applied jobs
router.get("/applied-jobs", authenticate, getAppliedJobs);

// Get dashboard stats
router.get("/dashboard-stats", authenticate, getDashboardStats);

// Get the logged-in user's memberships across ALL companies
// A single account can belong to multiple companies simultaneously
router.get("/company-memberships", authenticate, getMyMemberships);

// Get the logged-in user's membership at a specific company
router.get("/company-memberships/:companyId", authenticate, getMyMembershipAtCompany);

module.exports = router;