const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const sendNotification = require("../utils/sendNotifications");
const { emitToConversation } = require("../utils/socket");
const { buildAuthorSnapshot } = require("../utils/userDisplay");
const { findOrCreateConversation, checkMessagePermission } = require("../utils/conversationHelpers");

function parsePagination(req) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

// Finds the existing 1:1 conversation for (me, otherUser) or creates one.
// Kept as its own endpoint (rather than folding into sendMessage) so the
// UI can open a chat window against a person before the first message is
// actually sent.
const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id." });
    }
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't message yourself." });
    }

    const otherUser = await User.findById(userId).lean();
    if (!otherUser) return res.status(404).json({ message: "User not found." });

    const conversation = await findOrCreateConversation(req.user._id, userId);

    res.json({
      conversation: {
        _id: conversation._id,
        otherUser: buildAuthorSnapshot(otherUser),
        lastMessageAt: conversation.lastMessageAt,
      },
    });
  } catch (error) {
    if (error.code === "MESSAGE_NOT_ALLOWED") {
      return res.status(403).json({ message: error.message });
    }
    console.error("Error opening conversation:", error);
    res.status(500).json({ message: "Failed to open conversation." });
  }
};

const getConversations = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);

    const conversations = await Conversation.find({ participants: req.user._id })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "lastMessage" })
      .lean();

    const otherUserIds = conversations.map(
      (c) => c.participants.find((p) => String(p) !== String(req.user._id)) || c.participants[0]
    );
    const otherUsers = await User.find({ _id: { $in: otherUserIds } }).lean();
    const userMap = new Map(otherUsers.map((u) => [String(u._id), u]));

    const result = conversations.map((c) => {
      const otherId = c.participants.find((p) => String(p) !== String(req.user._id)) || c.participants[0];
      return {
        _id: c._id,
        otherUser: buildAuthorSnapshot(userMap.get(String(otherId))),
        lastMessage: c.lastMessage
          ? { text: c.lastMessage.text, sender: c.lastMessage.sender, createdAt: c.lastMessage.createdAt }
          : null,
        lastMessageAt: c.lastMessageAt,
        unreadCount: (c.unreadCounts && c.unreadCounts[String(req.user._id)]) || 0,
      };
    });

    res.json({ conversations: result, page, limit, hasMore: conversations.length === limit });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to load conversations." });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const { page, limit, skip } = parsePagination(req);
    const messages = await Message.find({ conversation: conversationId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Mark everything the viewer hasn't read yet as read, and zero their
    // unread counter for this conversation.
    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    conversation.unreadCounts.set(String(req.user._id), 0);
    await conversation.save();

    res.json({ messages: messages.reverse(), page, limit, hasMore: messages.length === limit });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to load messages." });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    // Re-checked on every send, not just when the conversation was first
    // opened — a block placed mid-conversation must stop further messages
    // immediately, even though the conversation itself (and its history)
    // stays intact for both participants.
    const otherParticipant = conversation.participants.find((p) => String(p) !== String(req.user._id));
    const permission = await checkMessagePermission(req.user._id, otherParticipant, { conversationExists: true });
    if (!permission.allowed) {
      return res.status(403).json({ message: permission.reason });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text: text.trim(),
      readBy: [req.user._id],
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    const recipientId = conversation.participants.find((p) => String(p) !== String(req.user._id));
    const currentUnread = conversation.unreadCounts.get(String(recipientId)) || 0;
    conversation.unreadCounts.set(String(recipientId), currentUnread + 1);
    await conversation.save();

    emitToConversation(conversationId, "message:new", {
      _id: message._id,
      conversation: conversationId,
      sender: req.user._id,
      text: message.text,
      createdAt: message.createdAt,
    });

    sendNotification({
      recipient: recipientId,
      actor: req.user._id,
      type: "new_message",
      message: `${req.user.name} sent you a message.`,
      relatedConversation: conversation._id,
      link: `/messages/${conversation._id}`,
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message." });
  }
};

module.exports = { getOrCreateConversation, getConversations, getMessages, sendMessage };
