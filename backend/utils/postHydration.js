const User = require("../models/User");
const Like = require("../models/Like");
const Bookmark = require("../models/Bookmark");
const { buildAuthorSnapshot } = require("./userDisplay");
const { canViewPost } = require("./postVisibility");

// Turns a raw array of lean Post documents into feed-ready objects:
// resolves author + company snapshots and, if a viewer is provided, tags
// each post with whether *they* liked/bookmarked it. Shared by every feed
// endpoint (home/company/profile/hashtag/single-post) so "did I like this"
// logic lives in exactly one place.
async function hydratePosts(posts, viewerId) {
  if (posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => String(p.author)))];
  const companyIds = [...new Set(posts.filter((p) => p.company).map((p) => String(p.company)))];

  // Sharing/attribution: resolve each post's `sharedFrom` (a Post id) into a
  // lightweight snapshot (author, content excerpt, media, isDeleted) rather
  // than leaving it as a raw id — this is what lets the feed render "shared
  // post, preserving attribution to the original author" without a second
  // client-side fetch, and lets the UI show a graceful "Original post
  // unavailable" placeholder when the original was soft-deleted. Requiring
  // the Post model here (rather than at module load) avoids a require cycle,
  // since Post.js never requires this file.
  const Post = require("../models/Post");
  const sharedFromIds = [...new Set(posts.filter((p) => p.sharedFrom).map((p) => String(p.sharedFrom)))];
  const sharedFromPosts = sharedFromIds.length
    ? await Post.find({ _id: { $in: sharedFromIds } })
        .select("author content media type createdAt isDeleted visibility")
        .lean()
    : [];

  const allUserIds = [...new Set([...authorIds, ...companyIds, ...sharedFromPosts.map((p) => String(p.author))])];

  const users = await User.find({ _id: { $in: allUserIds } }).lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  // A repost's own visibility (usually "public") does NOT inherit the
  // original's — this is exactly the bypass PROJECT_AUDIT.md §5 flags:
  // Connections-only post -> a connection reshares it -> the repost
  // defaults to public -> without this check, EVERY viewer of that public
  // repost would see the original's full content through sharedFrom,
  // regardless of whether they can view the original themselves. Checked
  // per-viewer, not baked into the shared map, since two different people
  // looking at the same repost can have different access to the original.
  // Reuses the exact same `isDeleted: true` placeholder shape the frontend
  // (PostCard.tsx) already renders as "Original post unavailable" — no
  // frontend change needed to distinguish "deleted" from "not visible to
  // you"; both should read the same way to a viewer who can't see it.
  const sharedFromEntries = await Promise.all(
    sharedFromPosts.map(async (p) => {
      if (p.isDeleted) return [String(p._id), { _id: p._id, isDeleted: true }];
      const visible = await canViewPost(p, viewerId);
      if (!visible) return [String(p._id), { _id: p._id, isDeleted: true }];
      return [
        String(p._id),
        {
          _id: p._id,
          isDeleted: false,
          author: buildAuthorSnapshot(userMap.get(String(p.author))),
          content: p.content,
          media: p.media,
          type: p.type,
          createdAt: p.createdAt,
        },
      ];
    })
  );
  const sharedFromMap = new Map(sharedFromEntries);

  let likedSet = new Set();
  let bookmarkedSet = new Set();

  if (viewerId) {
    const postIds = posts.map((p) => p._id);
    const [likes, bookmarks] = await Promise.all([
      Like.find({ user: viewerId, targetType: "Post", targetId: { $in: postIds } }).select("targetId").lean(),
      Bookmark.find({ user: viewerId, post: { $in: postIds } }).select("post").lean(),
    ]);
    likedSet = new Set(likes.map((l) => String(l.targetId)));
    bookmarkedSet = new Set(bookmarks.map((b) => String(b.post)));
  }

  return posts.map((post) => {
    const author = userMap.get(String(post.author));
    const company = post.company ? userMap.get(String(post.company)) : null;

    return {
      ...post,
      author: buildAuthorSnapshot(author) || { _id: post.author, name: "Deleted user", role: post.authorRole },
      company: company ? buildAuthorSnapshot(company) : null,
      sharedFrom: post.sharedFrom
        ? sharedFromMap.get(String(post.sharedFrom)) || { _id: post.sharedFrom, isDeleted: true }
        : null,
      viewer: viewerId
        ? {
            hasLiked: likedSet.has(String(post._id)),
            hasBookmarked: bookmarkedSet.has(String(post._id)),
          }
        : { hasLiked: false, hasBookmarked: false },
    };
  });
}

module.exports = { hydratePosts };
