const express = require("express");
const router = express.Router();
const { authenticate, authenticateOptional } = require("../middleware/authMiddleware");
const handleBlogImageUpload = require("../middleware/blogUploadMiddleware");
const {
  generateBlogContent,
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  toggleLikeBlog,
  addComment,
  getBlogComments,
  updateComment,
  deleteComment,
  toggleCommentLike,
  getUserBlogs,
  getBlogCategories,
  uploadBlogImage,
} = require("../controllers/blogController");

// Public routes (no authentication required)
router.get("/", getAllBlogs);
router.get("/categories", getBlogCategories);
// Optional auth: anonymous visitors and other users only see published
// posts; the author (or an admin) can also load their own draft — see
// getBlogById's isOwner/isPrivileged check.
router.get("/:id", authenticateOptional, getBlogById);
// Optional auth too — an anonymous visitor can read comments, but knowing
// who's asking lets getBlogComments mark which comments *they* liked.
router.get("/:id/comments", authenticateOptional, getBlogComments);

// Protected routes (authentication required)
router.post("/upload-image", authenticate, handleBlogImageUpload, uploadBlogImage);
router.post("/generate-content", authenticate, generateBlogContent);
router.post("/", authenticate, createBlog);
router.get("/user/my-blogs", authenticate, getUserBlogs);
router.put("/:id", authenticate, updateBlog);
router.delete("/:id", authenticate, deleteBlog);
router.post("/:id/like", authenticate, toggleLikeBlog);
router.post("/:id/comment", authenticate, addComment);
router.patch("/:id/comment/:commentId", authenticate, updateComment);
router.delete("/:id/comment/:commentId", authenticate, deleteComment);
router.post("/:id/comment/:commentId/like", authenticate, toggleCommentLike);

module.exports = router;
