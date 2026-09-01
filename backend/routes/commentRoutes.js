const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { getComments, getReplies, addComment, toggleLikeComment, deleteComment } = require("../controllers/commentController");

// Same lightweight optional-auth pattern as postRoutes.js — reading
// comments is public, but "did I like this comment" needs the viewer.
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
  try {
    const jwt = require("jsonwebtoken");
    const User = require("../models/User");
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
  } catch {
    // proceed as anonymous
  }
  next();
};

router.get("/post/:postId", optionalAuthenticate, getComments);
router.get("/:commentId/replies", optionalAuthenticate, getReplies);
router.post("/post/:postId", authenticate, addComment);
router.post("/:commentId/like", authenticate, toggleLikeComment);
router.delete("/:commentId", authenticate, deleteComment);

module.exports = router;
