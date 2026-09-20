const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { followActionLimiter, followReadLimiter } = require("../middleware/rateLimiters");
const profileView = require("../controllers/profileViewController");

// Mounted at /api/community/profile-views — same "community" URL family as
// /api/community/follow and /api/community/connections (see server.js).
// Reuses Follow's rate limiters: recording a view is the same shape of
// write-abuse risk as a follow/connect action, listing viewers the same
// read-abuse risk as any other paginated community list.
router.get("/mine", authenticate, followReadLimiter, profileView.getMyProfileViewers);
router.get("/count", authenticate, followReadLimiter, profileView.getMyProfileViewCount);
router.post("/:userId", authenticate, followActionLimiter, profileView.recordProfileView);

module.exports = router;
