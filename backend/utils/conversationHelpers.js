const Conversation = require("../models/Conversation");
const Connection = require("../models/Connection");

// Priority 7 decision (see IMPLEMENTATION_STATUS.md's Messaging Review):
// "Connections + existing conversations" — a NEW conversation can only be
// started between accepted connections; an EXISTING conversation is
// always grandfathered in (this rule can never break an ongoing chat),
// but either side blocking the other stops messaging regardless of how
// old the conversation is. Exported separately from
// findOrCreateConversation so sendMessage can re-check it on every send
// (a block should stop future messages in an already-open conversation,
// not just new ones).
async function checkMessagePermission(userAId, userBId, { conversationExists }) {
  const connection = await Connection.findOne({
    $or: [
      { requester: userAId, recipient: userBId },
      { requester: userBId, recipient: userAId },
    ],
  })
    .select("status")
    .lean();

  if (connection?.status === "blocked") {
    return { allowed: false, reason: "You can't message this person." };
  }

  if (conversationExists) return { allowed: true };
  if (connection?.status === "accepted") return { allowed: true };

  return {
    allowed: false,
    reason: "You can only start a conversation with someone you're connected with.",
  };
}

// Finds the existing 1:1 conversation for (userAId, userBId), or creates
// one if the two are allowed to start a new one. Extracted from
// messageController.getOrCreateConversation so the "send post to user"
// share flow (postController.shareToUsers) reuses the exact same
// lookup/creation/permission logic instead of duplicating it — both call
// sites share one implementation. Throws (code: "MESSAGE_NOT_ALLOWED")
// rather than returning null/undefined so a caller can't accidentally
// treat a permission failure as "conversation created" by forgetting to
// check a return value.
async function findOrCreateConversation(userAId, userBId) {
  let conversation = await Conversation.findOne({
    participants: { $all: [userAId, userBId], $size: 2 },
  });

  const permission = await checkMessagePermission(userAId, userBId, {
    conversationExists: !!conversation,
  });
  if (!permission.allowed) {
    const err = new Error(permission.reason);
    err.code = "MESSAGE_NOT_ALLOWED";
    throw err;
  }

  if (!conversation) {
    conversation = await Conversation.create({ participants: [userAId, userBId] });
  }

  return conversation;
}

module.exports = { findOrCreateConversation, checkMessagePermission };
