const jwt = require("jsonwebtoken");

let ioInstance = null;

function initSocket(httpServer) {
  const { Server } = require("socket.io");

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
  ].filter(Boolean);

  ioInstance = new Server(httpServer, {
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

  ioInstance.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  ioInstance.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    // ── Messaging ────────────────────────────────────────────────────────────
    socket.on("conversation:join", (conversationId) => {
      if (conversationId) socket.join(`conversation:${conversationId}`);
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

    // ── WebRTC Signaling — Voice & Video Calls ────────────────────────────────
    //
    // Flow:
    //  Caller  → call:offer    → Callee  (sends SDP offer + call type)
    //  Callee  → call:answer   → Caller  (sends SDP answer)
    //  Either  → call:ice      → Other   (exchange ICE candidates)
    //  Either  → call:end      → Other   (hang up)
    //  Callee  → call:reject   → Caller  (decline)

    // Caller initiates — sends offer to callee's personal room
    socket.on("call:offer", ({ to, offer, callType, callerName, callerAvatar }) => {
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
      ioInstance.to(`user:${to}`).emit("call:answered", {
        from: socket.userId,
        answer,
      });
    });

    // Either side sends an ICE candidate
    socket.on("call:ice", ({ to, candidate }) => {
      ioInstance.to(`user:${to}`).emit("call:ice", {
        from: socket.userId,
        candidate,
      });
    });

    // Either side ends the call
    socket.on("call:end", ({ to }) => {
      ioInstance.to(`user:${to}`).emit("call:ended", {
        from: socket.userId,
      });
    });

    // Callee rejects the call
    socket.on("call:reject", ({ to }) => {
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