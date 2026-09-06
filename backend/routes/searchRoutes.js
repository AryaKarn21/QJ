const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { followReadLimiter } = require("../middleware/rateLimiters");
const { searchCommunity } = require("../controllers/searchController");

// Mounted at /api/community/search (server.js). Reuses the existing
// follow-system read limiter (followReadLimiter) — this is exactly the
// kind of "cheap individually, easy to script into a directory scrape"
// endpoint that limiter's comment already describes protecting against.
router.get("/", authenticate, followReadLimiter, searchCommunity);

module.exports = router;
