const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["user", "job", "post", "comment", "blog"],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    // The author/owner/entity being reported
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    adminAction: {
      type: String,
      enum: ["none", "removed_content", "suspended_user", "warned_user", "dismissed"],
      default: "none",
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

reportSchema.index({ targetType: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
