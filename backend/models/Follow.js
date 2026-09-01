const mongoose = require("mongoose");

// Both "follow a person" and "follow a company" are the same shape — a
// company is just a User with role "employer", so `following` always
// points at a User document and `followingType` is kept only for fast,
// readable querying (and in case Company ever becomes its own collection).
const followSchema = new mongoose.Schema(
  {
    follower: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    following: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    followingType: { type: String, enum: ["user", "company"], default: "user" },
  },
  { timestamps: true }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });
// Powers "list of followers of X" / "who X follows" pagination sorted by
// most-recently-followed-first without an in-memory sort — the compound
// index lets Mongo satisfy $match + $sort straight off the index.
followSchema.index({ following: 1, createdAt: -1 });
followSchema.index({ follower: 1, createdAt: -1 });

module.exports = mongoose.model("Follow", followSchema);
