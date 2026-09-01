const mongoose = require("mongoose");

const savedCandidateSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Optional context — which job this candidate was saved from, if any.
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
  },
  { timestamps: true }
);

// One employer can save a given candidate only once — toggling save/unsave
// relies on this being a unique pair.
savedCandidateSchema.index({ employer: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model("SavedCandidate", savedCandidateSchema)