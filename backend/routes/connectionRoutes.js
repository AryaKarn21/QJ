const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { followActionLimiter, followReadLimiter } = require("../middleware/rateLimiters");
const connection = require("../controllers/connectionController");

// Mounted at /api/community/connections — same URL family as the existing
// /api/community/follow (see server.js), rather than a bare /connections
// prefix, so both relationship systems live under one consistent
// "community" namespace. Reuses the Follow system's rate limiters instead
// of defining near-duplicate ones: connection actions and follow actions
// are the same shape of abuse risk (scripted request/accept/block loops).
router.get("/", authenticate, followReadLimiter, connection.getMyConnections);
router.get("/pending", authenticate, followReadLimiter, connection.getPendingReceived);
router.get("/sent", authenticate, followReadLimiter, connection.getPendingSent);
router.get("/suggestions", authenticate, followReadLimiter, connection.getSuggestions);
router.get("/:userId/status", authenticate, followReadLimiter, connection.getConnectionStatus);

router.post("/request/:userId", authenticate, followActionLimiter, connection.sendRequest);
router.post("/:connectionId/accept", authenticate, followActionLimiter, connection.acceptRequest);
router.post("/:connectionId/reject", authenticate, followActionLimiter, connection.rejectRequest);
router.delete("/:connectionId/cancel", authenticate, followActionLimiter, connection.cancelRequest);
router.delete("/:connectionId", authenticate, followActionLimiter, connection.removeConnection);
router.post("/:userId/block", authenticate, followActionLimiter, connection.blockUser);
router.delete("/:userId/block", authenticate, followActionLimiter, connection.unblockUser);

module.exports = router;
