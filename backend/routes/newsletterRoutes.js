const express = require("express");
const router = express.Router();
const { otpRequestLimiter } = require("../middleware/rateLimiters");
const { subscribe } = require("../controllers/newsletterController");

// Public — footer newsletter signup form. Reuses the OTP-request rate
// limiter's shape (5 per 15 min) to prevent spam, same as /api/support/tickets.
router.post("/subscribe", otpRequestLimiter, subscribe);

module.exports = router;
