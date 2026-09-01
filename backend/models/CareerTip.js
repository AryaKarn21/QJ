const mongoose = require("mongoose");

const careerTipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    // Loosely groups tips (e.g. "Resume", "Interview", "Career Growth") for
    // the public page to organize by, without needing a full taxonomy.
    category: { type: String, trim: true, default: "General" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

careerTipSchema.index({ order: 1 });

module.exports = mongoose.model("CareerTip", careerTipSchema);