const mongoose = require("mongoose");
const User = require("./User");
const {
  JOBSEEKER_STATUSES,
  JOBSEEKER_DEFAULT_STATUS,
  buildProfileStatusField,
} = require("../utils/profileStatus");

const jobseekerSchema = new mongoose.Schema({
  profilePic: { type: String },
  // QuickJobs' career-status system (the "Open to Work"-equivalent
  // feature, own terminology/UI — see utils/profileStatus.js). No prior
  // status field existed on this schema to extend, per the spec's
  // instruction to inspect first — this is a genuinely new, additive
  // field. See jobseekerController.js's updateJobseekerStatus for the
  // write path and backfillProfileStatus.js for existing-user migration.
  profileStatus: buildProfileStatusField("JOB_SEEKER", JOBSEEKER_STATUSES, JOBSEEKER_DEFAULT_STATUS),
  // Mirrors Employer.js's existing `coverPhoto` field/convention — the
  // Community profile banner was previously a fixed CSS gradient with
  // nowhere to store a real uploaded image.
  coverPhoto: { type: String },
  skills: [String],
  // Doubles as the LinkedIn-style profile's "Education" section — same
  // degree/institution/year shape education needs, so this isn't
  // duplicated as a separate `education[]` array.
  qualifications: [
    {
      degree: String,
      institution: String,
      year: Number
    }
  ],
  experiences: [
    {
      jobPosition: String,
      institution: String,
      duration: String,
      companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      current: { type: Boolean, default: false },
    }
  ],
  // New — genuinely didn't exist before. Same shape convention as
  // Resume.js's ProjectSchema/CertificationSchema for consistency across
  // the app, additive with empty-array defaults so existing jobseeker
  // documents are unaffected.
  projects: [
    {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      link: { type: String, default: "" },
      technologies: { type: String, default: "" },
    }
  ],
  certifications: [
    {
      name: { type: String, default: "" },
      issuer: { type: String, default: "" },
      year: { type: String, default: "" },
    }
  ],
  resume: { type: String },

  savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }]
});

const Jobseeker = User.discriminator("jobseeker", jobseekerSchema);
module.exports = Jobseeker;