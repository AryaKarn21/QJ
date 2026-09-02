const mongoose = require("mongoose");
const Follow = require("../models/Follow");
const User = require("../models/User");
const Post = require("../models/Post");
const Jobseeker = require("../models/Jobseeker");
const Employer = require("../models/Employer");
const CompanyMember = require("../models/CompanyMember");
const Conversation = require("../models/Conversation");
const Connection = require("../models/Connection");
const sendNotification = require("../utils/sendNotifications");
const { buildAuthorSnapshot } = require("../utils/userDisplay");

// Gates a jobseeker/employer's career-status per its own `visibility`
// setting before it's ever attached to a public-profile response — the
// profile owner always sees their own (needed since this same endpoint
// backs "view your own profile" in ProfileFeed.tsx), a "private" status
// is never shown to anyone else, and a "network"-visibility status is
// only shown to an accepted Connection (models/Connection.js — the
// mutual, LinkedIn-style relationship, not the one-way Follow). Mirrors
// connectionController.js's own `findPair` query shape; duplicated here
// (rather than imported) to avoid a require cycle with that controller,
// which already imports several PUBLIC_PROFILE_* helpers from this file.
async function getVisibleProfileStatus(profileStatus, ownerId, viewerId) {
  if (!profileStatus) return null;
  if (viewerId && String(viewerId) === String(ownerId)) return profileStatus;

  const visibility = profileStatus.visibility || "public";
  if (visibility === "private") return null;
  if (visibility === "public") return profileStatus;

  // visibility === "network"
  if (!viewerId) return null;
  const [low, high] = [String(ownerId), String(viewerId)].sort();
  const connection = await Connection.findOne({ userLow: low, userHigh: high, status: "accepted" })
    .select("_id")
    .lean();
  return connection ? profileStatus : null;
}

// Every place in this file that reads a User document for anything other
// than the requesting user's own record MUST go through this projection.
// It is the allowlist of fields buildAuthorSnapshot ever surfaces — never
// widen it to a blocklist (e.g. "-password"), because a blocklist quietly
// leaks any new sensitive field (email, otpCode, failedLoginAttempts,
// lastLoginIP, ...) added to User.js in the future. Applying it at the
// query/aggregation level (not just when shaping the JSON response) also
// means Mongo never even sends those fields over the wire to this process.
const PUBLIC_PROFILE_FIELDS = {
  name: 1,
  role: 1,
  profilePic: 1,
  companyLogo: 1,
  headline: 1,
  bio: 1,
  socialLinks: 1,
  isVerified: 1,
  isActive: 1,
  createdAt: 1,
  // Employer "About" fields
  industryType: 1,
  description: 1,
  website: 1,
  companySize: 1,
  address: 1,
  establishedDate: 1,
  coverPhoto: 1,
  mission: 1,
  culture: 1,
  companyLocations: 1,
  companyBenefits: 1,
  // Recruiter/mentor headline-building fields
  designation: 1,
  companyName: 1,
  currentRole: 1,
  currentCompany: 1,
};
const PUBLIC_PROFILE_SELECT = Object.keys(PUBLIC_PROFILE_FIELDS).join(" ");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const isDuplicateKeyError = (err) => err && err.code === 11000;

// True when the connected MongoDB deployment can't run multi-document
// transactions (a standalone `mongod`, common in local dev — Atlas and
// any real replica set/sharded cluster support them). Detected lazily
// from the actual error rather than guessed from config up front, and
// cached so we only pay for the failed attempt once per process.
const isTransactionsUnsupportedError = (err) => {
  const msg = String(err && err.message);
  return (
    msg.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
    msg.includes("Transactions are not supported") ||
    msg.includes("This MongoDB deployment does not support retryable writes")
  );
};
let transactionsSupported = true;

// Applies (or reverts) a follow relationship AND keeps the denormalized
// User.followersCount/followingCount counters in lockstep with it, so
// profile headers can read a count in O(1) instead of a
// `Follow.countDocuments` collection scan on every page view. Prefers a
// real transaction (atomic: either both the Follow doc and both counters
// change, or neither does) and transparently falls back to sequential
// writes for deployments without transaction support — correct in the
// common case, "eventually correct via scripts/backfillFollowCounts.js"
// in the rare lost-race case on those deployments.
async function applyFollowToggle(followerId, followingId, followingType) {
  if (transactionsSupported) {
    const session = await mongoose.startSession();
    try {
      let following;
      await session.withTransaction(async () => {
        const existing = await Follow.findOne({ follower: followerId, following: followingId }).session(session);
        if (existing) {
          await Follow.deleteOne({ _id: existing._id }).session(session);
          await User.updateOne({ _id: followingId }, { $inc: { followersCount: -1 } }).session(session);
          await User.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } }).session(session);
          following = false;
        } else {
          await Follow.create([{ follower: followerId, following: followingId, followingType }], { session });
          await User.updateOne({ _id: followingId }, { $inc: { followersCount: 1 } }).session(session);
          await User.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } }).session(session);
          following = true;
        }
      });
      return { following };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        // Lost a race with a concurrent identical request (e.g. a
        // double-click that both fired before the first response came
        // back). The other request already made this "following: true" —
        // that's a success from the client's point of view, not an error.
        return { following: true };
      }
      if (isTransactionsUnsupportedError(err)) {
        transactionsSupported = false;
        // fall through to the non-transactional path below
      } else {
        throw err;
      }
    } finally {
      await session.endSession();
    }
  }

  // Non-transactional fallback (standalone MongoDB only).
  const existing = await Follow.findOne({ follower: followerId, following: followingId });
  if (existing) {
    await Follow.deleteOne({ _id: existing._id });
    await User.updateOne({ _id: followingId }, { $inc: { followersCount: -1 } });
    await User.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } });
    return { following: false };
  }
  try {
    await Follow.create({ follower: followerId, following: followingId, followingType });
  } catch (err) {
    if (isDuplicateKeyError(err)) return { following: true };
    throw err;
  }
  await User.updateOne({ _id: followingId }, { $inc: { followersCount: 1 } });
  await User.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } });
  return { following: true };
}

const toggleFollow = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) {
      return res.status(400).json({ message: "Invalid user id." });
    }
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't follow yourself." });
    }

    const target = await User.findById(userId).select("role isActive name").lean();
    if (!target) return res.status(404).json({ message: "User not found." });
    // A deactivated account shouldn't gain new followers (and shouldn't
    // receive a "new follower" notification/email while deactivated).
    // Existing follow relationships involving it are left alone — this
    // only blocks NEW follows, it doesn't retroactively unfollow anyone.
    if (target.isActive === false) {
      return res.status(403).json({ message: "This account is deactivated and can't be followed." });
    }

    const followingType = target.role === "employer" ? "company" : "user";
    const result = await applyFollowToggle(req.user._id, userId, followingType);

    if (result.following) {
      sendNotification({
        recipient: userId,
        actor: req.user._id,
        type: "new_follower",
        message: `${req.user.name} started following you.`,
        link: `/community/profile/${req.user._id}`,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Error toggling follow:", error);
    res.status(500).json({ message: "Failed to update follow status." });
  }
};

// buildAuthorSnapshot only ever sets `company` for an employer account
// (its own name) — it has no way to look up what company a jobseeker/
// recruiter/mentor currently works at without turning every single call
// site (post cards, comment authors, mention search, ...) into an N+1
// query. List endpoints that specifically want "current company" shown
// per person (followers/following/suggestions — see the request's
// PersonCard fields) batch it in here instead: one query for the whole
// page, not one per row.
async function attachCurrentCompany(people) {
  const candidateIds = people.filter((p) => p.role !== "employer").map((p) => p._id);
  if (candidateIds.length === 0) return people;

  const memberships = await CompanyMember.find({ user: { $in: candidateIds }, status: "Active" })
    .populate({ path: "company", select: "name" })
    .select("user company")
    .lean();
  // Keyed by user id -> { name, id } — `company` (the name) was already consumed
  // as a plain string by every existing caller, so it stays a string for
  // backward compatibility; `companyId` is new and additive, letting the
  // frontend link "at NLCS" to the real company profile instead of
  // rendering unlinked text (it had no id to link to before this).
  const companyByUser = new Map(
    memberships.filter((m) => m.company?.name).map((m) => [String(m.user), { name: m.company.name, id: String(m.company._id) }])
  );

  return people.map((p) => {
    const match = companyByUser.get(String(p._id));
    return match ? { ...p, company: match.name, companyId: match.id } : p;
  });
}

// Shared by getFollowers/getFollowing — both need the same shape of work
// (paginate the Follow edge collection for one side of the relationship,
// join in the other user, optionally filter by name, mark mutuals for the
// viewer) with only the match/join field flipped. Paginates AT THE
// DATABASE LEVEL via $skip/$limit inside the aggregation (backed by the
// {following:1,createdAt:-1} / {follower:1,createdAt:-1} indexes), unlike
// a "load every follow doc's id into memory, then paginate the id array"
// approach, which stops scaling once an account has more than a few
// thousand followers.
async function getFollowList({ userId, viewerId, page, limit, q, matchField }) {
  const joinField = matchField === "following" ? "follower" : "following";
  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: { [matchField]: new mongoose.Types.ObjectId(userId) } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        let: { uid: `$${joinField}` },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
          { $project: PUBLIC_PROFILE_FIELDS },
        ],
        as: "user",
      },
    },
    { $unwind: "$user" },
    // Deactivated accounts are hidden from these lists entirely (same
    // rule as search/suggestions) rather than shown greyed-out — they're
    // not followable/messageable anyway, so surfacing them just invites
    // dead-end clicks.
    { $match: { "user.isActive": { $ne: false } } },
  ];

  if (q && q.trim()) {
    pipeline.push({ $match: { "user.name": { $regex: escapeRegex(q.trim()), $options: "i" } } });
  }

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }, { $project: { _id: 0, user: 1 } }],
      totalCount: [{ $count: "count" }],
    },
  });

  const [result] = await Follow.aggregate(pipeline);
  const users = (result?.data || []).map((d) => d.user);
  const total = result?.totalCount?.[0]?.count || 0;

  let viewerFollowingSet = new Set();
  if (viewerId && users.length) {
    const viewerFollows = await Follow.find({ follower: viewerId, following: { $in: users.map((u) => u._id) } })
      .select("following")
      .lean();
    viewerFollowingSet = new Set(viewerFollows.map((f) => String(f.following)));
  }

  const people = await attachCurrentCompany(
    users.map((u) => ({
      ...buildAuthorSnapshot(u),
      isFollowing: viewerFollowingSet.has(String(u._id)),
    }))
  );

  return {
    people,
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  return { page, limit };
};

const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return res.status(400).json({ message: "Invalid user id." });

    const { page, limit } = parsePagination(req);
    const q = (req.query.q || "").trim();

    const result = await getFollowList({
      userId,
      viewerId: req.user?._id,
      page,
      limit,
      q,
      matchField: "following",
    });

    res.json({ followers: result.people, page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages });
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ message: "Failed to load followers." });
  }
};

const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return res.status(400).json({ message: "Invalid user id." });

    const { page, limit } = parsePagination(req);
    const q = (req.query.q || "").trim();

    const result = await getFollowList({
      userId,
      viewerId: req.user?._id,
      page,
      limit,
      q,
      matchField: "follower",
    });

    res.json({ following: result.people, page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages });
  } catch (error) {
    console.error("Error fetching following list:", error);
    res.status(500).json({ message: "Failed to load following list." });
  }
};

const getFollowCounts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return res.status(400).json({ message: "Invalid user id." });

    const user = await User.findById(userId).select("followersCount followingCount").lean();
    if (!user) return res.status(404).json({ message: "User not found." });

    let isFollowing = false;
    if (req.user) {
      isFollowing = !!(await Follow.exists({ follower: req.user._id, following: userId }));
    }

    res.json({
      followers: user.followersCount || 0,
      following: user.followingCount || 0,
      isFollowing,
    });
  } catch (error) {
    console.error("Error fetching follow counts:", error);
    res.status(500).json({ message: "Failed to load follow counts." });
  }
};

// "Who to follow" suggestions for the community sidebar: active posters
// the viewer doesn't already follow, weighted toward companies (employers)
// and mentors since those are the highest-value follows on a careers feed.
// Simple and fast rather than a real recommendation model — good enough
// for a cold-start feed with no collaborative-filtering data yet.
const getSuggestions = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);
    const viewerId = req.user._id;

    const alreadyFollowing = await Follow.find({ follower: viewerId }).select("following").lean();
    const excludeIds = [viewerId, ...alreadyFollowing.map((f) => f.following)];

    const recentPosterIds = await Post.aggregate([
      { $match: { isDeleted: false, author: { $nin: excludeIds } } },
      { $group: { _id: "$author", postCount: { $sum: 1 }, lastPostAt: { $max: "$createdAt" } } },
      { $sort: { postCount: -1, lastPostAt: -1 } },
      { $limit: limit * 2 },
    ]);

    const users = await User.find({
      _id: { $in: recentPosterIds.map((p) => p._id) },
      isActive: { $ne: false },
    })
      .select(PUBLIC_PROFILE_SELECT)
      .lean();
    const priority = { employer: 0, mentor: 1, recruiter: 2, jobseeker: 3, admin: 4, superadmin: 4 };
    const sorted = await attachCurrentCompany(
      users
        .sort((a, b) => (priority[a.role] ?? 5) - (priority[b.role] ?? 5))
        .slice(0, limit)
        .map(buildAuthorSnapshot)
    );

    res.json({ suggestions: sorted });
  } catch (error) {
    console.error("Error fetching follow suggestions:", error);
    res.status(500).json({ message: "Failed to load suggestions." });
  }
};

// "Who to @mention" search-as-you-type for the post/comment composer.
// Deliberately separate from getSuggestions (which is for the "who to
// follow" sidebar) — this needs to match ANY user by name, not just
// people the viewer doesn't already follow.
const searchMentionableUsers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) return res.json({ users: [] });

    // Default stays 8 (original @mention-composer behavior); the Share
    // modal's "search all members" box passes a higher ?limit= since it
    // needs more than a typeahead's worth of results. Capped at 20 either way.
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 20);

    const regex = new RegExp(escapeRegex(q), "i");
    const users = await User.find({ name: regex, _id: { $ne: req.user._id }, isActive: { $ne: false } })
      .select(PUBLIC_PROFILE_SELECT)
      .limit(limit)
      .lean();

    res.json({ users: users.map(buildAuthorSnapshot) });
  } catch (error) {
    console.error("Error searching mentionable users:", error);
    res.status(500).json({ message: "Failed to search users." });
  }
};

// Recipient list for the "Send to people" tab of the Share modal, built
// entirely from the existing Follow relationship data (no new tables),
// ranked per spec priority: mutual connections → following → followers →
// recently-messaged (derived safely from the viewer's own Conversation
// list, which already exists — no new interaction-tracking field needed).
// Never exposes anything beyond the standard public buildAuthorSnapshot.
const getShareRecipients = async (req, res) => {
  try {
    const viewerId = req.user._id;
    const q = (req.query.q || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

    const [followingDocs, followerDocs] = await Promise.all([
      Follow.find({ follower: viewerId }).select("following").lean(),
      Follow.find({ following: viewerId }).select("follower").lean(),
    ]);
    const followingSet = new Set(followingDocs.map((f) => String(f.following)));
    const followerSet = new Set(followerDocs.map((f) => String(f.follower)));

    const mutualIds = [...followingSet].filter((id) => followerSet.has(id));
    const followingOnlyIds = [...followingSet].filter((id) => !followerSet.has(id));
    const followerOnlyIds = [...followerSet].filter((id) => !followingSet.has(id));

    const recentConversations = await Conversation.find({ participants: viewerId })
      .sort({ lastMessageAt: -1 })
      .limit(20)
      .select("participants")
      .lean();
    const knownIds = new Set([...followingSet, ...followerSet]);
    const recentIds = [
      ...new Set(
        recentConversations
          .map((c) => c.participants.find((p) => String(p) !== String(viewerId)))
          .filter(Boolean)
          .map(String)
          .filter((id) => !knownIds.has(id))
      ),
    ];

    const allIds = [...new Set([...mutualIds, ...followingOnlyIds, ...followerOnlyIds, ...recentIds])];

    const userFilter = q
      ? { _id: { $in: allIds }, name: new RegExp(escapeRegex(q), "i"), isActive: { $ne: false } }
      : { _id: { $in: allIds }, isActive: { $ne: false } };

    const users = await User.find(userFilter).select(PUBLIC_PROFILE_SELECT).lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const buildTier = (ids, relation) =>
      ids.filter((id) => userMap.has(id)).map((id) => ({ ...buildAuthorSnapshot(userMap.get(id)), relation }));

    const ranked = [
      ...buildTier(mutualIds, "mutual"),
      ...buildTier(followingOnlyIds, "following"),
      ...buildTier(followerOnlyIds, "follower"),
      ...buildTier(recentIds, "recent"),
    ].slice(0, limit);

    res.json({ users: ranked });
  } catch (error) {
    console.error("Error fetching share recipients:", error);
    res.status(500).json({ message: "Failed to load recipients." });
  }
};

// Public profile header for the Company Feed / Profile Feed pages —
// deliberately separate from employerController.getEmployerProfile /
// jobseekerController.getJobseekerProfile, which are self-only
// (authenticated user's own profile). This is the "view someone else's
// public profile" lookup the Community module needs and the rest of the
// app never had a reason to expose before.
const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) return res.status(400).json({ message: "Invalid user id." });

    const user = await User.findById(userId).select(PUBLIC_PROFILE_SELECT).lean();
    if (!user) return res.status(404).json({ message: "User not found." });

    // A deactivated account's profile is treated as gone for everyone
    // except admins/superadmins (support/moderation still needs to be
    // able to look it up) — reported as a plain 404 rather than a
    // "this account is deactivated" message, so a deactivated profile
    // isn't distinguishable from a nonexistent one to a random visitor.
    const isPrivileged = req.user && ["admin", "superadmin"].includes(req.user.role);
    if (user.isActive === false && !isPrivileged) {
      return res.status(404).json({ message: "User not found." });
    }

    const profile = buildAuthorSnapshot(user);

    const viewerId = req.user?._id || req.user?.id || null;

    if (user.role === "jobseeker") {
      const [jobseeker, memberships] = await Promise.all([
        Jobseeker.findById(userId)
          .select("qualifications skills experiences resume coverPhoto projects certifications profileStatus")
          .populate({ path: "experiences.companyId", select: "name companyLogo" })
          .lean(),
        CompanyMember.find({ user: userId })
          .populate({ path: "company", select: "name companyLogo industryType" })
          .sort({ status: 1, joinedAt: -1 })
          .lean(),
      ]);

      profile.qualifications = jobseeker?.qualifications || [];
      profile.skills = jobseeker?.skills || [];
      profile.experiences = (jobseeker?.experiences || []).map((exp) => ({
        jobPosition: exp.jobPosition,
        institution: exp.companyId?.name || exp.institution,
        duration: exp.duration,
        companyId: exp.companyId?._id || null,
        companyLogo: exp.companyId?.companyLogo || null,
        current: !!exp.current,
      }));
      profile.resume = jobseeker?.resume || null;
      profile.coverPhoto = jobseeker?.coverPhoto || null;
      profile.projects = jobseeker?.projects || [];
      profile.certifications = jobseeker?.certifications || [];
      profile.memberships = memberships.map((m) => ({
        _id: m._id,
        designation: m.designation,
        department: m.department,
        joinedAt: m.joinedAt,
        status: m.status,
        company: m.company
          ? { _id: m.company._id, name: m.company.name, companyLogo: m.company.companyLogo }
          : null,
      }));
      profile.profileStatus = await getVisibleProfileStatus(jobseeker?.profileStatus, userId, viewerId);
    } else if (user.role === "employer") {
      // Cover photo lives on the Employer discriminator, not the base
      // User doc `buildAuthorSnapshot` reads from — same gap the
      // jobseeker branch above already closes for jobseeker.coverPhoto.
      const employer = await Employer.findById(userId).select("coverPhoto profileStatus").lean();
      profile.coverPhoto = employer?.coverPhoto || null;
      profile.profileStatus = await getVisibleProfileStatus(employer?.profileStatus, userId, viewerId);
    }

    res.json({ profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowCounts,
  getSuggestions,
  searchMentionableUsers,
  getShareRecipients,
  getPublicProfile,
  // Reused by connectionController.js so "which fields are safe to show
  // about another user" and "attach their current company name" stay
  // defined in exactly one place rather than drifting between the Follow
  // and Connection systems.
  PUBLIC_PROFILE_SELECT,
  PUBLIC_PROFILE_FIELDS,
  attachCurrentCompany,
  escapeRegex,
  // Test-only escape hatch: the transactions-supported/unsupported result
  // is cached at module scope (see comment above `transactionsSupported`)
  // so a single "this deployment doesn't support transactions" detection
  // isn't repeated on every request — but that same caching would let one
  // test's simulated failure leak into every test that runs after it.
  // Not used anywhere outside backend/tests/.
  _resetTransactionCacheForTests: () => {
    transactionsSupported = true;
  },
};
