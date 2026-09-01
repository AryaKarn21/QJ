// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate, authorizeEmployer, authorizeAdmin, authorizeSuperAdmin } = require("../middleware/authMiddleware");
const {
  getJobseekerNotifications,
  getEmployerNotifications,
  getAdminNotifications,
  generalAnnouncement,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require("../controllers/notificationController");


router.get("/jobseeker",authenticate, getJobseekerNotifications);
router.get("/employer",authenticate, authorizeEmployer, getEmployerNotifications);
router.get("/admin",authenticate, authorizeAdmin, getAdminNotifications);

// Role-agnostic notification feed used by the Community module's
// notification bell — works for any role, including recruiter/mentor,
// without needing a new per-role endpoint each time a role is added.
router.get("/me", authenticate, getMyNotifications);
router.patch("/:id/read", authenticate, markNotificationRead);
router.patch("/read-all", authenticate, markAllNotificationsRead);
router.delete("/:id", authenticate, deleteNotification);


// Platform-wide broadcast to all/jobseekers/employers — high blast
// radius, so (matching the admin sidebar's own "System Settings is
// superadmin-only" grouping) this is superadmin, not just admin.
// Previously any admin could hit this, which didn't match that intent.
router.post("/announcement", authenticate, authorizeSuperAdmin, generalAnnouncement);

module.exports = router;