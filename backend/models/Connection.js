const mongoose = require("mongoose");

// A LinkedIn-style "Connection" — deliberately separate from `Follow`
// (models/Follow.js), which stays exactly as-is. Follow is one-directional
// and instant (no approval needed); Connection requires the other person
// to accept, and once accepted is symmetric (either side can message,
// see "N mutual connections", etc.). Both systems coexist on purpose.
//
// One document per PAIR of users, never two. `requester`/`recipient`
// preserve who sent the original request (needed to tell PENDING_SENT
// apart from PENDING_RECEIVED, and to enforce "only the recipient can
// accept/reject", "only the requester can cancel"). `userLow`/`userHigh`
// are the same two ids sorted into a stable order — same purpose as
// Conversation.participants being stored sorted — so a compound unique
// index can guarantee "at most one Connection between any two users"
// regardless of who requested it, without an $or query to look one up.
//
// Deliberately only 3 states, not 5: a rejected or cancelled request just
// deletes the document (see connectionController.js) instead of persisting
// a "rejected" status forever — so the same two people can always try
// again later without an admin needing to intervene.
const connectionSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userLow: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userHigh: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "blocked"],
      default: "pending",
      required: true,
    },
    // Only set when status === "blocked" — who did the blocking, since
    // blocking can happen unilaterally from either side regardless of
    // prior state. Only this user may unblock.
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

connectionSchema.pre("validate", function (next) {
  if (this.requester && this.recipient) {
    const [low, high] = [String(this.requester), String(this.recipient)].sort();
    this.userLow = low;
    this.userHigh = high;
  }
  next();
});

// The uniqueness guarantee this whole model relies on: two documents for
// the same pair can never both be inserted, no matter who requests whom.
connectionSchema.index({ userLow: 1, userHigh: 1 }, { unique: true });
// "My pending received requests" / "my pending sent requests"
connectionSchema.index({ recipient: 1, status: 1, createdAt: -1 });
connectionSchema.index({ requester: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Connection", connectionSchema);
