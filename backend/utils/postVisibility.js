const Follow = require("../models/Follow");
const Connection = require("../models/Connection");

// Single source of truth for "who is allowed to see this post", used by
// every post/comment read path (see postController.js, commentController.js,
// postHydration.js) so the PUBLIC/FOLLOWERS/CONNECTIONS/PRIVATE rule is
// enforced identically everywhere instead of five slightly-different
// re-implementations. Follower !== Connection on purpose (see
// models/Connection.js) — "connections" visibility checks the actual
// Connection model, never Follow.

// Builds a Mongo $or clause restricting a Post query to only documents the
// given viewer (or an anonymous visitor, if viewerId is falsy) may see.
// Computed ONCE per request — two cheap indexed queries — and merged into
// the caller's own $match/$and so pagination/hasMore stay correct at the
// database level, instead of fetching a full page and then filtering it
// down to fewer items than requested.
async function buildVisibilityFilter(viewerId) {
  const clauses = [{ visibility: "public" }, { visibility: { $exists: false } }];
  if (!viewerId) return { $or: clauses };

  clauses.push({ author: viewerId }); // always see your own posts, any visibility

  const [follows, connections] = await Promise.all([
    Follow.find({ follower: viewerId }).select("following").lean(),
    Connection.find({ status: "accepted", $or: [{ requester: viewerId }, { recipient: viewerId }] })
      .select("requester recipient")
      .lean(),
  ]);

  const followingIds = follows.map((f) => f.following);
  if (followingIds.length) clauses.push({ visibility: "followers", author: { $in: followingIds } });

  const connectedIds = connections.map((c) =>
    String(c.requester) === String(viewerId) ? c.recipient : c.requester
  );
  if (connectedIds.length) clauses.push({ visibility: "connections", author: { $in: connectedIds } });

  return { $or: clauses };
}

// Single already-fetched post + viewer check (post detail, comments,
// resharing, sharedFrom resolution) — same rule as buildVisibilityFilter,
// just evaluated against one document instead of shaping a query.
async function canViewPost(post, viewerId) {
  if (!post) return false;
  if (!post.visibility || post.visibility === "public") return true;
  if (viewerId && String(post.author) === String(viewerId)) return true;
  if (!viewerId) return false;
  if (post.visibility === "private") return false;

  if (post.visibility === "followers") {
    return !!(await Follow.exists({ follower: viewerId, following: post.author }));
  }

  if (post.visibility === "connections") {
    return !!(await Connection.exists({
      status: "accepted",
      $or: [
        { requester: viewerId, recipient: post.author },
        { requester: post.author, recipient: viewerId },
      ],
    }));
  }

  return false; // unrecognized visibility value — fail closed, not open
}

module.exports = { buildVisibilityFilter, canViewPost };
