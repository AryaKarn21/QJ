// Focused integration-style test for the exact scenario named in the
// request: "User B must NOT be able to retrieve the post simply by
// calling the post API directly" — not just have it hidden in React.
// Mocks every model/util postController.js touches so it can be required
// without a DB, but deliberately lets the REAL postVisibility.js run
// (only Follow/Connection — its own dependencies — are mocked), so this
// exercises the actual enforcement wiring, not a re-implementation of it.
const mongoose = require("mongoose");

jest.mock("../models/Post");
jest.mock("../models/Comment");
jest.mock("../models/Like");
jest.mock("../models/Bookmark");
jest.mock("../models/Follow");
jest.mock("../models/Hashtag");
jest.mock("../models/User");
jest.mock("../models/Message");
jest.mock("../models/ShareEvent");
jest.mock("../models/Connection");
jest.mock("../utils/sendNotifications", () => jest.fn());
jest.mock("../utils/aiModeration", () => ({
  moderateText: jest.fn().mockResolvedValue({ status: "approved", flags: [] }),
  detectHiringIntentHeuristic: jest.fn(),
}));
jest.mock("../utils/textParsing", () => ({
  extractHashtags: jest.fn(() => []),
  extractMentionIds: jest.fn(() => []),
}));
jest.mock("../utils/postHydration", () => ({
  hydratePosts: jest.fn(async (posts) => posts),
}));
jest.mock("../utils/conversationHelpers", () => ({ findOrCreateConversation: jest.fn() }));
jest.mock("../utils/socket", () => ({ emitToConversation: jest.fn() }));

const Post = require("../models/Post");
const Connection = require("../models/Connection");
const { getPostById } = require("../controllers/postController");

const validId = () => new mongoose.Types.ObjectId().toString();

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getPostById — visibility enforcement (direct API access)", () => {
  it("returns 404 (not the post) when User B is not connected to a connections-only post's author", async () => {
    const authorId = validId(); // User A
    const viewerId = validId(); // User B — NOT connected
    const postId = validId();

    Post.findOne.mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: postId,
          author: authorId,
          visibility: "connections",
          isDeleted: false,
          moderation: { status: "approved" },
        }),
    });
    Connection.exists.mockResolvedValue(null); // not connected

    const req = { params: { postId }, user: { _id: viewerId } };
    const res = mockRes();

    await getPostById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/not found/i) }));
    // Not found, not merely hidden — the response contains no post content.
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("post");
    expect(Post.updateOne).not.toHaveBeenCalled(); // no view-count bump for a blocked read either
  });

  it("returns the post once User B becomes an accepted connection", async () => {
    const authorId = validId();
    const viewerId = validId();
    const postId = validId();

    Post.findOne.mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: postId,
          author: authorId,
          visibility: "connections",
          isDeleted: false,
          moderation: { status: "approved" },
        }),
    });
    Connection.exists.mockResolvedValue(true); // now connected
    Post.updateOne.mockResolvedValue({});

    const req = { params: { postId }, user: { _id: viewerId } };
    const res = mockRes();

    await getPostById(req, res);

    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ post: expect.objectContaining({ _id: postId }) }));
  });

  it("User C (unrelated) also gets 404 for the same connections-only post", async () => {
    const authorId = validId();
    const strangerId = validId();
    const postId = validId();

    Post.findOne.mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: postId,
          author: authorId,
          visibility: "connections",
          isDeleted: false,
          moderation: { status: "approved" },
        }),
    });
    Connection.exists.mockResolvedValue(null);

    const req = { params: { postId }, user: { _id: strangerId } };
    const res = mockRes();

    await getPostById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("a private post is 404 for everyone except the author, even an anonymous request", async () => {
    const authorId = validId();
    const postId = validId();

    Post.findOne.mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: postId,
          author: authorId,
          visibility: "private",
          isDeleted: false,
          moderation: { status: "approved" },
        }),
    });

    const anonRes = mockRes();
    await getPostById({ params: { postId }, user: null }, anonRes);
    expect(anonRes.status).toHaveBeenCalledWith(404);

    Post.updateOne.mockResolvedValue({});
    const authorRes = mockRes();
    await getPostById({ params: { postId }, user: { _id: authorId } }, authorRes);
    expect(authorRes.status).not.toHaveBeenCalledWith(404);
  });
});
