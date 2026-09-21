const express = require("express");
const router = express.Router();
const { authenticate, authorizeAdmin, authorizeSuperAdmin } = require("../middleware/authMiddleware");
const { getAnalyticsOverview } = require("../controllers/analyticsController");
const {
  createAdmin,
  getAdminProfile,
  getAdminStats,
  verifyEmployer,
  getAllApplicantsForEmployerJobs,
  updateApplication,
  getAllApplications,
  getAllUsers,
  deleteUser,
  updateUserRole,
  updateUserStatus,
  getUserDetailsAdmin,
  getAllJobs,
  createAdminJob,
  editJob,
  deleteJob,
  toggleTrendingStatus,
  getDailyLoggedInUsersCount,
  approveJob,
  rejectJob,
  bulkJobAction,
  updateJobStatus,
  getAllCompanies,
  verifyCompany,
  rejectCompany,
  updateCompanyAdmin,
  toggleCompanySuspendAdmin,
  getAllCommunityPostsAdmin,
  updateCommunityPostStatusAdmin,
  getAllCommunityCommentsAdmin,
  deleteCommunityCommentAdmin,
  getAllBlogsAdmin,
  updateBlogStatusAdmin,
} = require("../controllers/adminController");
const { getFlaggedPosts, moderatePostDecision } = require("../controllers/postController");
const { getAuditLogs, getAuditLogStats } = require("../controllers/auditLogController");
const {
  getSecurityOverview,
  getLockedAccounts,
  unlockAccount,
  getRecentFailedLogins,
} = require("../controllers/securityController");

// Create a new admin account (superadmin only)
router.post("/create-admin", authenticate, authorizeSuperAdmin, createAdmin);

// Get employer profile
router.get("/profile", authenticate, authorizeAdmin, getAdminProfile);

// Get admin stats
router.get("/admin-stats", authenticate, authorizeAdmin, getAdminStats);

// Verify employer (legacy toggle — kept for backward compatibility)
router.patch("/verify-employer/:id", authenticate, authorizeAdmin, verifyEmployer);

// Get all applicants for employer jobs
router.get("/employer/:employerId/applicants", authenticate, authorizeAdmin, getAllApplicantsForEmployerJobs);

// Update application
router.patch("/applications/:applicationId/status", authenticate, authorizeAdmin, updateApplication);

// Platform-wide Application Management (all employers, all jobs)
router.get("/applications", authenticate, authorizeAdmin, getAllApplications);

// Get all users
router.get("/users", authenticate, authorizeAdmin, getAllUsers);
router.patch("/users/:id/status", authenticate, authorizeAdmin, updateUserStatus);
router.get("/users/:id/details", authenticate, authorizeAdmin, getUserDetailsAdmin);

// Delete user
router.delete("/user/:id", authenticate, authorizeAdmin, deleteUser);

// Promote a user to admin / demote an admin back down — superadmin only,
// since granting admin access is more sensitive than routine admin tasks.
router.patch("/users/:id/role", authenticate, authorizeSuperAdmin, updateUserRole);

// Get all jobs
router.get("/jobs", authenticate, authorizeAdmin, getAllJobs);

// Create job as admin
router.post("/jobs", authenticate, authorizeAdmin, createAdminJob);

// Bulk actions on jobs
router.post("/jobs/bulk-action", authenticate, authorizeAdmin, bulkJobAction);

// Edit job
router.put("/job/:id", authenticate, authorizeAdmin, editJob);

// Delete job
router.delete("/job/:id", authenticate, authorizeAdmin, deleteJob);

// Approve / reject a pending job posting
router.patch("/jobs/:id/approve", authenticate, authorizeAdmin, approveJob);
router.patch("/jobs/:id/reject", authenticate, authorizeAdmin, rejectJob);
router.patch("/jobs/:id/status", authenticate, authorizeAdmin, updateJobStatus);

// Update job trending status
router.patch("/jobs/:id/trending", authenticate, authorizeAdmin, toggleTrendingStatus);

// Get daily logged in users
router.get("/daily-logins", authenticate, authorizeAdmin, getDailyLoggedInUsersCount);

// Analytics Hub — combined User/Job/Revenue/Device analytics
router.get("/analytics", authenticate, authorizeAdmin, getAnalyticsOverview);

// Company Management (paginated list + KYC verify/reject + edit + suspend)
router.get("/companies", authenticate, authorizeAdmin, getAllCompanies);
router.put("/companies/:id", authenticate, authorizeAdmin, updateCompanyAdmin);
router.patch("/companies/:id/verify", authenticate, authorizeAdmin, verifyCompany);
router.patch("/companies/:id/reject", authenticate, authorizeAdmin, rejectCompany);
router.patch("/companies/:id/suspend", authenticate, authorizeAdmin, toggleCompanySuspendAdmin);

// Community Feed moderation queue & management
router.get("/community/flagged-posts", authenticate, authorizeAdmin, getFlaggedPosts);
router.patch("/community/posts/:postId/moderate", authenticate, authorizeAdmin, moderatePostDecision);
router.get("/community/posts", authenticate, authorizeAdmin, getAllCommunityPostsAdmin);
router.patch("/community/posts/:id/status", authenticate, authorizeAdmin, updateCommunityPostStatusAdmin);
router.get("/community/comments", authenticate, authorizeAdmin, getAllCommunityCommentsAdmin);
router.delete("/community/comments/:id", authenticate, authorizeAdmin, deleteCommunityCommentAdmin);

// Blog Management
router.get("/blogs", authenticate, authorizeAdmin, getAllBlogsAdmin);
router.patch("/blogs/:id/publish", authenticate, authorizeAdmin, updateBlogStatusAdmin);

// Audit Logs — a record of every mutating action taken across the whole
// platform (see utils/auditLogger.js). Superadmin only, same as
// Roles & Permissions and System Settings.
router.get("/audit-logs", authenticate, authorizeSuperAdmin, getAuditLogs);
router.get("/audit-logs/stats", authenticate, authorizeSuperAdmin, getAuditLogStats);

// Security — locked accounts, recent failed logins, and manual unlock.
// Superadmin only, same rationale as Audit Logs and Roles & Permissions.
router.get("/security/overview", authenticate, authorizeSuperAdmin, getSecurityOverview);
router.get("/security/locked-accounts", authenticate, authorizeSuperAdmin, getLockedAccounts);
router.patch("/security/users/:id/unlock", authenticate, authorizeSuperAdmin, unlockAccount);
router.get("/security/failed-logins", authenticate, authorizeSuperAdmin, getRecentFailedLogins);

module.exports = router;