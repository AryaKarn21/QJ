const mongoose = require("mongoose");
const User = require("./User");
const {
  EMPLOYER_STATUSES,
  EMPLOYER_DEFAULT_STATUS,
  buildProfileStatusField,
} = require("../utils/profileStatus");

const employerSchema = new mongoose.Schema({
  companyLogo: { type: String },
  coverPhoto: { type: String },   // ← ADD
  // QuickJobs' hiring-status system (the "Hiring"-equivalent feature, own
  // terminology/UI — see utils/profileStatus.js and Jobseeker.js's mirror
  // of this same field for the job-seeker side).
  profileStatus: buildProfileStatusField("EMPLOYER", EMPLOYER_STATUSES, EMPLOYER_DEFAULT_STATUS),
  website: { type: String },
  panNumber: { type: String },
  establishedDate: { type: Date },
  industryType: { type: String },
  companySize: { type: String },
  address: { type: String },
  telephone: { type: String },
  description: { type: String },

  // KYC / company-verification workflow (admin-facing).
  // `isVerified` on the base User schema stays as the simple true/false
  // flag the rest of the app already reads (e.g. employer Profile page) —
  // these two fields add the richer Pending/Verified/Rejected state and
  // a note explaining a rejection, without touching that existing flag's
  // meaning. verificationStatus is kept in sync with isVerified whenever
  // an admin acts on it.
  verificationStatus: {
    type: String,
    enum: ["Pending", "Verified", "Rejected"],
    default: "Pending",
  },
  verificationNote: { type: String, trim: true, default: "" },
});



const Employer = User.discriminator("employer", employerSchema);
module.exports = Employer;