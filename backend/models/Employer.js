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
  // Company-profile fields for the Company Profile page (section 8).
  // Deliberately NOT duplicating what already exists elsewhere on the
  // schema: "tagline" is the base User.headline field (already a short
  // bio-line, reused for every role); "headquarters"/"LinkedIn URL" are
  // `address`/`socialLinks.linkedin` above; "founded" is `establishedDate`
  // (year is derived from it at render time). Only what's genuinely
  // missing is added here.
  mission: { type: String, trim: true, default: "" },
  culture: { type: String, trim: true, default: "" },
  // Additional office locations beyond the primary `address`.
  companyLocations: [{ type: String, trim: true }],
  // Company-wide perks/benefits shown on the Company Profile page —
  // distinct from a specific job posting's own `benefits` (Job.js), which
  // may differ per role/location.
  companyBenefits: [{ type: String, trim: true }],

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