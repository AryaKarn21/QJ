const express = require("express");
const router = express.Router();
const { otpRequestLimiter } = require("../middleware/rateLimiters");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");
const {
  subscribe,
  unsubscribe,
  getNewsletterStats,
  broadcastNewsletter,
} = require("../controllers/newsletterController");

// Public — footer newsletter signup form. Reuses the OTP-request rate
// limiter's shape (5 per 15 min) to prevent spam, same as /api/support/tickets.
router.post("/subscribe", otpRequestLimiter, subscribe);

// Public — the one-click unsubscribe link every newsletter/job-alert email
// carries. No auth: identity is proven by the signed token in the link
// itself, not a session (the recipient is reading this from their inbox).
router.get("/unsubscribe", unsubscribe);

// Admin — CMS Newsletter tab.
router.get("/stats", authenticate, authorizeAdmin, getNewsletterStats);
router.post("/broadcast", authenticate, authorizeAdmin, broadcastNewsletter);

module.exports = router;
