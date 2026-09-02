const express = require("express");
const router = express.Router();
const testimonialUpload = require("../middleware/testimonialUploadMiddleware");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");
const {
  adminListTestimonials,
  adminGetTestimonialById,
  adminCreateTestimonial,
  adminUpdateTestimonial,
  adminToggleTestimonial,
  adminDeleteTestimonial,
  getActiveTestimonials,
} = require("../controllers/testimonialController");

// --- Public (no auth) — published testimonials only, never draft/inactive ---
router.get("/active", getActiveTestimonials);

// --- Admin/superadmin only ---
router.get("/admin", authenticate, authorizeAdmin, adminListTestimonials);
router.post("/admin", authenticate, authorizeAdmin, testimonialUpload, adminCreateTestimonial);
router.get("/admin/:id", authenticate, authorizeAdmin, adminGetTestimonialById);
router.put("/admin/:id", authenticate, authorizeAdmin, testimonialUpload, adminUpdateTestimonial);
router.patch("/admin/:id/toggle", authenticate, authorizeAdmin, adminToggleTestimonial);
router.delete("/admin/:id", authenticate, authorizeAdmin, adminDeleteTestimonial);

module.exports = router;
