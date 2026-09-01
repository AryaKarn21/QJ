const mongoose = require("mongoose");
const Connection = require("../models/Connection");
const User = require("../models/User");
const sendNotification = require("../utils/sendNotifications");
const { buildAuthorSnapshot } = require("../utils/userDisplay");
const { PUBLIC_PROFILE_SELECT, PUBLIC_PROFILE_FIELDS, attachCurrentCompany, escapeRegex } = require("./followController");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Finds the single Connection document between two users, if any exists,
// regardless of who originally sent the request — the whole reason
// userLow/userHigh exist on the model (see models/Connection.js).
function findPair(userA, userB) {
  const [low, high] = [String(userA), String(userB)].sort();
  return Connection.findOne({ userLow: low, userHigh: high });
}

// ── Send / respond to requests ─────────────────────────────────────────

const sendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return res.status(400).json({ message: "Invalid user id." });
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't connect with yourself." });
    }

    const target = await User.findById(userId).select("role isActive name").lean();
    if (!target) return res.status(404).json({ message: "User not found." });
    if (target.isActive === false) {
      return res.status(403).json({ message: "This account is deactivated and can't be connected with." });
    }

    const existing = await findPair(req.user._id, userId);

    if (existing) {
      if (existing.status === "blocked") {
        const message =
          String(existing.blockedBy) === String(req.user._id)
            ? "You've blocked this person. Unblock them first to send a request."
            : "You can't send a connection request to this person.";
        return res.status(403).json({ message });
      }
      if (existing.status === "accepted") {
        return res.status(409).json({ message: "You're already connected." });
      }
      // status === "pending"
      if (String(existing.requester) === String(req.user._id)) {
        return res.status(409).json({ message: "Connection request already sent." });
      }
      // The other person already sent ME a request — sending one back is
      // the same intent as accepting theirs, so treat it that way instead
      // of leaving the user stuck ("request already pending, but I can't
      // accept from here"). Mirrors how most real connection systems
      // behave when both sides act at once.
      existing.status = "accepted";
      existing.respondedAt = new Date();
      await existing.save();
      sendNotification({
        recipient: existing.requester,
        actor: req.user._id,
        type: "connection_accepted",
        message: `${req.user.name} accepted your connection request.`,
        link: `/community/profile/${req.user._id}`,
      });
      return res.json({ status: "accepted", connectionId: existing._id });
    }

    const connection = await Connection.create({ requester: req.user._id, recipient: userId });

    sendNotification({
      recipient: userId,
      actor: req.user._id,
      type: "connection_request",
      message: `${req.user.name} wants to connect with you.`,
      link: `/community/profile/${req.user._id}`,
    });

    res.status(201).json({ status: "pending", connectionId: connection._id });
  } catch (error) {
    // Unique-index race: two simultaneous requests for the same pair.
    if (error.code === 11000) {
      return res.status(409).json({ message: "A connection already exists with this person." });
    }
    console.error("Error sending connection request:", error);
    res.status(500).json({ message: "Failed to send connection request." });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;
    if (!isValidId(connectionId)) return res.status(400).json({ message: "Invalid connection id." });

    const connection = await Connection.findById(connectionId);
    if (!connection || connection.status !== "pending") {
      return res.status(404).json({ message: "Connection request not found." });
    }
    if (String(connection.recipient) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the recipient can accept this request." });
    }

    connection.status = "accepted";
    connection.respondedAt = new Date();
    await connection.save();

    sendNotification({
      recipient: connection.requester,
      actor: req.user._id,
      type: "connection_accepted",
      message: `${req.user.name} accepted your connection request.`,
      link: `/community/profile/${req.user._id}`,
    });

    res.json({ status: "accepted" });
  } catch (error) {
    console.error("Error accepting connection request:", error);
    res.status(500).json({ message: "Failed to accept connection request." });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;
    if (!isValidId(connectionId)) return res.status(400).json({ message: "Invalid connection id." });

    const connection = await Connection.findById(connectionId);
    if (!connection || connection.status !== "pending") {
      return res.status(404).json({ message: "Connection request not found." });
    }
    if (String(connection.recipient) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the recipient can reject this request." });
    }

    // No lingering "rejected" record — see models/Connection.js. The
    // requester can simply try again later.
    await connection.deleteOne();
    res.json({ message: "Request rejected." });
  } catch (error) {
    console.error("Error rejecting connection request:", error);
    res.status(500).json({ message: "Failed to reject connection request." });
  }
};

const cancelRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;
    if (!isValidId(connectionId)) return res.status(400).json({ message: "Invalid connection id." });

    const connection = await Connection.findById(connectionId);
    if (!connection || connection.status !== "pending") {
      return res.status(404).json({ message: "Connection request not found." });
    }
    if (String(connection.requester) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the requester can cancel this request." });
    }

    await connection.deleteOne();
    res.json({ message: "Request cancelled." });
  } catch (error) {
    console.error("Error cancelling connection request:", error);
    res.status(500).json({ message: "Failed to cancel connection request." });
  }
};

const removeConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;
    if (!isValidId(connectionId)) return res.status(400).json({ message: "Invalid connection id." });

    const connection = await Connection.findById(connectionId);
    if (!connection || connection.status !== "accepted") {
      return res.status(404).json({ message: "Connection not found." });
    }
    const isParty =
      String(connection.requester) === String(req.user._id) ||
      String(connection.recipient) === String(req.user._id);
    if (!isParty) return res.status(403).json({ message: "Access denied." });

    await connection.deleteOne();
    res.json({ message: "Connection removed." });
  } catch (error) {
    console.error("Error removing connection:", error);
    res.status(500).json({ message: "Failed to remove connection." });
  }
};

// ── Block / unblock ─────────────────────────────────────────────────────

const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return res.status(400).json({ message: "Invalid user id." });
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't block yourself." });
    }

    let connection = await findPair(req.user._id, userId);
    if (connection) {
      connection.status = "blocked";
      connection.blockedBy = req.user._id;
      await connection.save();
    } else {
      connection = await Connection.create({
        requester: req.user._id,
        recipient: userId,
        status: "blocked",
        blockedBy: req.user._id,
      });
    }

    res.json({ message: "User blocked." });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: "Failed to block user." });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return res.status(400).json({ message: "Invalid user id." });

    const connection = await findPair(req.user._id, userId);
    if (!connection || connection.status !== "blocked") {
      return res.status(404).json({ message: "No block found." });
    }
    if (String(connection.blockedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the person who blocked can unblock." });
    }

    await connection.deleteOne();
    res.json({ message: "User unblocked." });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ message: "Failed to unblock user." });
  }
};

// ── Status (drives the Connect/Pending/Accept·Reject/Connected button) ──

const getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return res.status(400).json({ message: "Invalid user id." });

    if (String(userId) === String(req.user._id)) {
      return res.json({ status: "SELF", connectionId: null, mutualCount: 0 });
    }

    const connection = await findPair(req.user._id, userId);
    let status = "NONE";
    if (connection) {
      if (connection.status === "accepted") status = "CONNECTED";
      else if (connection.status === "blocked") {
        status = String(connection.blockedBy) === String(req.user._id) ? "BLOCKED_BY_ME" : "BLOCKED_BY_THEM";
      } else if (String(connection.requester) === String(req.user._id)) status = "PENDING_SENT";
      else status = "PENDING_RECEIVED";
    }

    const mutualCount = await countMutualConnections(req.user._id, userId);

    res.json({ status, connectionId: connection?._id || null, mutualCount });
  } catch (error) {
    console.error("Error fetching connection status:", error);
    res.status(500).json({ message: "Failed to fetch connection status." });
  }
};

// ── Lists ────────────────────────────────────────────────────────────────

async function paginateConnections({ match, otherField, page, limit }) {
  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    Connection.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Connection.countDocuments(match),
  ]);

  const otherIds = rows.map((r) => r[otherField]);
  const users = await User.find({ _id: { $in: otherIds } }).select(PUBLIC_PROFILE_SELECT).lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  // connectionId is additive on top of the normal AuthorSnapshot shape —
  // the pending-requests pages need it to call accept/reject/cancel
  // directly on each row without a second lookup per person.
  const rowsWithUser = rows
    .map((r) => ({ user: byId.get(String(r[otherField])), connectionId: String(r._id) }))
    .filter((r) => r.user);

  const snapshots = await attachCurrentCompany(rowsWithUser.map((r) => buildAuthorSnapshot(r.user)));
  const people = snapshots.map((snapshot, i) => ({ ...snapshot, connectionId: rowsWithUser[i].connectionId }));

  return { people, page, totalPages: Math.max(1, Math.ceil(total / limit)), total };
}

// Same $lookup + $facet aggregation shape as followController.js's
// getFollowList — search-by-name has to run against the OTHER user's
// joined document, which a plain Connection.find() can't filter on, so a
// two-step find-then-User.find() (like the old version of this function)
// can't support `q` without loading every connection into memory first.
const getMyConnections = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const myId = req.user._id;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: { status: "accepted", $or: [{ requester: myId }, { recipient: myId }] } },
      // "whichever side of this connection ISN'T me" — Mongo can't
      // express that as a $match field, so it's resolved per-document here.
      { $addFields: { otherId: { $cond: [{ $eq: ["$requester", myId] }, "$recipient", "$requester"] } } },
      { $sort: { respondedAt: -1, createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          let: { uid: "$otherId" },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$uid"] } } }, { $project: PUBLIC_PROFILE_FIELDS }],
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: { "user.isActive": { $ne: false } } },
    ];

    if (q) {
      pipeline.push({ $match: { "user.name": { $regex: escapeRegex(q), $options: "i" } } });
    }

    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }, { $project: { _id: 0, user: 1 } }],
        totalCount: [{ $count: "count" }],
      },
    });

    const [result] = await Connection.aggregate(pipeline);
    const users = (result?.data || []).map((d) => d.user);
    const total = result?.totalCount?.[0]?.count || 0;

    const people = await attachCurrentCompany(users.map(buildAuthorSnapshot));

    res.json({ people, page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (error) {
    console.error("Error fetching connections:", error);
    res.status(500).json({ message: "Failed to fetch connections." });
  }
};

const getPendingReceived = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const result = await paginateConnections({
      match: { recipient: req.user._id, status: "pending" },
      otherField: "requester",
      page,
      limit: 20,
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching pending (received) requests:", error);
    res.status(500).json({ message: "Failed to fetch pending requests." });
  }
};

const getPendingSent = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const result = await paginateConnections({
      match: { requester: req.user._id, status: "pending" },
      otherField: "recipient",
      page,
      limit: 20,
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching pending (sent) requests:", error);
    res.status(500).json({ message: "Failed to fetch sent requests." });
  }
};

// ── Mutual connections + suggestions ─────────────────────────────────────

async function getAcceptedPartnerIds(userId) {
  const rows = await Connection.find({
    status: "accepted",
    $or: [{ requester: userId }, { recipient: userId }],
  })
    .select("requester recipient")
    .lean();
  return rows.map((r) => (String(r.requester) === String(userId) ? String(r.recipient) : String(r.requester)));
}

async function countMutualConnections(userA, userB) {
  const [aIds, bIds] = await Promise.all([getAcceptedPartnerIds(userA), getAcceptedPartnerIds(userB)]);
  const bSet = new Set(bIds);
  return aIds.filter((id) => bSet.has(id)).length;
}

// "People you may know" — ranked by mutual-connection count, same idea as
// the example in the request ("John Doe · 3 mutual connections"). Falls
// back to recently-active users for accounts with no connections yet
// (otherwise a brand-new user would see an empty list forever).
const getSuggestions = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);
    const myId = req.user._id;

    const [myConnections, myPending, myBlocked] = await Promise.all([
      getAcceptedPartnerIds(myId),
      Connection.find({ $or: [{ requester: myId }, { recipient: myId }], status: "pending" })
        .select("requester recipient")
        .lean(),
      Connection.find({ $or: [{ requester: myId }, { recipient: myId }], status: "blocked" })
        .select("requester recipient")
        .lean(),
    ]);

    const excludeIds = new Set([
      String(myId),
      ...myConnections,
      ...myPending.map((r) => String(r.requester) === String(myId) ? String(r.recipient) : String(r.requester)),
      ...myBlocked.map((r) => String(r.requester) === String(myId) ? String(r.recipient) : String(r.requester)),
    ]);

    // Mutual-connection count per candidate — built once here (from data
    // already fetched below) and reused for both ranking and the
    // mutualCount field on the response, instead of a separate query per
    // suggestion.
    const counts = new Map();
    let candidateIds = [];
    if (myConnections.length > 0) {
      // Second-degree network: connections of my connections, ranked by
      // how many of my connections they share.
      const rows = await Connection.find({
        status: "accepted",
        $or: [{ requester: { $in: myConnections } }, { recipient: { $in: myConnections } }],
      })
        .select("requester recipient")
        .lean();
      for (const r of rows) {
        for (const side of [String(r.requester), String(r.recipient)]) {
          if (excludeIds.has(side)) continue;
          counts.set(side, (counts.get(side) || 0) + 1);
        }
      }
      candidateIds = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);
    }

    if (candidateIds.length < limit) {
      // Top up with recently-active accounts (new users, or once the
      // second-degree network is exhausted) rather than showing fewer
      // suggestions than asked for.
      const fillerCount = limit - candidateIds.length;
      const filler = await User.find({
        _id: { $nin: [...excludeIds, ...candidateIds] },
        isActive: { $ne: false },
        role: { $nin: ["admin", "superadmin"] },
      })
        .sort({ createdAt: -1 })
        .limit(fillerCount)
        .select("_id")
        .lean();
      candidateIds = [...candidateIds, ...filler.map((u) => String(u._id))];
    }

    const users = await User.find({ _id: { $in: candidateIds } }).select(PUBLIC_PROFILE_SELECT).lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    const ordered = candidateIds.map((id) => byId.get(id)).filter(Boolean);
    const snapshots = await attachCurrentCompany(ordered.map(buildAuthorSnapshot));

    // `counts` already holds "shares N accepted connections with me" for
    // every candidate that came from the second-degree-network branch
    // above; anyone not in it (i.e. a filler candidate) shares none —
    // no second query needed per suggestion.
    const withMutuals = snapshots.map((s) => ({
      ...s,
      mutualCount: counts.get(String(s._id)) || 0,
    }));

    res.json({ suggestions: withMutuals });
  } catch (error) {
    console.error("Error fetching connection suggestions:", error);
    res.status(500).json({ message: "Failed to fetch suggestions." });
  }
};

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  removeConnection,
  blockUser,
  unblockUser,
  getConnectionStatus,
  getMyConnections,
  getPendingReceived,
  getPendingSent,
  getSuggestions,
  // Exported for unit tests and for future callers that need "are these
  // two users connected" without a full status lookup (e.g. messaging
  // gating, if that's ever added — see PROJECT_AUDIT.md §6).
  countMutualConnections,
};
