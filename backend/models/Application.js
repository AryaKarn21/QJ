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
      // "Shortlisted" and "Assessment Assigned" are additive — every
      // existing check against "Pending"/"Reviewed"/"Accepted"/"Rejected"/
      // "Interview Scheduled" (controllers, email templates, frontend
      // badges, tests) keeps working unchanged; these two just fill in the
      // fuller APPLIED -> ... -> SELECTED lifecycle around the technical
      // assessment feature.
      enum: [
        "Pending",
        "Reviewed",
        "Shortlisted",
        "Assessment Assigned",
        "Accepted",
        "Rejected",
        "Interview Scheduled",
      ],
      default: "Pending",
    },
    // Append-only log of every status change, oldest first — powers the
    // Application Timeline shown to both the employer and the candidate.
    // Not backfilled for applications that existed before this field: an
    // empty array just means "timeline starts at the current status."
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: { type: String, trim: true, default: "" },
      },
    ],
    // Populated when status is set to "Interview Scheduled". Kept on the
    // Application itself (rather than a separate Interview collection)
    // since an application has at most one active interview at a time —
    // rescheduling just overwrites these fields.
    interview: {
      scheduledAt: { type: Date },
      duration: { type: Number, default: 30 },
      // Canonical 3 values only. Legacy lowercase docs must be migrated by
      // scripts/migrateInterviewModeCasing.js before this enum tightening
      // is deployed.
      mode: {
        type: String,
        enum: ["Video Call", "Phone Call", "In-Person"],
        default: "Video Call",
      },
      // The interview *round/category* — distinct from `mode` above, which
      // is only the communication channel. Optional so old/simple
      // schedules can omit it.
      type: {
        type: String,
        enum: [
          "Technical Interview",
          "HR Interview",
          "Final Interview",
          "Phone Interview",
          "Video Interview",
          "In-person Interview",
        ],
      },
      // Interview lifecycle state — distinct from Application.status
      // (which stays "Interview Scheduled" for as long as any interview is
      // active, regardless of round). CONFIRMED is reserved for a future
      // candidate-confirms-attendance feature; nothing sets it yet.
      status: {
        type: String,
        enum: ["SCHEDULED", "CONFIRMED", "RESCHEDULED", "CANCELLED", "COMPLETED", "NO_SHOW"],
      },
      // IANA zone id, stored per-interview instead of the hardcoded
      // "Asia/Kathmandu" constant previously baked into
      // interviewEmailService.js's formatting helpers.
      timezone: { type: String, default: "Asia/Kathmandu" },
      meetingLink: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
      notes: { type: String, trim: true, default: "" },
      interviewer: { type: String, trim: true, default: "" },
      emailStatus: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending",
      },
      emailSentAt: { type: Date },
      emailError: { type: String, default: "" },
      // Dedup guards for utils/interviewReminderCron.js — reset to
      // undefined on reschedule/cancel so reminders re-arm relative to any
      // new time instead of silently staying suppressed.
      reminder24hSentAt: { type: Date },
      reminder1hSentAt: { type: Date },
    },
    // Populated when a technical assessment is assigned to this
    // application. Same "kept inline, not a separate collection" reasoning
    // as `interview` above — an application has at most one active
    // assessment assignment at a time. The actual questions/answers live in
    // Assessment (the reusable definition) and AssessmentAttempt (one doc
    // per submission, since maxAttempts can be > 1) — this subdocument is
    // just the assignment/access-grant state.
    assessment: {
      assessment: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment" },
      // Secure random token embedded in the emailed assessment link
      // (alongside the applicationId) — see assessmentController.js's
      // access-verification route. `select: false` keeps it out of normal
      // Application queries/API responses by default.
      accessToken: { type: String, select: false },
      assignedAt: { type: Date },
      deadline: { type: Date },
      status: {
        type: String,
        enum: ["assigned", "in_progress", "submitted", "evaluated"],
        default: "assigned",
      },
      attemptsUsed: { type: Number, default: 0 },
      latestScore: { type: Number },
      latestMaxScore: { type: Number },
      latestPassed: { type: Boolean },
      emailStatus: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending",
      },
      emailSentAt: { type: Date },
      emailError: { type: String, default: "" },
      // Dedup guard for the reminder cron — see
      // utils/interviewReminderCron.js (also handles assessment-deadline
      // reminders) — never sends more than one reminder per assignment.
      reminderSentAt: { type: Date },
    },
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, applicant: 1 });
applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ "interview.scheduledAt": 1 });
applicationSchema.index({ "assessment.deadline": 1 });

module.exports = mongoose.model("Application", applicationSchema);