// Unit tests for the post-visibility rule (backend/utils/postVisibility.js)
// — the single place PUBLIC/FOLLOWERS/CONNECTIONS/PRIVATE is enforced for
// every post/comment read path. The one rule under explicit test here,
// called out by name in the request that added it: a follower is NOT
// automatically treated as a connection.
const mongoose = require("mongoose");

jest.mock("../models/Follow");
jest.mock("../models/Connection");

const Follow = require("../models/Follow");
const Connection = require("../models/Connection");
const { canViewPost, buildVisibilityFilter } = require("../utils/postVisibility");

const validId = () => new mongoose.Types.ObjectId().toString();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("canViewPost", () => {
  it("is visible to anyone (including anonymous) when public", async () => {
    const post = { visibility: "public", author: validId() };
    expect(await canViewPost(post, null)).toBe(true);
    expect(await canViewPost(post, validId())).toBe(true);
  });

  it("treats a missing visibility field as public (legacy posts)", async () => {
    const post = { author: validId() };
    expect(await canViewPost(post, null)).toBe(true);
  });

  it("returns false for null/undefined posts", async () => {
    expect(await canViewPost(null, validId())).toBe(false);
  });

  describe("private", () => {
    it("is visible only to the author", async () => {
      const authorId = validId();
      const post = { visibility: "private", author: authorId };
      expect(await canViewPost(post, authorId)).toBe(true);
      expect(await canViewPost(post, validId())).toBe(false);
      expect(await canViewPost(post, null)).toBe(false);
    });
  });

  describe("followers", () => {
    it("is visible to the author and to an actual follower, not to a stranger or anonymous", async () => {
      const authorId = validId();
      const post = { visibility: "followers", author: authorId };

      expect(await canViewPost(post, authorId)).toBe(true);
      expect(await canViewPost(post, null)).toBe(false);

      Follow.exists.mockResolvedValueOnce(true);
      expect(await canViewPost(post, validId())).toBe(true);

      Follow.exists.mockResolvedValueOnce(null);
      expect(await canViewPost(post, validId())).toBe(false);
    });
  });

  describe("connections — Follower !== Connection", () => {
    it("is visible to the author and to an accepted connection", async () => {
      const authorId = validId();
      const post = { visibility: "connections", author: authorId };

      expect(await canViewPost(post, authorId)).toBe(true);

      Connection.exists.mockResolvedValueOnce(true);
      expect(await canViewPost(post, validId())).toBe(true);
    });

    it("is NOT visible to someone who only follows the author (not connected)", async () => {
      const authorId = validId();
      const post = { visibility: "connections", author: authorId };

      // Even if this viewer follows the author, canViewPost must never
      // consult Follow for "connections" visibility — only Connection.
      Connection.exists.mockResolvedValueOnce(null);
      const result = await canViewPost(post, validId());

      expect(result).toBe(false);
      expect(Follow.exists).not.toHaveBeenCalled();
    });

    it("is not visible to anonymous visitors", async () => {
      const post = { visibility: "connections", author: validId() };
      expect(await canViewPost(post, null)).toBe(false);
      expect(Connection.exists).not.toHaveBeenCalled();
    });
  });

  it("fails closed for an unrecognized visibility value", async () => {
    const post = { visibility: "some_future_value", author: validId() };
    expect(await canViewPost(post, validId())).toBe(false);
  });
});

describe("buildVisibilityFilter", () => {
  it("only allows public (and legacy no-visibility) posts for an anonymous viewer", async () => {
    const filter = await buildVisibilityFilter(null);
    expect(filter).toEqual({ $or: [{ visibility: "public" }, { visibility: { $exists: false } }] });
    expect(Follow.find).not.toHaveBeenCalled();
  });

  it("always includes the viewer's own posts, even with no follows/connections", async () => {
    Follow.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });
    Connection.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });

    const viewerId = validId();
    const filter = await buildVisibilityFilter(viewerId);

    expect(filter.$or).toContainEqual({ author: viewerId });
    expect(filter.$or).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ visibility: "followers" })])
    );
  });

  it("adds a followers-visibility clause scoped to who the viewer actually follows", async () => {
    const followedId = validId();
    Follow.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([{ following: followedId }]) }) });
    Connection.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });

    const filter = await buildVisibilityFilter(validId());

    expect(filter.$or).toContainEqual({ visibility: "followers", author: { $in: [followedId] } });
  });

  it("adds a connections-visibility clause scoped to accepted connections, resolving the OTHER side per row", async () => {
    const viewerId = validId();
    const connectedId = validId();
    Follow.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });
    Connection.find.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([{ requester: viewerId, recipient: connectedId }]),
      }),
    });

    const filter = await buildVisibilityFilter(viewerId);

    expect(filter.$or).toContainEqual({ visibility: "connections", author: { $in: [connectedId] } });
  });
});
