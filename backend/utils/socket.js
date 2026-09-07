const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const { checkMessagePermission } = require("./conversationHelpers");
const { allowedOrigins } = require("../config/corsOrigins");

let ioInstance = null;

function initSocket(httpServer) {
  const { Server } = require("socket.io");

  ioInstance = new Server(httpServer, {
    // Shared with the Express CORS config (see config/corsOrigins.js) so a
    // domain trusted for REST calls (including CORS_ALLOWED_ORIGINS entries
    // and Vercel preview deployments) is trusted for the socket handshake
    // too — these used to be two independently-hardcoded lists that could
    // (and did) drift apart, silently breaking real-time messaging/calls on
    // any origin that wasn't in both places.
    cors: { origin: allowedOrigins, credentials: true },
  });

  // Horizontal scaling: Socket.IO's default adapter only knows about
  // sockets connected to THIS process, so `io.to("user:123").emit(...)`
  // silently misses that user if they're connected to a different
  // instance/replica — real-time notifications and messages would just
  // never arrive for roughly (N-1)/N of requests behind a load balancer
  // with N instances. Opt in by setting REDIS_URL; a single-instance
  // deployment (the common case for this app today) works unchanged with
  // no extra infrastructure. Requires `npm install redis @socket.io/redis-adapter`.
  if (process.env.REDIS_URL) {
    try {
      const { createClient } = require("redis");
      const { createAdapter } = require("@socket.io/redis-adapter");
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      pubClient.on("error", (err) => console.error("Socket.IO Redis (pub) error:", err.message));
      subClient.on("error", (err) => console.error("Socket.IO Redis (sub) error:", err.message));
      Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          ioInstance.adapter(createAdapter(pubClient, subClient));
          console.log("Socket.IO: Redis adapter attached — real-time events now fan out across instances.");
        })
        .catch((err) => console.error("Socket.IO: failed to connect Redis adapter, staying single-instance:", err.message));
    } catch (err) {
      console.warn(
        "Socket.IO: REDIS_URL is set but `redis`/`@socket.io/redis-adapter` aren't installed — " +
          "run `npm install redis @socket.io/redis-adapter`. Falling back to single-instance mode."
      );
    }
  }

  // Verifies the JWT AND (unlike a bare jwt.verify) checks the user still
  // exists and hasn't been deactivated since the token was issued — mirrors
  // authMiddleware.authenticate's REST-side check. Without this, a
  // deactivated account's still-cryptographically-valid token could keep
  // messaging/calling in real time even though every REST endpoint would
  // already be rejecting it with 403.
  ioInstance.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id isActive");
      if (!user) return next(new Error("Account not found"));
      if (user.isActive === false) return next(new Error("This account has been deactivated."));
      socket.userId = String(user._id);
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  ioInstance.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    // ── Messaging ────────────────────────────────────────────────────────────
    socket.on("conversation:join", async (conversationId) => {
      if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) return;
      try {
        // Only an actual participant may join a conversation's room — without
        // this, any authenticated socket could join `conversation:<any id>`
        // by guessing/observing an ObjectId (they appear in URLs throughout
        // the app) and silently receive that conversation's real-time
        // messages and typing events forever, bypassing the REST layer's
        // participant check entirely.
        const isParticipant = await Conversation.exists({
          _id: conversationId,
          participants: socket.userId,
        });
        if (isParticipant) socket.join(`conversation:${conversationId}`);
      } catch (err) {
        console.error("conversation:join error:", err.message);
      }
    });

    socket.on("conversation:leave", (conversationId) => {
      if (conversationId) socket.leave(`conversation:${conversationId}`);
    });

    socket.on("conversation:typing", ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("conversation:typing", {
        conversationId,
        userId: socket.userId,
        isTyping: !!isTyping,
      });
    });

    // Note: read receipts ("conversation:read") are emitted server-side by
    // messageController.getMessages, right where messages are actually
    // marked as read — not client-triggered here — so the event reflects a
    // real, server-verified read rather than a client's unverified claim.

    // ── WebRTC Signaling — Voice & Video Calls ────────────────────────────────
    //
    // Flow:
    //  Caller  → call:offer    → Callee  (sends SDP offer + call type)
    //  Callee  → call:answer   → Caller  (sends SDP answer)
    //  Either  → call:ice      → Other   (exchange ICE candidates)
    //  Either  → call:end      → Other   (hang up)
    //  Callee  → call:reject   → Caller  (decline)
    //
    // `to` is fully client-supplied, so every handler below validates it's a
    // plausible user id before routing anything to it.

    function isValidTarget(to) {
      return typeof to === "string" && mongoose.Types.ObjectId.isValid(to);
    }

    // Caller initiates — sends offer to callee's personal room. Gated by the
    // same connections/blocked-user permission rule text messaging already
    // enforces (checkMessagePermission) — without this, a user who has been
    // blocked (or was never connected) could still ring the other person's
    // phone/browser with an incoming call, even though they can't message them.
    socket.on("call:offer", async ({ to, offer, callType, callerName, callerAvatar }) => {
      if (!isValidTarget(to) || !offer) return;
      try {
        const permission = await checkMessagePermission(socket.userId, to, { conversationExists: true });
        if (!permission.allowed) {
          socket.emit("call:error", { reason: permission.reason || "You can't call this person." });
          return;
        }
      } catch (err) {
        console.error("call:offer permission check failed:", err.message);
        socket.emit("call:error", { reason: "Could not place the call. Please try again." });
        return;
      }
      ioInstance.to(`user:${to}`).emit("call:incoming", {
        from: socket.userId,
        offer,
        callType,      // 'audio' | 'video'
        callerName,
        callerAvatar,
      });
    });

    // Callee accepts — sends answer back to caller
    socket.on("call:answer", ({ to, answer }) => {
      if (!isValidTarget(to) || !answer) return;
      ioInstance.to(`user:${to}`).emit("call:answered", {
        from: socket.userId,
        answer,
      });
    });

    // Either side sends an ICE candidate
    socket.on("call:ice", ({ to, candidate }) => {
      if (!isValidTarget(to) || !candidate) return;
      ioInstance.to(`user:${to}`).emit("call:ice", {
        from: socket.userId,
        candidate,
      });
    });

    // Either side ends the call
    socket.on("call:end", ({ to }) => {
      if (!isValidTarget(to)) return;
      ioInstance.to(`user:${to}`).emit("call:ended", {
        from: socket.userId,
      });
    });

    // Callee rejects the call
    socket.on("call:reject", ({ to }) => {
      if (!isValidTarget(to)) return;
      ioInstance.to(`user:${to}`).emit("call:rejected", {
        from: socket.userId,
      });
    });
  });

  return ioInstance;
}

function getIO() { return ioInstance; }

function emitToUser(userId, event, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

function emitToConversation(conversationId, event, payload) {
  if (!ioInstance || !conversationId) return;
  ioInstance.to(`conversation:${conversationId}`).emit(event, payload);
}

module.exports = { initSocket, getIO, emitToUser, emitToConversation };
