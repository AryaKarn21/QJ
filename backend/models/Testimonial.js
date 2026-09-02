const mongoose = require("mongoose");

// Admin-managed testimonials shown on the jobseeker homepage. Follows the
// same simple admin-CRUD shape as Advertisement.js/Plan.js for consistency
// with the rest of the admin panel — an admin curates real quotes (from
// users, surveys, reviews, etc.) and publishes the ones that should go
// live; nothing here is generated or seeded.
const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // The person's role/title, e.g. "Software Engineer" — shown under
    // their name. Optional since not every quote has one on hand.
    role: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    quote: { type: String, required: true, trim: true, maxlength: 600 },
    // Root-relative stored path, e.g. "/uploads/testimonials/uuid.jpg" —
    // same convention as Advertisement.imageUrl. Optional: falls back to
    // an initials avatar on the frontend when unset.
    avatarUrl: { type: String, default: "" },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

testimonialSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Testimonial", testimonialSchema);
