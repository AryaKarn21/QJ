const mongoose = require("mongoose");

// Admin-managed promotional banners shown on real, public-facing pages
// (currently: the jobseeker homepage and the public job listings page).
// Follows the same simple admin-CRUD shape as JobCategory.js/Plan.js for
// consistency with the rest of the admin panel.
const advertisementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    // Root-relative stored path, e.g. "/uploads/advertisements/uuid.jpg" —
    // same convention as coverPhoto/profilePic elsewhere in this codebase.
    imageUrl: { type: String, required: true },
    // Where a click on the ad should take the visitor. Validated as a
    // same-origin relative path OR an absolute http(s) URL in the
    // controller — never trusted verbatim as arbitrary markup.
    linkUrl: { type: String, required: true, trim: true },
    placement: {
      type: String,
      enum: ["homepage", "jobs_page"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    // Optional scheduling window — an ad with no dates set runs
    // indefinitely (while isActive) rather than requiring an admin to
    // pick dates for something evergreen.
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    // Real counters, incremented by the actual public-facing endpoints
    // below — never seeded or estimated.
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

advertisementSchema.index({ placement: 1, isActive: 1 });

// Whether this ad should currently be shown publicly: active, and (if a
// scheduling window is set) within it. Used by both the public "active
// ads" query and to compute a display-only status for the admin table.
advertisementSchema.methods.isCurrentlyLive = function (now = new Date()) {
  if (!this.isActive) return false;
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
};

module.exports = mongoose.model("Advertisement", advertisementSchema);
