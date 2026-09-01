const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // A reply is a comment with `parentComment` set. One level of nesting
    // is enforced in the controller (replies-to-replies are flattened
    // under the top-level comment) — matches how LinkedIn/most feeds do it
    // and keeps the UI from needing infinite recursive rendering.
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
    likeCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    moderation: {
      status: { type: String, enum: ["approved", "pending", "flagged", "removed"], default: "approved" },
      flags: [{ type: String }],
    },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
