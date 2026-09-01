const mongoose = require("mongoose");

// Polymorphic like: one document per (user, target). A unique compound
// index prevents double-liking and lets "has this user liked X" be a
// single indexed lookup instead of scanning an array on Post/Comment.
const likeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["Post", "Comment"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "targetType" },
    reaction: {
      type: String,
      enum: ["like", "celebrate", "support", "insightful"],
      default: "like",
    },
  },
  { timestamps: true }
);

likeSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
likeSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model("Like", likeSchema);
