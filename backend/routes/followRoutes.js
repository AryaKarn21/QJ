const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { followActionLimiter, followReadLimiter } = require("../middleware/rateLimiters");
const {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowCounts,
  getSuggestions,
  searchMentionableUsers,
  getShareRecipients,
  getPublicProfile,
} = require("../controllers/followController");

const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
  try {
    const jwt = require("jsonwebtoken");
    const User = require("../models/User");
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    // Ignore a token whose account was deactivated after it was issued —
    // same rule authMiddleware.authenticate enforces on protected routes.
    // These routes stay reachable (they're public/optional-auth), just
    // anonymized, so a deactivated account can't use a stale token to
    // keep querying `isFollowing`/personalized results.
    if (user && user.isActive !== false) req.user = user;
  } catch {
    // proceed as anonymous
  }
  next();
};

router.get("/suggestions", authenticate, followReadLimiter, getSuggestions);
router.get("/search", authenticate, followReadLimiter, searchMentionableUsers);
router.get("/share-recipients", authenticate, followReadLimiter, getShareRecipients);
router.get("/:userId/followers", optionalAuthenticate, followReadLimiter, getFollowers);
router.get("/:userId/following", optionalAuthenticate, followReadLimiter, getFollowing);
router.get("/:userId/counts", optionalAuthenticate, getFollowCounts);
router.get("/:userId/profile", optionalAuthenticate, getPublicProfile);
router.post("/:userId/toggle", authenticate, followActionLimiter, toggleFollow);

module.exports = router;
