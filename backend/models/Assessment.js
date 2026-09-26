const mongoose = require("mongoose");

// One question, embedded — an assessment's questions are never queried or
// reused independently of their assessment, so (like Application.interview
// elsewhere in this codebase) there's no separate top-level collection for
// them. `correctAnswers`/`points` are grading data that must never reach a
// candidate — see assessmentController.js's getAssessmentForCandidate,
// which strips these fields before responding.
const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["mcq", "multiple_select", "coding", "short_answer", "long_answer", "file_submission"],
      required: true,
    },
    questionText: { type: String, required: true, trim: true },
    // Used by mcq/multiple_select only.
    options: [{ type: String, trim: true }],
    // Grading key — index(es) into `options` for mcq/multiple_select.
    // Never sent to the candidate-facing endpoint.
    correctOptionIndexes: [{ type: Number }],
    // For coding questions, an optional starter snippet/language hint —
    // this app does not execute code, so coding/short/long/file answers are
    // always manually graded by the employer (see AssessmentAttempt.status).
    codingLanguage: { type: String, trim: true, default: "" },
    points: { type: Number, default: 1, min: 0 },
  },
  { _id: true }
);

const assessmentSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    instructions: { type: String, trim: true, default: "" },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "An assessment needs at least one question.",
      },
    },
    // Minutes the candidate has once they start (not the same as the
    // calendar-day deadline for starting it at all).
    duration: { type: Number, required: true, min: 1 },
    startDate: { type: Date },
    // Default deadline for any assignment created from this definition —
    // an individual assignment (Application.assessment.deadline) can
    // override this per candidate.
    deadline: { type: Date, required: true },
    passingScore: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

assessmentSchema.index({ job: 1 });
assessmentSchema.index({ employer: 1, createdAt: -1 });

// Sum of every question's points — the denominator for a percentage score.
assessmentSchema.methods.getMaxScore = function () {
  return this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
};

module.exports = mongoose.model("Assessment", assessmentSchema);
