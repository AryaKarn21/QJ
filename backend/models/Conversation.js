const mongoose = require("mongoose");

// 1:1 direct messages only (no group chat) — matches what the feature
// request needs ("messaging" alongside profiles/companies) without taking
// on group-chat admin/membership complexity. `participants` is always
// exactly two users, stored sorted so a (userA, userB) pair can be looked
// up with a single indexed query regardless of who initiated it.
const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    lastMessageAt: { type: Date, default: Date.now },
    // Per-user unread counters, keyed by user id string, e.g. { "<id>": 3 }.
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
