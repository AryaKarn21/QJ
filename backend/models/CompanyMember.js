const mongoose = require("mongoose");

const companyMemberSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Employer is a discriminator on User
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    designation: { type: String, trim: true, default: "" },
    department:  { type: String, trim: true, default: "" },
    joinedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

// Prevent the same user from being added to the same company twice
companyMemberSchema.index({ company: 1, user: 1 }, { unique: true });

// Fast lookup: all active/inactive members of a company
companyMemberSchema.index({ company: 1, status: 1 });

const CompanyMember = mongoose.model("CompanyMember", companyMemberSchema);
module.exports = CompanyMember;