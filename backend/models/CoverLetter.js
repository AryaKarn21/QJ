const mongoose = require("mongoose");

// Saved/reusable cover letters — separate from `Application.coverLetter`
// (which stays a plain String, the final text actually submitted with one
// application) so a jobseeker can draft, save, and reuse letters across
// multiple applications without them being tied to a single Application
// document. Mirrors Resume.js's ownership shape (`user` ref, per-user
// list) rather than inventing a new pattern.
const coverLetterSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, trim: true, default: "Untitled Cover Letter" },
    // Rendered HTML from the react-quill editor (see CoverLetterEditor.tsx)
    // — kept as the source of truth for re-editing; a plain-text version is
    // derived at submit time for Application.coverLetter (a String field).
    content: { type: String, default: "" },
    templateId: { type: String, default: "professional" },
    // Set when this letter was drafted for a specific application, so
    // "reuse a previous cover letter" can show which job it was for. Not
    // required — a letter can also be created generically and reused as-is.
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
    // At most one default per user, enforced in the controller (not a
    // unique index, since "at most one true" isn't expressible as a plain
    // Mongo unique index without a partial-filter — simpler to enforce in
    // application code the same way single-primary-record patterns
    // elsewhere in this codebase already do).
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

coverLetterSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("CoverLetter", coverLetterSchema);
