const mongoose = require("mongoose");
const { COUNTRIES } = require("../data/countries");

// A "Draft" job (Phase 4's employer posting stepper) is allowed to be
// incomplete — an employer stepping through Job Details -> Requirements
// -> Company -> Compensation can save-and-leave at any point without
// having filled in every field yet. Every other status (Pending and
// beyond) keeps the exact same required-field validation as before this
// change: this only ever RELAXES validation, and only while status is
// literally "Draft".
const requiredUnlessDraft = function () {
  return this.status !== "Draft";
};

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: requiredUnlessDraft, trim: true },
    country: {
      type: String,
      trim: true,
      default: "",
    },
    location: { type: String, required: requiredUnlessDraft, trim: true },
    jobtype: {
      type: String,
      required: requiredUnlessDraft,
      trim: true,
    },
    salary: { type: String, required: requiredUnlessDraft, trim: true },
    experience: { type: String, trim: true },

    jobcategory: { type: String, required: requiredUnlessDraft, trim: true },
    level: {
      type: String,
      required: requiredUnlessDraft,
      trim: true,
    },
    deadline: { type: Date, required: requiredUnlessDraft },
    openings: { type: Number, required: requiredUnlessDraft, min: 1, default: 1 },

    // ── LinkedIn/Naukri-style structured fields (all optional/additive) ──
    // `salary`/`experience`/`description` above stay required exactly as
    // before — nothing existing was removed or renamed. These are extra,
    // optional structure the redesigned Job Detail page (and search
    // filters) prefer when present, falling back to the legacy free-text
    // fields when a job doesn't have them (e.g. anything created before
    // this change). employerController.js's createJob/editJob also derive
    // the legacy `salary`/`experience` strings FROM these when provided,
    // so every existing reader of `job.salary`/`job.experience` (dashboard
    // tables, admin panel, etc.) keeps working without modification.
    department: { type: String, trim: true, default: "" },
    workMode: {
      type: String,
      trim: true,
      default: "On-site",
    },
    minExperience: { type: Number, min: 0 },
    maxExperience: { type: Number, min: 0 },
    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    salaryPeriod: {
      type: String,
      enum: ["Hourly", "Daily", "Weekly", "Monthly", "Yearly"],
      default: "Yearly",
    },
    currency: { type: String, trim: true, default: "NPR" },
    // Short "about the job" summary, distinct from the full rich-text
    // `description` below (which stays the primary/required field).
    overview: { type: String, trim: true, default: "" },
    responsibilities: [{ type: String, trim: true }],
    requirements: [{ type: String, trim: true }],
    requiredSkills: [{ type: String, trim: true }],
    preferredSkills: [{ type: String, trim: true }],
    education: { type: String, trim: true, default: "" },
    benefits: [{ type: String, trim: true }],
    perks: [{ type: String, trim: true }],
    workingHours: { type: String, trim: true, default: "" },
    // Company info is auto-attached at read time by populating `employer`
    // (see jobController.js) — never duplicated onto the job by default.
    // This is only populated when an employer explicitly wants THIS
    // specific posting to display different company identity than their
    // profile (e.g. a job for a sub-brand/specific office); leave unset
    // and the frontend/backend fall back to the populated employer.
    companyOverride: {
      name: { type: String, trim: true, default: "" },
      logo: { type: String, trim: true, default: "" },
      tagline: { type: String, trim: true, default: "" },
    },

    istrending: { type: Boolean, default: false },
    // Super-admin trending curation (Trending Jobs management screen) —
    // additive to the existing `istrending` flag, which stays the single
    // source of truth for "is this job trending at all". These only ever
    // matter when istrending is true: trendingOrder controls display order
    // (lower = earlier), trendingStartDate/trendingEndDate let an admin
    // schedule a trending window instead of it being always-on the moment
    // the flag flips. Both dates null means "active immediately, no expiry".
    trendingOrder: { type: Number, default: 0 },
    trendingStartDate: { type: Date, default: null },
    trendingEndDate: { type: Date, default: null },
    status: {
  type: String,
  default: "Pending",
  // "Draft" (Phase 4) is employer-only and never enters the admin review
  // queue — createJob only ever sets it when the employer explicitly
  // saves as a draft; every other status keeps its exact prior meaning.
  enum: ["Draft", "Pending", "Active", "Rejected", "Inactive", "Closed"],
},
rejectionReason: { type: String, trim: true, default: "" },

    description: { type: String, required: requiredUnlessDraft },

    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    jobseekers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    views: [
      {
        ip: { type: String, required: true },
        date: { type: Date, required: true, default: Date.now },
      }
    ],    
  },
  {
    timestamps: true,
  }
);

jobSchema.path("trendingEndDate").validate(function (value) {
  if (!value || !this.trendingStartDate) return true;
  return value > this.trendingStartDate;
}, "trendingEndDate must be after trendingStartDate");

module.exports = mongoose.model("Job", jobSchema);
