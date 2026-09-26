const mongoose = require("mongoose");

// One answer to one question in a given attempt. `selectedOptionIndexes`
// is used for mcq/multiple_select (auto-graded); `textAnswer` for short/
// long answer and coding; `fileUrl` for file_submission. Manually-graded
// question types carry `pointsAwarded`/`gradedBy` once the employer
// reviews them (see AssessmentAttempt.status: "submitted" until every
// manually-graded question has pointsAwarded set, then "evaluated").
const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOptionIndexes: [{ type: Number }],
    textAnswer: { type: String, trim: true, default: "" },
    fileUrl: { type: String, trim: true, default: "" },
    pointsAwarded: { type: Number },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const assessmentAttemptSchema = new mongoose.Schema(
  {
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attemptNumber: { type: Number, required: true, default: 1 },
    answers: [answerSchema],
    status: {
      type: String,
      // in_progress: candidate has started but not submitted.
      // submitted: candidate submitted; auto-graded score is final for
      //   mcq/multiple_select-only assessments, but any coding/short/long/
      //   file_submission question still needs a human to set
      //   pointsAwarded before this attempt counts as fully evaluated.
      // evaluated: every question has a final score — score/passed final.
      enum: ["in_progress", "submitted", "evaluated"],
      default: "in_progress",
    },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    passed: { type: Boolean },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    timeTakenSeconds: { type: Number },
    // True once every question in this attempt was scorable without a
    // human (i.e. the assessment had only mcq/multiple_select questions) —
    // false means an employer must review before `evaluated`/`passed` are
    // meaningful.
    autoEvaluated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

assessmentAttemptSchema.index({ application: 1, assessment: 1, attemptNumber: 1 }, { unique: true });
assessmentAttemptSchema.index({ candidate: 1, createdAt: -1 });
assessmentAttemptSchema.index({ assessment: 1, status: 1 });

module.exports = mongoose.model("AssessmentAttempt", assessmentAttemptSchema);
