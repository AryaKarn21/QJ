const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const communityUpload = require("../middleware/communityUploadMiddleware");
const {
  createPost,
  getFeed,
  getCompanyFeed,
  getUserProfileFeed,
  getPostsByHashtag,
  getTrendingHashtags,
  getPostById,
  updatePost,
  deletePost,
  toggleLikePost,
  toggleBookmarkPost,
  getMyBookmarks,
  sharePost,
  shareToUsers,
  trackExternalShare,
  votePoll,
} = require("../controllers/postController");

// A light "attach user if a valid token is present, but don't reject if
// not" gate — the Home/Company/Hashtag feeds are publicly browsable, but
// showing "did I like this" requires knowing who's asking. Kept local to
// this router since no other module needs optional auth.
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
  try {
    const jwt = require("jsonwebtoken");
    const User = require("../models/User");
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
  } catch {
    // Invalid/expired token on a public route — proceed as anonymous
    // rather than rejecting the request.
  }
  next();
};

// --- Feeds (publicly browsable, personalized when logged in) ---
router.get("/feed", optionalAuthenticate, getFeed);
router.get("/feed/company/:companyId", optionalAuthenticate, getCompanyFeed);
router.get("/feed/user/:userId", optionalAuthenticate, getUserProfileFeed);
router.get("/hashtags/trending", getTrendingHashtags);
router.get("/hashtags/:tag", optionalAuthenticate, getPostsByHashtag);
router.get("/bookmarks", authenticate, getMyBookmarks);
router.get("/:postId", optionalAuthenticate, getPostById);

// --- Write actions (require auth) ---
router.post("/", authenticate, communityUpload, createPost);
router.patch("/:postId", authenticate, updatePost);
router.delete("/:postId", authenticate, deletePost);
router.post("/:postId/like", authenticate, toggleLikePost);
router.post("/:postId/bookmark", authenticate, toggleBookmarkPost);
router.post("/:postId/share", authenticate, sharePost);
router.post("/:postId/share/to-users", authenticate, shareToUsers);
router.post("/:postId/share/track", authenticate, trackExternalShare);
router.post("/:postId/vote", authenticate, votePoll);

module.exports = router;
