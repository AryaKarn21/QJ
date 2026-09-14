const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const handleMessageUpload = require("../middleware/messageUploadMiddleware");
const { getOrCreateConversation, getConversations, getMessages, sendMessage, deleteMessage, logCall } = require("../controllers/messageController");

router.get("/", authenticate, getConversations);
router.get("/with/:userId", authenticate, getOrCreateConversation);
router.get("/:conversationId/messages", authenticate, getMessages);
router.post("/:conversationId/messages", authenticate, handleMessageUpload, sendMessage);
router.post("/:conversationId/messages/call-log", authenticate, logCall);
router.delete("/:conversationId/messages/:messageId", authenticate, deleteMessage);

module.exports = router;
