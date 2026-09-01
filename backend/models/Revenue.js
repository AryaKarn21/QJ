const mongoose = require("mongoose");

const revenueSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currency: { type: String, default: "$" },
    paidFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    remarks: { type: String },
  },
  {
    timestamps: true,
  }
);

revenueSchema.pre("save", async function (next) {
  const User = mongoose.model("User");
  const user = await User.findById(this.paidBy);
  if (!user || user.role !== "employer") {
    return next(new Error("Only employers can make a payment"));
  }
  next();
});

module.exports = mongoose.model("Revenue", revenueSchema);
