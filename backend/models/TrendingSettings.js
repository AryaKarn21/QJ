const mongoose = require("mongoose");

// Singleton, same pattern as HomepageContent.js — a fixed, well-known _id
// instead of a generated ObjectId, so "the trending settings" is always
// exactly one document. Currently just the homepage display cap, kept as
// its own tiny model rather than folded into HomepageContent since it's
// config for dynamic Job data, not CMS copy.
const SINGLETON_ID = "trending-settings";

const trendingSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: SINGLETON_ID },
    maxDisplayCount: { type: Number, default: 8, min: 1, max: 20 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

trendingSettingsSchema.statics.SINGLETON_ID = SINGLETON_ID;

module.exports = mongoose.model("TrendingSettings", trendingSettingsSchema);
