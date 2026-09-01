const mongoose = require("mongoose");

// A lightweight, append-only log of successful share actions. Exists so
// Post.shareCount increments are server-verified (never trusted from the
// client) and idempotent per (post, user, channel) within a cooldown window
// — this is what makes "don't increase the count just because the share
// modal was opened" and "don't double-count rapid repeated clicks" actually
// enforceable, instead of relying on frontend-only debouncing. Deliberately
// a separate small collection rather than an array on Post, so Post
// documents don't grow unbounded with share history.
const shareEventSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    channel: {
      type: String,
      enum: ["feed", "user_dm", "whatsapp", "facebook", "copy_link"],
      required: true,
    },
  },
  { timestamps: true }
);

shareEventSchema.index({ post: 1, user: 1, channel: 1, createdAt: -1 });

module.exports = mongoose.model("ShareEvent", shareEventSchema);
