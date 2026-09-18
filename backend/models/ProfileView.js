const mongoose = require("mongoose");

// One document per (viewer, profile) pair — repeat visits update the same
// row (lastViewedAt bumped, viewCount incremented) instead of growing the
// collection unbounded, so "who viewed your profile" stays a short, recent
// list rather than a raw event log.
const profileViewSchema = new mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    viewCount: {
      type: Number,
      default: 1,
    },
    lastViewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

profileViewSchema.index({ viewer: 1, profile: 1 }, { unique: true });
// Powers "who viewed my profile", sorted by most recent.
profileViewSchema.index({ profile: 1, lastViewedAt: -1 });

module.exports = mongoose.model("ProfileView", profileViewSchema);