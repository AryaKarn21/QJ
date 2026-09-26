const mongoose = require("mongoose");

// One row per email send attempt — created before the send is attempted
// (status "queued") and updated to "sent"/"failed" once nodemailer
// resolves/rejects. See utils/sendMail.js, the single choke point every
// outbound email in the app goes through, for where these get written.
//
// `type` is a free-text label (not a hard enum) matching the email's
// purpose — job_alert, interview_scheduled, interview_rescheduled,
// interview_cancelled, assessment_request, assessment_reminder,
// application_accepted, application_rejected, application_confirmation,
// newsletter, otp, password_reset, general — kept as a string rather than
// an enum so a new call site can introduce a new type without a schema
// migration, mirroring how Notification.type historically needed enum
// edits for every new event (see that model's comments on
// subscription_activated for the failure mode a hard enum invites here).
const emailLogSchema = new mongoose.Schema(
  {
    recipientEmail: { type: String, required: true, trim: true, lowercase: true },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, required: true, default: "general", index: true },
    subject: { type: String, required: true },
    textBody: { type: String },
    htmlBody: { type: String },
    relatedJob: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    relatedApplication: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "failed"],
      default: "queued",
      index: true,
    },
    failureReason: { type: String },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

emailLogSchema.index({ recipientEmail: 1, createdAt: -1 });
emailLogSchema.index({ relatedApplication: 1 });
emailLogSchema.index({ relatedJob: 1 });
emailLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("EmailLog", emailLogSchema);
