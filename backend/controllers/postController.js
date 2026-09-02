const mongoose = require("mongoose");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Bookmark = require("../models/Bookmark");
const Follow = require("../models/Follow");
const Hashtag = require("../models/Hashtag");
const User = require("../models/User");
const Message = require("../models/Message");
const ShareEvent = require("../models/ShareEvent");
const sendNotification = require("../utils/sendNotifications");
const { moderateText, detectHiringIntentHeuristic } = require("../utils/aiModeration");
const { extractHashtags, extractMentionIds } = require("../utils/textParsing");
const { hydratePosts } = require("../utils/postHydration");
const { buildVisibilityFilter, canViewPost } = require("../utils/postVisibility");
const { buildAuthorSnapshot } = require("../utils/userDisplay");
const { findOrCreateConversation } = require("../utils/conversationHelpers");
const { emitToConversation } = require("../utils/socket");

const POST_TYPES = ["text", "image", "video", "pdf", "job", "poll", "hiring"];
const TOPICS = ["career_tips", "interview_experience", "hiring", "general"];
// Share flow: max recipients per "send to people" batch, and how long an
// external-share click (WhatsApp/Facebook/copy-link) suppresses a repeat
// shareCount increment for the same (post, user, channel) — prevents a
// double-click or a re-opened modal from inflating the count.
const MAX_SHARE_RECIPIENTS = 20;
const SHARE_TRACK_COOLDOWN_MS = 10 * 60 * 1000;

function canonicalPostUrl(postId) {
  const base = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  return `${base}/community/post/${postId}`;
}

function parsePagination(req) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
}

function mediaUrlFor(file) {
  let folder = "images";
  if (file.mimetype.startsWith("video/")) folder = "videos";
  else if (file.mimetype === "application/pdf") folder = "documents";
  return {
    url: `/uploads/community/${folder}/${file.filename}`,
    mimeType: file.mimetype,
    fileName: file.originalname,
    sizeBytes: file.size,
  };
}

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// --- Create -----------------------------------------------------------

const createPost = async (req, res) => {
  try {
    const { type = "text", content = "", visibility = "public", company } = req.body;

    if (!POST_TYPES.includes(type)) {
      return res.status(400).json({ message: `Invalid post type. Must be one of: ${POST_TYPES.join(", ")}` });
    }

    const topics = safeJsonParse(req.body.topics, []).filter((t) => TOPICS.includes(t));
    const media = (req.files || []).map(mediaUrlFor);

    if (["image", "video", "pdf"].includes(type) && media.length === 0) {
      return res.status(400).json({ message: `A ${type} post requires at least one uploaded file.` });
    }
    if (!content.trim() && media.length === 0 && type !== "poll" && type !== "job" && type !== "hiring") {
      return res.status(400).json({ message: "Post content cannot be empty." });
    }

    // Posting "as company": only the employer account itself (or a
    // recruiter linked to that employer) may publish under a company
    // identity — otherwise anyone could impersonate a company page.
    let companyId = null;
    if (company) {
      if (req.user.role === "employer" && String(company) === String(req.user._id)) {
        companyId = company;
      } else if (req.user.role === "recruiter" && req.user.employer && String(company) === String(req.user.employer)) {
        companyId = company;
      } else {
        return res.status(403).json({ message: "You are not authorized to post as this company." });
      }
    }

    let pollData;
    if (type === "poll") {
      const raw = safeJsonParse(req.body.pollData, null);
      const options = (raw?.options || []).filter((o) => typeof o === "string" && o.trim()).slice(0, 6);
      if (options.length < 2) {
        return res.status(400).json({ message: "A poll needs at least 2 options." });
      }
      pollData = {
        options: options.map((text) => ({ text: text.trim(), votes: [] })),
        allowMultiple: !!raw?.allowMultiple,
        expiresAt: raw?.expiresAt ? new Date(raw.expiresAt) : undefined,
      };
    }

    let jobData;
    if (type === "job") {
      const raw = safeJsonParse(req.body.jobData, {});
      if (!raw.title) return res.status(400).json({ message: "Job posts require at least a title." });
      jobData = {
        job: mongoose.Types.ObjectId.isValid(raw.job) ? raw.job : null,
        title: raw.title,
        companyName: raw.companyName,
        location: raw.location,
        jobType: raw.jobType,
        salary: raw.salary,
        applyUrl: raw.applyUrl,
      };
    }

    let hiringData;
    if (type === "hiring") {
      const raw = safeJsonParse(req.body.hiringData, {});
      hiringData = {
        roles: Array.isArray(raw.roles) ? raw.roles.filter(Boolean).slice(0, 20) : [],
        openings: Number(raw.openings) || undefined,
        location: raw.location,
        urgency: raw.urgency === "urgent" ? "urgent" : "normal",
        applyUrl: raw.applyUrl,
        contactEmail: raw.contactEmail,
      };
      if (!topics.includes("hiring")) topics.push("hiring");
    }

    const hashtags = extractHashtags(content);
    const mentionIds = extractMentionIds(content).filter((id) => mongoose.Types.ObjectId.isValid(id));

    const moderation = await moderateText(content);

    const post = await Post.create({
      author: req.user._id,
      authorRole: req.user.role,
      company: companyId,
      type,
      content: content.trim(),
      media,
      hashtags,
      mentions: mentionIds,
      topics,
      // "private" is a real, fully-enforced visibility level (see
      // utils/postVisibility.js's canViewPost/buildVisibilityFilter,
      // and models/Post.js's schema enum) — it was just missing from
      // this allowlist, so selecting "Private" silently created a public
      // post instead.
      visibility: ["public", "followers", "connections", "private"].includes(visibility) ? visibility : "public",
      pollData,
      jobData,
      hiringData,
      moderation: { status: moderation.status, flags: moderation.flags, reason: moderation.reason },
    });

    // Fire-and-forget side effects — none of these should block the
    // response or fail post creation if one of them errors.
    if (hashtags.length) {
      await Promise.all(
        hashtags.map((tag) =>
          Hashtag.findOneAndUpdate(
            { tag },
            { $inc: { postCount: 1 }, $set: { lastUsedAt: new Date() } },
            { upsert: true }
          )
        )
      ).catch((e) => console.error("Hashtag counter update failed:", e.message));
    }

    if (mentionIds.length) {
      mentionIds.forEach((userId) => {
        sendNotification({
          recipient: userId,
          type: "post_mention",
          actor: req.user._id,
          message: `${req.user.name} mentioned you in a post.`,
          relatedPost: post._id,
          link: `/community/post/${post._id}`,
        });
      });
    }

    // Route through the same hydratePosts() every feed endpoint uses, so
    // the freshly created post has the same shape (viewer.hasLiked/
    // hasBookmarked, resolved author/company snapshots) as posts that
    // come back from GET /feed — this is exactly what PostCard expects
    // and was missing here, causing a crash on the just-created post.
    // (hydratePosts resolves the author itself, so no separate lookup needed.)
    const [responsePost] = await hydratePosts([post.toObject()], req.user._id);

    res.status(201).json({
      message: moderation.status === "flagged"
        ? "Post submitted and is pending review before it appears in feeds."
        : "Post created successfully.",
      post: responsePost,
      hiringIntentDetected: type === "text" && detectHiringIntentHeuristic(content),
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Failed to create post." });
  }
};

// --- Feeds --------------------------------------------------------------

async function resolveFilterMatch(filter, viewerId) {
  const base = { isDeleted: false, "moderation.status": { $ne: "removed" } };
  // Visibility is merged via $and (not spread onto `base`) because the
  // "hiring"/"following" cases below ALSO need their own $or — a second
  // $or key in the same object would silently overwrite the first one
  // rather than combining with it.
  const visibility = await buildVisibilityFilter(viewerId);

  switch (filter) {
    case "hiring":
      return { $and: [base, visibility, { $or: [{ type: "hiring" }, { type: "job" }, { topics: "hiring" }] }] };
    case "interview_experience":
      return { $and: [base, visibility, { topics: "interview_experience" }] };
    case "career_tips":
      return { $and: [base, visibility, { topics: "career_tips" }] };
    case "following": {
      if (!viewerId) return null; // signal: caller must reject, auth required
      const follows = await Follow.find({ follower: viewerId }).select("following").lean();
      const followingIds = follows.map((f) => f.following);
      followingIds.push(viewerId); // include the viewer's own posts
      return {
        $and: [base, visibility, { $or: [{ author: { $in: followingIds } }, { company: { $in: followingIds } }] }],
      };
    }
    case "latest":
    case "trending":
    default:
      return { $and: [base, visibility] };
  }
}

const getFeed = async (req, res) => {
  try {
    const { filter = "latest" } = req.query;
    const { page, limit, skip } = parsePagination(req);
    const viewerId = req.user ? req.user._id : null;

    if (filter === "following" && !viewerId) {
      return res.status(401).json({ message: "Log in to see posts from people you follow." });
    }

    const match = await resolveFilterMatch(filter, viewerId);

    let posts;
    if (filter === "trending") {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      posts = await Post.aggregate([
        { $match: { ...match, createdAt: { $gte: since } } },
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $multiply: ["$likeCount", 1] },
                { $multiply: ["$commentCount", 2] },
                { $multiply: ["$shareCount", 3] },
              ],
            },
          },
        },
        { $sort: { engagementScore: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
    } else {
      posts = await Post.find(match)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    const hydrated = await hydratePosts(posts, viewerId);
    res.json({ posts: hydrated, page, limit, hasMore: posts.length === limit });
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ message: "Failed to load feed." });
  }
};

const getCompanyFeed = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "Invalid company id." });
    }
    const { page, limit, skip } = parsePagination(req);
    const viewerId = req.user ? req.user._id : null;

    const visibility = await buildVisibilityFilter(viewerId);
    const match = {
      $and: [
        {
          isDeleted: false,
          "moderation.status": { $ne: "removed" },
          $or: [{ author: companyId }, { company: companyId }],
        },
        visibility,
      ],
    };

    const posts = await Post.find(match).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(limit).lean();
    const hydrated = await hydratePosts(posts, viewerId);
    res.json({ posts: hydrated, page, limit, hasMore: posts.length === limit });
  } catch (error) {
    console.error("Error fetching company feed:", error);
    res.status(500).json({ message: "Failed to load company feed." });
  }
};

const getUserProfileFeed = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id." });
    }
    const { page, limit, skip } = parsePagination(req);
    const viewerId = req.user ? req.user._id : null;

    const visibility = await buildVisibilityFilter(viewerId);
    const match = {
      $and: [{ author: userId, isDeleted: false, "moderation.status": { $ne: "removed" } }, visibility],
    };
    const posts = await Post.find(match).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(limit).lean();
    const hydrated = await hydratePosts(posts, viewerId);
    res.json({ posts: hydrated, page, limit, hasMore: posts.length === limit });
  } catch (error) {
    console.error("Error fetching profile feed:", error);
    res.status(500).json({ message: "Failed to load profile feed." });
  }
};

const getPostsByHashtag = async (req, res) => {
  try {
    const tag = (req.params.tag || "").toLowerCase().replace(/^#/, "");
    const { page, limit, skip } = parsePagination(req);
    const viewerId = req.user ? req.user._id : null;

    const visibility = await buildVisibilityFilter(viewerId);
    const match = {
      $and: [{ hashtags: tag, isDeleted: false, "moderation.status": { $ne: "removed" } }, visibility],
    };
    const posts = await Post.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const hydrated = await hydratePosts(posts, viewerId);
    res.json({ tag, posts: hydrated, page, limit, hasMore: posts.length === limit });
  } catch (error) {
    console.error("Error fetching hashtag feed:", error);
    res.status(500).json({ message: "Failed to load hashtag feed." });
  }
};

const getTrendingHashtags = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 15, 30);
    const hashtags = await Hashtag.find().sort({ postCount: -1, lastUsedAt: -1 }).limit(limit).lean();
    res.json({ hashtags });
  } catch (error) {
    console.error("Error fetching trending hashtags:", error);
    res.status(500).json({ message: "Failed to load trending hashtags." });
  }
};

const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post id." });
    }
    const post = await Post.findOne({ _id: postId, isDeleted: false }).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.moderation.status === "removed") {
      return res.status(404).json({ message: "Post not found." });
    }

    const viewerId = req.user ? req.user._id : null;
    // Same 404 (not 403) as "doesn't exist" — a 403 would confirm to an
    // unauthorized caller that a restricted post with this id DOES exist,
    // which is its own small information leak.
    if (!(await canViewPost(post, viewerId))) {
      return res.status(404).json({ message: "Post not found." });
    }

    await Post.updateOne({ _id: postId }, { $inc: { viewCount: 1 } });

    const [hydrated] = await hydratePosts([post], viewerId);
    res.json({ post: hydrated });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ message: "Failed to load post." });
  }
};

// --- Update / delete ------------------------------------------------------

const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) return res.status(404).json({ message: "Post not found." });

    const isOwner = String(post.author) === String(req.user._id);
    const isModerator = ["admin", "superadmin"].includes(req.user.role);
    if (!isOwner && !isModerator) {
      return res.status(403).json({ message: "You can only edit your own posts." });
    }

    if (isOwner && typeof req.body.content === "string") {
      post.content = req.body.content.trim();
      post.hashtags = extractHashtags(post.content);
      post.mentions = extractMentionIds(post.content).filter((id) => mongoose.Types.ObjectId.isValid(id));
      post.isEdited = true;
      post.editedAt = new Date();

      const moderation = await moderateText(post.content);
      post.moderation.status = moderation.status;
      post.moderation.flags = moderation.flags;
      post.moderation.reason = moderation.reason;
    }

    if (isModerator && typeof req.body.isPinned === "boolean") {
      post.isPinned = req.body.isPinned;
    }

    await post.save();
    res.json({ message: "Post updated.", post });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Failed to update post." });
  }
};

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) return res.status(404).json({ message: "Post not found." });

    const isOwner = String(post.author) === String(req.user._id);
    const isModerator = ["admin", "superadmin"].includes(req.user.role);
    if (!isOwner && !isModerator) {
      return res.status(403).json({ message: "You can only delete your own posts." });
    }

    post.isDeleted = true;
    await post.save();
    res.json({ message: "Post deleted." });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Failed to delete post." });
  }
};

// --- Engagement: like / bookmark / share / poll vote ---------------------

const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) return res.status(404).json({ message: "Post not found." });

    const existing = await Like.findOne({ user: req.user._id, targetType: "Post", targetId: postId });

    if (existing) {
      await existing.deleteOne();
      post.likeCount = Math.max(0, post.likeCount - 1);
      await post.save();
      return res.json({ liked: false, likeCount: post.likeCount });
    }

    await Like.create({ user: req.user._id, targetType: "Post", targetId: postId });
    post.likeCount += 1;
    await post.save();

    sendNotification({
      recipient: post.author,
      actor: req.user._id,
      type: "post_like",
      message: `${req.user.name} liked your post.`,
      relatedPost: post._id,
      link: `/community/post/${post._id}`,
    });

    res.json({ liked: true, likeCount: post.likeCount });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Failed to update like." });
  }
};

const toggleBookmarkPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) return res.status(404).json({ message: "Post not found." });

    const existing = await Bookmark.findOne({ user: req.user._id, post: postId });

    if (existing) {
      await existing.deleteOne();
      post.bookmarkCount = Math.max(0, post.bookmarkCount - 1);
      await post.save();
      return res.json({ bookmarked: false, bookmarkCount: post.bookmarkCount });
    }

    await Bookmark.create({ user: req.user._id, post: postId, collectionName: req.body.collectionName || "General" });
    post.bookmarkCount += 1;
    await post.save();
    res.json({ bookmarked: true, bookmarkCount: post.bookmarkCount });
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    res.status(500).json({ message: "Failed to update bookmark." });
  }
};

const getMyBookmarks = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const bookmarks = await Bookmark.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "post" })
      .lean();

    // A bookmark can outlive the visibility the bookmarker originally had
    // (e.g. the author later switched the post to Connections-only, or
    // removed the connection) — re-check on every read rather than only
    // at bookmark time, same as every other read path in this file.
    const candidatePosts = bookmarks.filter((b) => b.post && !b.post.isDeleted).map((b) => b.post);
    const visible = [];
    for (const post of candidatePosts) {
      if (await canViewPost(post, req.user._id)) visible.push(post);
    }
    const hydrated = await hydratePosts(visible, req.user._id);
    res.json({ posts: hydrated, page, limit, hasMore: bookmarks.length === limit });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    res.status(500).json({ message: "Failed to load bookmarks." });
  }
};

const sharePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const original = await Post.findById(postId);
    if (!original || original.isDeleted) return res.status(404).json({ message: "Post not found." });
    if (!(await canViewPost(original, req.user._id))) {
      return res.status(404).json({ message: "Post not found." });
    }

    const content = (req.body.content || "").trim();
    const share = await Post.create({
      author: req.user._id,
      authorRole: req.user.role,
      type: "text",
      content,
      hashtags: extractHashtags(content),
      mentions: extractMentionIds(content),
      sharedFrom: original._id,
      moderation: { status: "approved" },
    });

    original.shareCount += 1;
    await original.save();
    await ShareEvent.create({ post: original._id, user: req.user._id, channel: "feed" });

    sendNotification({
      recipient: original.author,
      actor: req.user._id,
      type: "post_share",
      message: `${req.user.name} shared your post.`,
      relatedPost: original._id,
      link: `/community/post/${original._id}`,
    });

    // Hydrate the response the same way every feed endpoint does (resolved
    // author snapshot, viewer flags, sharedFrom attribution) — matches what
    // PostCard/ShareModal expect and what createPost already does for new posts.
    const [hydrated] = await hydratePosts([share.toObject()], req.user._id);

    res.status(201).json({ message: "Post shared.", post: hydrated, shareCount: original.shareCount });
  } catch (error) {
    console.error("Error sharing post:", error);
    res.status(500).json({ message: "Failed to share post." });
  }
};

// "Send in a message" — shares a post directly into 1:1 conversations with
// selected QuickJobs users, reusing the existing Conversation/Message
// system (via findOrCreateConversation, the same helper messageController
// uses) rather than a parallel sharing mechanism. One shareCount increment
// per successful submit (not per recipient), guarded by a ShareEvent log.
const shareToUsers = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post id." });
    }

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) return res.status(404).json({ message: "Post not found." });
    if (!(await canViewPost(post, req.user._id))) {
      return res.status(404).json({ message: "Post not found." });
    }

    const rawIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
    const note = typeof req.body.message === "string" ? req.body.message.trim().slice(0, 1000) : "";

    const dedupedIds = [...new Set(rawIds.map(String).filter((id) => mongoose.Types.ObjectId.isValid(id)))]
      .filter((id) => id !== String(req.user._id)) // can't send to yourself
      .slice(0, MAX_SHARE_RECIPIENTS);

    if (dedupedIds.length === 0) {
      return res.status(400).json({ message: "Select at least one recipient." });
    }

    const recipientUsers = await User.find({ _id: { $in: dedupedIds } }).select("_id").lean();
    const validIds = recipientUsers.map((u) => String(u._id));
    if (validIds.length === 0) {
      return res.status(400).json({ message: "None of the selected recipients could be found." });
    }

    const url = canonicalPostUrl(post._id);
    const text = note ? `${note}\n\n${url}` : `Check out this post: ${url}`;

    let sentCount = 0;
    for (const recipientId of validIds) {
      try {
        const conversation = await findOrCreateConversation(req.user._id, recipientId);
        const msg = await Message.create({
          conversation: conversation._id,
          sender: req.user._id,
          text,
          readBy: [req.user._id],
        });

        conversation.lastMessage = msg._id;
        conversation.lastMessageAt = msg.createdAt;
        const currentUnread = conversation.unreadCounts.get(String(recipientId)) || 0;
        conversation.unreadCounts.set(String(recipientId), currentUnread + 1);
        await conversation.save();

        emitToConversation(conversation._id, "message:new", {
          _id: msg._id,
          conversation: conversation._id,
          sender: req.user._id,
          text: msg.text,
          createdAt: msg.createdAt,
        });

        sendNotification({
          recipient: recipientId,
          actor: req.user._id,
          type: "new_message",
          message: `${req.user.name} sent you a post.`,
          relatedConversation: conversation._id,
          relatedPost: post._id,
          link: `/messages/${conversation._id}`,
        });

        sentCount += 1;
      } catch (err) {
        console.error(`Failed to send shared post to ${recipientId}:`, err.message);
      }
    }

    if (sentCount > 0) {
      post.shareCount += 1;
      await post.save();
      await ShareEvent.create({ post: post._id, user: req.user._id, channel: "user_dm" });
    }

    res.status(sentCount > 0 ? 201 : 502).json({
      message: sentCount > 0 ? "Post sent." : "Failed to send post to any recipient.",
      sentCount,
      shareCount: post.shareCount,
    });
  } catch (error) {
    console.error("Error sharing post to users:", error);
    res.status(500).json({ message: "Failed to send post." });
  }
};

// Best-effort tracking for external shares (WhatsApp/Facebook/copy-link) —
// we can't confirm the user actually completed the external action, only
// that they initiated it, which is exactly what the spec allows ("external
// sharing action initiated successfully, where tracking is technically
// possible"). Idempotent per (post, user, channel) within a cooldown window
// so re-opening the modal or double-clicking doesn't inflate shareCount.
const trackExternalShare = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post id." });
    }

    const channel = req.body.channel;
    if (!["whatsapp", "facebook", "copy_link"].includes(channel)) {
      return res.status(400).json({ message: "Invalid share channel." });
    }

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) return res.status(404).json({ message: "Post not found." });

    const since = new Date(Date.now() - SHARE_TRACK_COOLDOWN_MS);
    const recent = await ShareEvent.findOne({
      post: post._id,
      user: req.user._id,
      channel,
      createdAt: { $gte: since },
    });

    if (!recent) {
      await ShareEvent.create({ post: post._id, user: req.user._id, channel });
      post.shareCount += 1;
      await post.save();
    }

    res.json({ shareCount: post.shareCount });
  } catch (error) {
    console.error("Error tracking external share:", error);
    res.status(500).json({ message: "Failed to record share." });
  }
};

const votePoll = async (req, res) => {
  try {
    const { postId } = req.params;
    const { optionId } = req.body;
    const post = await Post.findById(postId);
    if (!post || post.isDeleted || post.type !== "poll") {
      return res.status(404).json({ message: "Poll not found." });
    }
    if (post.pollData.expiresAt && post.pollData.expiresAt < new Date()) {
      return res.status(400).json({ message: "This poll has closed." });
    }

    const option = post.pollData.options.id(optionId);
    if (!option) return res.status(404).json({ message: "Poll option not found." });

    const userId = String(req.user._id);
    const alreadyVotedHere = option.votes.some((v) => String(v) === userId);

    if (alreadyVotedHere) {
      option.votes = option.votes.filter((v) => String(v) !== userId);
    } else {
      if (!post.pollData.allowMultiple) {
        post.pollData.options.forEach((opt) => {
          opt.votes = opt.votes.filter((v) => String(v) !== userId);
        });
      }
      option.votes.push(req.user._id);
    }

    await post.save();
    res.json({ pollData: post.pollData });
  } catch (error) {
    console.error("Error voting on poll:", error);
    res.status(500).json({ message: "Failed to record vote." });
  }
};

// --- Admin moderation -----------------------------------------------------

const getFlaggedPosts = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const posts = await Post.find({ "moderation.status": "flagged", isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const hydrated = await hydratePosts(posts, null);
    res.json({ posts: hydrated, page, limit, hasMore: posts.length === limit });
  } catch (error) {
    console.error("Error fetching flagged posts:", error);
    res.status(500).json({ message: "Failed to load flagged posts." });
  }
};

const moderatePostDecision = async (req, res) => {
  try {
    const { postId } = req.params;
    const { decision, note } = req.body; // "approve" | "remove"
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found." });

    post.moderation.status = decision === "remove" ? "removed" : "approved";
    post.moderation.reason = note || post.moderation.reason;
    post.moderation.reviewedBy = req.user._id;
    post.moderation.reviewedAt = new Date();
    await post.save();

    sendNotification({
      recipient: post.author,
      type: "post_moderated",
      message:
        decision === "remove"
          ? "Your post was removed for violating community guidelines."
          : "Your post was reviewed and approved.",
      relatedPost: post._id,
      link: `/community/post/${post._id}`,
    });

    res.json({ message: "Moderation decision applied.", post });
  } catch (error) {
    console.error("Error applying moderation decision:", error);
    res.status(500).json({ message: "Failed to apply moderation decision." });
  }
};

module.exports = {
  createPost,
  getFeed,
  getCompanyFeed,
  getUserProfileFeed,
  getPostsByHashtag,
  getTrendingHashtags,
  getPostById,
  updatePost,
  deletePost,
  toggleLikePost,
  toggleBookmarkPost,
  getMyBookmarks,
  sharePost,
  shareToUsers,
  trackExternalShare,
  votePoll,
  getFlaggedPosts,
  moderatePostDecision,
};