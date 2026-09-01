const mongoose = require("mongoose");

// Admin-managed subscription plan catalog. Kept deliberately separate from
// `Revenue` (a manual admin ledger tied to boosting a single job's
// `istrending` flag) — Plan/Subscription/Payment model recurring billing,
// a different concept with its own lifecycle. Follows the same simple
// admin-CRUD shape as JobCategory.js for consistency.
const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["employer", "jobseeker", "both"],
      required: true,
    },
    description: { type: String, trim: true, default: "" },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NPR" },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    features: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

planSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model("Plan", planSchema);