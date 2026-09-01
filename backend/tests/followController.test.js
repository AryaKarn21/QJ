// Unit tests for the Community Follow system's business logic
// (backend/controllers/followController.js).
//
// Deliberately mocks Mongoose models rather than hitting a real/in-memory
// MongoDB: these tests exist to lock in the *rules* (self-follow blocked,
// duplicates handled idempotently, inactive accounts rejected, counters
// move atomically, invalid ids rejected before touching the DB) rather
// than to exercise Mongo's query engine, and running with no external
// dependency keeps them fast and deterministic in any environment
// (including this one, offline or not).
const mongoose = require("mongoose");

jest.mock("../models/Follow");
jest.mock("../models/User");
jest.mock("../models/CompanyMember");
jest.mock("../utils/sendNotifications", () => jest.fn());

const Follow = require("../models/Follow");
const User = require("../models/User");
const CompanyMember = require("../models/CompanyMember");
const sendNotification = require("../utils/sendNotifications");
const {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowCounts,
  _resetTransactionCacheForTests,
} = require("../controllers/followController");

// A minimal stand-in for a Mongoose Query: every chain method (`.select()`,
// `.lean()`, `.sort()`, `.session()`, ...) returns the same object, and
// `await`-ing it (or calling `.then`) resolves to `resolvedValue` — so a
// test only has to say what the query eventually returns, not which
// chain of methods the controller happens to call to get there.
function mockQuery(resolvedValue) {
  const q = {};
  ["select", "lean", "sort", "skip", "limit", "session", "populate"].forEach((method) => {
    q[method] = jest.fn(() => q);
  });
  q.then = (resolve, reject) => Promise.resolve(resolvedValue).then(resolve, reject);
  q.catch = (reject) => Promise.resolve(resolvedValue).catch(reject);
  return q;
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const validId = () => new mongoose.Types.ObjectId().toString();

function fakeTransactionSession() {
  return { withTransaction: async (fn) => fn(), endSession: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  _resetTransactionCacheForTests();
  jest.restoreAllMocks();
  // Default: nobody in a test has an active company membership unless a
  // test explicitly overrides this — keeps getFollowers/getFollowing/
  // getSuggestions tests (which don't care about company enrichment)
  // from needing to know attachCurrentCompany exists.
  CompanyMember.find.mockReturnValue(mockQuery([]));
});

describe("toggleFollow", () => {
  it("rejects an invalid target user id with 400, without querying the DB", async () => {
    const req = { params: { userId: "not-an-object-id" }, user: { _id: validId(), name: "Viewer" } };
    const res = mockRes();

    await toggleFollow(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("rejects following yourself with 400", async () => {
    const id = validId();
    const req = { params: { userId: id }, user: { _id: id, name: "Viewer" } };
    const res = mockRes();

    await toggleFollow(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/yourself/i) }));
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user doesn't exist", async () => {
    User.findById.mockReturnValue(mockQuery(null));
    const req = { params: { userId: validId() }, user: { _id: validId(), name: "Viewer" } };
    const res = mockRes();

    await toggleFollow(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("refuses to follow a deactivated account", async () => {
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: false }));
    const req = { params: { userId: validId() }, user: { _id: validId(), name: "Viewer" } };
    const res = mockRes();

    await toggleFollow(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Follow.create).not.toHaveBeenCalled();
  });

  it("creates a follow, increments both counters, and notifies the target", async () => {
    const followerId = validId();
    const targetId = validId();
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    jest.spyOn(mongoose, "startSession").mockResolvedValue(fakeTransactionSession());
    Follow.findOne.mockReturnValue(mockQuery(null)); // not already following
    Follow.create.mockResolvedValue([{}]);
    User.updateOne.mockReturnValue(mockQuery(undefined));

    const req = { params: { userId: targetId }, user: { _id: followerId, name: "Viewer" } };
    const res = mockRes();

    await toggleFollow(req, res);

    expect(Follow.create).toHaveBeenCalledWith(
      [{ follower: followerId, following: targetId, followingType: "user" }],
      expect.objectContaining({ session: expect.anything() })
    );
    expect(User.updateOne).toHaveBeenCalledWith({ _id: targetId }, { $inc: { followersCount: 1 } });
    expect(User.updateOne).toHaveBeenCalledWith({ _id: followerId }, { $inc: { followingCount: 1 } });
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: targetId, type: "new_follower" })
    );
    expect(res.json).toHaveBeenCalledWith({ following: true });
  });

  it("marks a company (employer) follow with followingType 'company'", async () => {
    const followerId = validId();
    const targetId = validId();
    User.findById.mockReturnValue(mockQuery({ role: "employer", isActive: true }));
    jest.spyOn(mongoose, "startSession").mockResolvedValue(fakeTransactionSession());
    Follow.findOne.mockReturnValue(mockQuery(null));
    Follow.create.mockResolvedValue([{}]);
    User.updateOne.mockReturnValue(mockQuery(undefined));

    const req = { params: { userId: targetId }, user: { _id: followerId, name: "Viewer" } };
    await toggleFollow(req, mockRes());

    expect(Follow.create).toHaveBeenCalledWith(
      [{ follower: followerId, following: targetId, followingType: "company" }],
      expect.anything()
    );
  });

  it("removes an existing follow, decrements both counters, and does not notify", async () => {
    const followerId = validId();
    const targetId = validId();
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    jest.spyOn(mongoose, "startSession").mockResolvedValue(fakeTransactionSession());
    Follow.findOne.mockReturnValue(mockQuery({ _id: "existing-follow-doc" }));
    Follow.deleteOne.mockReturnValue(mockQuery(undefined));
    User.updateOne.mockReturnValue(mockQuery(undefined));

    const req = { params: { userId: targetId }, user: { _id: followerId, name: "Viewer" } };
    const res = mockRes();

    await toggleFollow(req, res);

    expect(Follow.deleteOne).toHaveBeenCalledWith({ _id: "existing-follow-doc" });
    expect(User.updateOne).toHaveBeenCalledWith({ _id: targetId }, { $inc: { followersCount: -1 } });
    expect(User.updateOne).toHaveBeenCalledWith({ _id: followerId }, { $inc: { followingCount: -1 } });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ following: false });
  });

  it("treats a duplicate-key race (double-click) as an idempotent success, not a 500", async () => {
    const followerId = validId();
    const targetId = validId();
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    jest.spyOn(mongoose, "startSession").mockResolvedValue(fakeTransactionSession());
    Follow.findOne.mockReturnValue(mockQuery(null));
    const dupErr = new Error("E11000 duplicate key error");
    dupErr.code = 11000;
    Follow.create.mockRejectedValue(dupErr);

    const req = { params: { userId: targetId }, user: { _id: followerId, name: "Viewer" } };
    const res = mockRes();

    await toggleFollow(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ following: true });
  });

  it("falls back to sequential (non-transactional) writes when the deployment can't run transactions", async () => {
    const followerId = validId();
    const targetId = validId();
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    jest.spyOn(mongoose, "startSession").mockResolvedValue({
      withTransaction: async () => {
        throw new Error("Transaction numbers are only allowed on a replica set member or mongos");
      },
      endSession: jest.fn(),
    });
    Follow.findOne.mockReturnValue(mockQuery(null));
    Follow.create.mockResolvedValue({});
    User.updateOne.mockReturnValue(mockQuery(undefined));

    const req = { params: { userId: targetId }, user: { _id: followerId, name: "Viewer" } };
    const res = mockRes();

    await toggleFollow(req, res);

    // Non-transactional path calls Follow.create with a plain object, not
    // the [doc] array + {session} form the transactional path uses.
    expect(Follow.create).toHaveBeenCalledWith({ follower: followerId, following: targetId, followingType: "user" });
    expect(res.json).toHaveBeenCalledWith({ following: true });
  });

  it("surfaces an unexpected DB error as a 500 instead of throwing", async () => {
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    jest.spyOn(mongoose, "startSession").mockRejectedValue(new Error("connection reset"));

    const req = { params: { userId: validId() }, user: { _id: validId(), name: "Viewer" } };
    const res = mockRes();

    await toggleFollow(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getFollowers / getFollowing", () => {
  it("rejects an invalid profile id with 400 before running any query", async () => {
    const res = mockRes();
    await getFollowers({ params: { userId: "bad-id" }, query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Follow.aggregate).not.toHaveBeenCalled();
  });

  it("paginates followers using the Follow collection (not an in-memory id array)", async () => {
    const profileId = validId();
    const followerUser = { _id: validId(), name: "Alice", role: "jobseeker" };
    Follow.aggregate.mockResolvedValue([
      { data: [{ user: followerUser }], totalCount: [{ count: 37 }] },
    ]);
    Follow.find.mockReturnValue(mockQuery([])); // viewer's own following set (anonymous here)

    const req = { params: { userId: profileId }, query: { page: "2", limit: "10" }, user: null };
    const res = mockRes();

    await getFollowers(req, res);

    // page 2 / limit 10 must translate into a $skip of 10 inside the pipeline
    const pipeline = Follow.aggregate.mock.calls[0][0];
    const facetStage = pipeline.find((stage) => stage.$facet);
    const skipStage = facetStage.$facet.data.find((s) => "$skip" in s);
    expect(skipStage.$skip).toBe(10);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 37, page: 2, limit: 10, totalPages: 4 })
    );
    expect(res.json.mock.calls[0][0].followers[0]).toEqual(
      expect.objectContaining({ _id: followerUser._id, name: "Alice" })
    );
  });

  it("marks people the viewer already follows so the button renders as 'Following'", async () => {
    const profileId = validId();
    const viewerId = validId();
    const otherUser = { _id: validId(), name: "Bob", role: "jobseeker" };
    Follow.aggregate.mockResolvedValue([{ data: [{ user: otherUser }], totalCount: [{ count: 1 }] }]);
    Follow.find.mockReturnValue(mockQuery([{ following: otherUser._id }]));

    const req = { params: { userId: profileId }, query: {}, user: { _id: viewerId } };
    const res = mockRes();

    await getFollowing(req, res);

    expect(res.json.mock.calls[0][0].following[0]).toEqual(
      expect.objectContaining({ _id: otherUser._id, isFollowing: true })
    );
  });
});

describe("getFollowCounts", () => {
  it("rejects an invalid id with 400", async () => {
    const res = mockRes();
    await getFollowCounts({ params: { userId: "bad-id" }, query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 for a nonexistent user", async () => {
    User.findById.mockReturnValue(mockQuery(null));
    const res = mockRes();
    await getFollowCounts({ params: { userId: validId() }, user: null }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("reads counts from the denormalized User fields (O(1)) rather than counting Follow docs", async () => {
    User.findById.mockReturnValue(mockQuery({ followersCount: 12, followingCount: 4 }));
    Follow.exists.mockResolvedValue(null);

    const req = { params: { userId: validId() }, user: { _id: validId() } };
    const res = mockRes();

    await getFollowCounts(req, res);

    expect(res.json).toHaveBeenCalledWith({ followers: 12, following: 4, isFollowing: false });
  });
});
