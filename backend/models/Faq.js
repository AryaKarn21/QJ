const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    // Which audience this FAQ is most relevant to — lets the public FAQ
    // page group/filter without needing a separate category collection.
    audience: {
      type: String,
      enum: ["all", "jobseeker", "employer"],
      default: "all",
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

faqSchema.index({ order: 1 });

module.exports = mongoose.model("Faq", faqSchema);