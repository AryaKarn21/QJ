const express = require("express");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");
const { otpRequestLimiter } = require("../middleware/rateLimiters");
const {
  createTicket,
  getMyTickets,
  getAllTickets,
  replyToTicket,
  updateTicketStatus,
} = require("../controllers/supportController");

// Public — works for guests and logged-in users alike.
// Reuses the OTP-request rate limiter's shape (5 per 15 min) to prevent
// support-form spam without needing a dedicated limiter.
router.post("/tickets", otpRequestLimiter, createTicket);

// Logged-in user's own ticket history
router.get("/my-tickets", authenticate, getMyTickets);

// Admin management
router.get("/admin/tickets", authenticate, authorizeAdmin, getAllTickets);
router.patch("/admin/tickets/:id/reply", authenticate, authorizeAdmin, replyToTicket);
router.patch("/admin/tickets/:id/status", authenticate, authorizeAdmin, updateTicketStatus);

module.exports = router;