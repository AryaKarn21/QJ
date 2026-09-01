const mongoose = require("mongoose");

// Denormalized counter, updated whenever a post is created/deleted, so the
// "Trending" filter is a single sorted find() instead of an aggregation
// over the whole Post collection on every feed load.
const hashtagSchema = new mongoose.Schema(
  {
    tag: { type: String, required: true, unique: true, lowercase: true, trim: true },
    postCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

hashtagSchema.index({ postCount: -1 });

module.exports = mongoose.model("Hashtag", hashtagSchema);
