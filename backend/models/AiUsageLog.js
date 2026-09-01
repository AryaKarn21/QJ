const mongoose = require("mongoose");

const aiUsageLogSchema = new mongoose.Schema(
  {
    feature: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    templateId: {
      type: String,
      default: "unknown",
    },
    templateName: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AiUsageLog", aiUsageLogSchema);