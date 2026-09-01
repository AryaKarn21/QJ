const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    howDidYouHear: {
      type: String,
      trim: true,
    },
    coverLetter: {
      type: String, 
      required: true,
    },
    resume: {
      type: String, 
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Reviewed", "Accepted", "Rejected", "Interview Scheduled"],
      default: "Pending",
    },
    // Populated when status is set to "Interview Scheduled". Kept on the
    // Application itself (rather than a separate Interview collection)
    // since an application has at most one active interview at a time —
    // rescheduling just overwrites these fields.
    interview: {
      scheduledAt: { type: Date },
      mode: { type: String, enum: ["Video Call", "Phone Call", "In-Person"], default: "Video Call" },
      meetingLink: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
      notes: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);