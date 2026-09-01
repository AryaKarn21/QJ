const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { getOrCreateConversation, getConversations, getMessages, sendMessage } = require("../controllers/messageController");

router.get("/", authenticate, getConversations);
router.get("/with/:userId", authenticate, getOrCreateConversation);
router.get("/:conversationId/messages", authenticate, getMessages);
router.post("/:conversationId/messages", authenticate, sendMessage);

module.exports = router;
