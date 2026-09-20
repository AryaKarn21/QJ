const mongoose = require("mongoose");
const ProfileView = require("../models/ProfileView");
const Connection = require("../models/Connection");
const User = require("../models/User");
const sendNotification = require("../utils/sendNotifications");
const { buildAuthorSnapshot } = require("../utils/userDisplay");
const { PUBLIC_PROFILE_SELECT, attachCurrentCompany } = require("./followController");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

async function isBlockedPair(userA, userB) {
  const [low, high] = [String(userA), String(userB)].sort();
  const connection = await Connection.findOne({ userLow: low, userHigh: high, status: "blocked" })
    .select("_id")
    .lean();
  return Boolean(connection);
}

// POST /api/community/profile-views/:userId — records that the
// authenticated user viewed :userId's profile. `viewer` always comes from
// the authenticated session, never the request body, so this can't be used
// to fabricate a view "by" someone else. One document per (viewer, profile)
// pair (see models/ProfileView.js) — a repeat visit bumps viewCount/
// lastViewedAt on the same row instead of growing an unbounded event log,
// and only the FIRST-ever view notifies the profile owner so re-browsing
// back to someone's profile doesn't re-notify them every time.
const recordProfileView = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return res.status(400).json({ message: "Invalid user id." });
    const viewerId = req.user._id;

    if (String(viewerId) === String(userId)) {
      return res.json({ recorded: false });
    }

    if (await isBlockedPair(viewerId, userId)) {
      return res.json({ recorded: false });
    }

    const existing = await ProfileView.findOne({ viewer: viewerId, profile: userId });
    if (existing) {
      existing.viewCount += 1;
      existing.lastViewedAt = new Date();
      await existing.save();
      return res.json({ recorded: true, firstView: false });
    }

    await ProfileView.create({ viewer: viewerId, profile: userId });

    sendNotification({
      recipient: userId,
      actor: viewerId,
      type: "profile_view",
      message: "Someone viewed your profile.",
      link: "/community/profile-views",
    });

    res.json({ recorded: true, firstView: true });
  } catch (error) {
    if (error.code === 11000) {
      // Race: two concurrent first-views for the same pair — harmless,
      // the unique (viewer, profile) index means exactly one doc won.
      return res.json({ recorded: true, firstView: false });
    }
    console.error("Error recording profile view:", error);
    res.status(500).json({ message: "Failed to record profile view." });
  }
};

// GET /api/community/profile-views/mine — paginated "who viewed my
// profile", most recent first. Always scoped to the authenticated caller
// (`req.user._id`) — there is no way to fetch another user's viewer list.
const getMyProfileViewers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const skip = (page - 1) * limit;
    const myId = req.user._id;

    const [rows, total] = await Promise.all([
      ProfileView.find({ profile: myId }).sort({ lastViewedAt: -1 }).skip(skip).limit(limit).lean(),
      ProfileView.countDocuments({ profile: myId }),
    ]);

    const viewerIds = rows.map((r) => r.viewer);
    const users = await User.find({ _id: { $in: viewerIds } }).select(PUBLIC_PROFILE_SELECT).lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));

    // Same "silently drop rows whose user no longer exists" behavior as
    // connectionController.js's paginateConnections — a deleted viewer
    // account just disappears from the list rather than erroring.
    const rowsWithUser = rows
      .map((r) => ({ user: byId.get(String(r.viewer)), lastViewedAt: r.lastViewedAt, viewCount: r.viewCount }))
      .filter((r) => r.user);

    const snapshots = await attachCurrentCompany(rowsWithUser.map((r) => buildAuthorSnapshot(r.user)));
    const viewers = snapshots.map((snapshot, i) => ({
      ...snapshot,
      lastViewedAt: rowsWithUser[i].lastViewedAt,
      viewCount: rowsWithUser[i].viewCount,
    }));

    res.json({ viewers, page, totalPages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (error) {
    console.error("Error fetching profile viewers:", error);
    res.status(500).json({ message: "Failed to fetch profile viewers." });
  }
};

// GET /api/community/profile-views/count — lightweight total for a stat
// pill (e.g. next to "Connections" on the profile page) without paging
// through the full list.
const getMyProfileViewCount = async (req, res) => {
  try {
    const total = await ProfileView.countDocuments({ profile: req.user._id });
    res.json({ total });
  } catch (error) {
    console.error("Error fetching profile view count:", error);
    res.status(500).json({ message: "Failed to fetch profile view count." });
  }
};

module.exports = { recordProfileView, getMyProfileViewers, getMyProfileViewCount };
