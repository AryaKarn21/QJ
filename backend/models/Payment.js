const mongoose = require("mongoose");

// Transaction-level record of a single gateway payment attempt.
const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NPR" },
    gateway: {
      type: String,
      enum: ["esewa", "khalti"],
      required: true,
    },
    referenceId: { type: String, required: true, unique: true },
    gatewayTransactionId: { type: String, default: null },
    status: {
      type: String,
      enum: ["initiated", "success", "failed", "refunded"],
      default: "initiated",
    },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);