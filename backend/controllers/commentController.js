const mongoose = require("mongoose");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const User = require("../models/User");
const sendNotification = require("../utils/sendNotifications");
const { moderateText } = require("../utils/aiModeration");
const { extractMentionIds } = require("../utils/textParsing");
const { buildAuthorSnapshot } = require("../utils/userDisplay");
const { canViewPost } = require("../utils/postVisibility");

function parsePagination(req) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

// Hydrates top-level comments with author info + "did I like this" flags,
// and attaches their reply counts. Replies themselves are fetched lazily
// via getReplies() only when the user expands a thread — keeps the initial
// post-detail payload light even on posts with hundreds of comments.
async function hydrateComments(comments, viewerId) {
  if (comments.length === 0) return [];

  const authorIds = [...new Set(comments.map((c) => String(c.author)))];
  const users = await User.find({ _id: { $in: authorIds } }).lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  let likedSet = new Set();
  if (viewerId) {
    const likes = await Like.find({
      user: viewerId,
      targetType: "Comment",
      targetId: { $in: comments.map((c) => c._id) },
    })
      .select("targetId")
      .lean();
    likedSet = new Set(likes.map((l) => String(l.targetId)));
  }

  return comments.map((c) => ({
    ...c,
    author: buildAuthorSnapshot(userMap.get(String(c.author))) || { _id: c.author, name: "Deleted user" },
    hasLiked: likedSet.has(String(c._id)),
  }));
}

const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const viewerId = req.user ? req.user._id : null;

    // A post's own visibility rule must cover its comments too — without
    // this, anyone who knows/guesses a restricted post's id could read its
    // comment thread by calling this endpoint directly, bypassing the
    // post's visibility entirely (the post itself was never fetched here
    // before this fix).
    const post = await Post.findById(postId).select("visibility author isDeleted").lean();
    if (!post || post.isDeleted || !(await canViewPost(post, viewerId))) {
      return res.status(404).json({ message: "Post not found." });
    }

    const { page, limit, skip } = parsePagination(req);
    const comments = await Comment.find({ post: postId, parentComment: null, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const hydrated = await hydrateComments(comments, viewerId);
    res.json({ comments: hydrated, page, limit, hasMore: comments.length === limit });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to load comments." });
  }
};

const getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const viewerId = req.user ? req.user._id : null;

    const parentComment = await Comment.findById(commentId).select("post").lean();
    if (!parentComment) return res.status(404).json({ message: "Comment not found." });

    const post = await Post.findById(parentComment.post).select("visibility author isDeleted").lean();
    if (!post || post.isDeleted || !(await canViewPost(post, viewerId))) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const replies = await Comment.find({ parentComment: commentId, isDeleted: false })
      .sort({ createdAt: 1 })
      .lean();
    const hydrated = await hydrateComments(replies, viewerId);
    res.json({ replies: hydrated });
  } catch (error) {
    console.error("Error fetching replies:", error);
    res.status(500).json({ message: "Failed to load replies." });
  }
};

const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) return res.status(404).json({ message: "Post not found." });
    if (!(await canViewPost(post, req.user._id))) {
      return res.status(404).json({ message: "Post not found." });
    }

    let parentComment = null;
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ message: "Invalid parent comment id." });
      }
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment || parentComment.isDeleted) {
        return res.status(404).json({ message: "The comment you're replying to no longer exists." });
      }
      // Flatten reply-to-reply: always attach under the top-level comment,
      // matching the schema's single-level nesting.
      parentCommentId = String(parentComment.parentComment || parentComment._id);
    }

    const mentionIds = extractMentionIds(content).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const moderation = await moderateText(content);

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      content: content.trim(),
      mentions: mentionIds,
      parentComment: parentCommentId || null,
      moderation: { status: moderation.status, flags: moderation.flags },
    });

    post.commentCount += 1;
    await post.save();

    if (parentCommentId) {
      await Comment.updateOne({ _id: parentCommentId }, { $inc: { replyCount: 1 } });
      if (String(parentComment.author) !== String(req.user._id)) {
        sendNotification({
          recipient: parentComment.author,
          actor: req.user._id,
          type: "comment_reply",
          message: `${req.user.name} replied to your comment.`,
          relatedPost: post._id,
          relatedComment: comment._id,
          link: `/community/post/${post._id}`,
        });
      }
    } else if (String(post.author) !== String(req.user._id)) {
      sendNotification({
        recipient: post.author,
        actor: req.user._id,
        type: "post_comment",
        message: `${req.user.name} commented on your post.`,
        relatedPost: post._id,
        relatedComment: comment._id,
        link: `/community/post/${post._id}`,
      });
    }

    mentionIds.forEach((userId) => {
      sendNotification({
        recipient: userId,
        actor: req.user._id,
        type: "comment_mention",
        message: `${req.user.name} mentioned you in a comment.`,
        relatedPost: post._id,
        relatedComment: comment._id,
        link: `/community/post/${post._id}`,
      });
    });

    const [author] = await User.find({ _id: req.user._id }).lean();
    res.status(201).json({ comment: { ...comment.toObject(), author: buildAuthorSnapshot(author), hasLiked: false } });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Failed to add comment." });
  }
};

const toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) return res.status(404).json({ message: "Comment not found." });

    const existing = await Like.findOne({ user: req.user._id, targetType: "Comment", targetId: commentId });

    if (existing) {
      await existing.deleteOne();
      comment.likeCount = Math.max(0, comment.likeCount - 1);
      await comment.save();
      return res.json({ liked: false, likeCount: comment.likeCount });
    }

    await Like.create({ user: req.user._id, targetType: "Comment", targetId: commentId });
    comment.likeCount += 1;
    await comment.save();

    if (String(comment.author) !== String(req.user._id)) {
      sendNotification({
        recipient: comment.author,
        actor: req.user._id,
        type: "comment_like",
        message: `${req.user.name} liked your comment.`,
        relatedPost: comment.post,
        relatedComment: comment._id,
        link: `/community/post/${comment.post}`,
      });
    }

    res.json({ liked: true, likeCount: comment.likeCount });
  } catch (error) {
    console.error("Error toggling comment like:", error);
    res.status(500).json({ message: "Failed to update like." });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) return res.status(404).json({ message: "Comment not found." });

    const isOwner = String(comment.author) === String(req.user._id);
    const isModerator = ["admin", "superadmin"].includes(req.user.role);
    if (!isOwner && !isModerator) {
      return res.status(403).json({ message: "You can only delete your own comments." });
    }

    comment.isDeleted = true;
    await comment.save();

    await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -1 } });
    if (comment.parentComment) {
      await Comment.updateOne({ _id: comment.parentComment }, { $inc: { replyCount: -1 } });
    }

    res.json({ message: "Comment deleted." });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Failed to delete comment." });
  }
};

module.exports = { getComments, getReplies, addComment, toggleLikeComment, deleteComment };
