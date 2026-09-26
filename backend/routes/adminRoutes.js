const express = require("express");
const router = express.Router();
const {
  authenticate,
  authorizeAdmin,
  authorizeSuperAdmin,
  requirePermission,
} = require("../middleware/authMiddleware");
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
  getCommunityPostDetailAdmin,
  updateCommunityPostStatusAdmin,
  getAllCommunityCommentsAdmin,
  deleteCommunityCommentAdmin,
  getAllBlogsAdmin,
  updateBlogStatusAdmin,
} = require("../controllers/adminController");
const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  getMyPermissions,
  assignUserRole,
} = require("../controllers/roleController");
const { getFlaggedPosts, moderatePostDecision } = require("../controllers/postController");
const { getAuditLogs, getAuditLogStats } = require("../controllers/auditLogController");
const {
  getSecurityOverview,
  getLockedAccounts,
  unlockAccount,
  getRecentFailedLogins,
} = require("../controllers/securityController");
const { getEmailLogs, getEmailLogById, retryEmailLog, sendTestEmail } = require("../controllers/emailLogController");
const { getNotificationSettings, updateNotificationSettings } = require("../controllers/notificationSettingsController");

// --- RBAC & Permissions Management ---
router.get("/permissions", authenticate, requirePermission("roles.view", "permissions.manage"), getPermissions);
router.get("/my-permissions", authenticate, getMyPermissions);
router.get("/roles", authenticate, requirePermission("roles.view"), getRoles);
router.get("/roles/:id", authenticate, requirePermission("roles.view"), getRoleById);
router.post("/roles", authenticate, requirePermission("roles.create"), createRole);
router.put("/roles/:id", authenticate, requirePermission("roles.edit"), updateRole);
router.delete("/roles/:id", authenticate, requirePermission("roles.delete"), deleteRole);
router.post("/users/:id/assign-role", authenticate, requirePermission("roles.edit", "permissions.manage"), assignUserRole);

// Create a new admin account (superadmin only)
router.post("/create-admin", authenticate, authorizeSuperAdmin, createAdmin);

// Get admin/employer profile & stats
router.get("/profile", authenticate, authorizeAdmin, getAdminProfile);
router.get("/admin-stats", authenticate, requirePermission("dashboard.view"), getAdminStats);

// Verify employer (legacy toggle)
router.patch("/verify-employer/:id", authenticate, requirePermission("users.edit"), verifyEmployer);

// Get all applicants for employer jobs
router.get("/employer/:employerId/applicants", authenticate, requirePermission("applications.view"), getAllApplicantsForEmployerJobs);

// Application Management
router.get("/applications", authenticate, requirePermission("applications.view"), getAllApplications);
router.patch("/applications/:applicationId/status", authenticate, requirePermission("applications.manage", "applications.update_status"), updateApplication);

// User Management
router.get("/users", authenticate, requirePermission("users.view"), getAllUsers);
router.patch("/users/:id/status", authenticate, requirePermission("users.edit"), updateUserStatus);
router.get("/users/:id/details", authenticate, requirePermission("users.view"), getUserDetailsAdmin);
router.delete("/user/:id", authenticate, requirePermission("users.delete"), deleteUser);
router.patch("/users/:id/role", authenticate, requirePermission("roles.edit", "permissions.manage"), updateUserRole);

// Job Management
router.get("/jobs", authenticate, requirePermission("jobs.view"), getAllJobs);
router.post("/jobs", authenticate, requirePermission("jobs.create"), createAdminJob);
router.post("/jobs/bulk-action", authenticate, requirePermission("jobs.edit", "jobs.moderate"), bulkJobAction);
router.put("/job/:id", authenticate, requirePermission("jobs.edit"), editJob);
router.delete("/job/:id", authenticate, requirePermission("jobs.delete"), deleteJob);
router.patch("/jobs/:id/approve", authenticate, requirePermission("jobs.moderate", "jobs.publish"), approveJob);
router.patch("/jobs/:id/reject", authenticate, requirePermission("jobs.moderate"), rejectJob);
router.patch("/jobs/:id/status", authenticate, requirePermission("jobs.edit", "jobs.publish"), updateJobStatus);
router.patch("/jobs/:id/trending", authenticate, requirePermission("jobs.edit"), toggleTrendingStatus);
router.get("/daily-logins", authenticate, requirePermission("analytics.view", "dashboard.view"), getDailyLoggedInUsersCount);

// Analytics Hub
router.get("/analytics", authenticate, requirePermission("analytics.view"), getAnalyticsOverview);

// Company Management
router.get("/companies", authenticate, requirePermission("users.view"), getAllCompanies);
router.put("/companies/:id", authenticate, requirePermission("users.edit"), updateCompanyAdmin);
router.patch("/companies/:id/verify", authenticate, requirePermission("users.edit"), verifyCompany);
router.patch("/companies/:id/reject", authenticate, requirePermission("users.edit"), rejectCompany);
router.patch("/companies/:id/suspend", authenticate, requirePermission("users.edit"), toggleCompanySuspendAdmin);

// Community Feed moderation queue & management
router.get("/community/flagged-posts", authenticate, requirePermission("community.manage_reports", "community.moderate"), getFlaggedPosts);
router.patch("/community/posts/:postId/moderate", authenticate, requirePermission("community.moderate"), moderatePostDecision);
router.get("/community/posts", authenticate, requirePermission("community.view"), getAllCommunityPostsAdmin);
router.get("/community/posts/:id", authenticate, requirePermission("community.view"), getCommunityPostDetailAdmin);
router.patch("/community/posts/:id/status", authenticate, requirePermission("community.moderate", "community.edit"), updateCommunityPostStatusAdmin);
router.get("/community/comments", authenticate, requirePermission("community.view"), getAllCommunityCommentsAdmin);
router.delete("/community/comments/:id", authenticate, requirePermission("community.moderate", "community.delete"), deleteCommunityCommentAdmin);

// Blog Management
router.get("/blogs", authenticate, requirePermission("blogs.view"), getAllBlogsAdmin);
router.patch("/blogs/:id/publish", authenticate, requirePermission("blogs.publish", "blogs.moderate"), updateBlogStatusAdmin);

// Audit Logs
router.get("/audit-logs", authenticate, requirePermission("audit_logs.view"), getAuditLogs);
router.get("/audit-logs/stats", authenticate, requirePermission("audit_logs.view"), getAuditLogStats);

// Security
router.get("/security/overview", authenticate, requirePermission("security.view"), getSecurityOverview);
router.get("/security/locked-accounts", authenticate, requirePermission("security.view", "security.manage"), getLockedAccounts);
router.patch("/security/users/:id/unlock", authenticate, requirePermission("security.manage"), unlockAccount);
router.get("/security/failed-logins", authenticate, requirePermission("security.view"), getRecentFailedLogins);

// Email delivery logs & retry
router.get("/email-logs", authenticate, requirePermission("email.view"), getEmailLogs);
router.get("/email-logs/:id", authenticate, requirePermission("email.view"), getEmailLogById);
router.post("/email-logs/:id/retry", authenticate, requirePermission("email.retry", "email.manage"), retryEmailLog);
router.post("/email-logs/test-email", authenticate, requirePermission("email.manage"), sendTestEmail);

// Notification Settings
router.get("/notification-settings", authenticate, requirePermission("notifications.view", "settings.view"), getNotificationSettings);
router.patch("/notification-settings", authenticate, requirePermission("notifications.manage", "settings.manage"), updateNotificationSettings);

module.exports = router;