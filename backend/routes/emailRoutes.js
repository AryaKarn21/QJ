const express = require("express");
const router = express.Router();
const { authenticate, requirePermission } = require("../middleware/authMiddleware");
const { testEmail } = require("../controllers/emailTestController");

// POST /api/email/test — admin/superadmin only (same "email.manage"
// permission the existing /api/admin/email-logs/test-email endpoint uses).
// Verifies the Resend integration end-to-end before it's wired into any
// real workflow. Never returns success unless Resend actually accepted
// the request — see controllers/emailTestController.js.
router.post("/test", authenticate, requirePermission("email.manage"), testEmail);

module.exports = router;
