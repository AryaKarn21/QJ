const express = require("express");
const router = express.Router();
const handleIconUpload = require("../middleware/iconUploadMiddleware");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");
const {
  adminListBlogCategories,
  adminCreateBlogCategory,
  adminUpdateBlogCategory,
  adminDeleteBlogCategory,
  getActiveBlogCategories,
  getBlogCategoryBySlug,
} = require("../controllers/blogCategoryController");

// --- Public (no auth) — active categories only, real blog counts ---
router.get("/active", getActiveBlogCategories);
router.get("/slug/:slug", getBlogCategoryBySlug);

// --- Admin/superadmin only ---
router.get("/admin", authenticate, authorizeAdmin, adminListBlogCategories);
router.post("/admin", authenticate, authorizeAdmin, handleIconUpload, adminCreateBlogCategory);
router.put("/admin/:id", authenticate, authorizeAdmin, handleIconUpload, adminUpdateBlogCategory);
router.delete("/admin/:id", authenticate, authorizeAdmin, adminDeleteBlogCategory);

module.exports = router;
