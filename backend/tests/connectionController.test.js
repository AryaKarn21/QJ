// Unit tests for the Connection system's business logic
// (backend/controllers/connectionController.js). Same approach as
// tests/followController.test.js: mock Mongoose models rather than hit a
// real DB, so these lock in the *rules* (self-connect blocked, mutual
// requests auto-accept, only the recipient can accept/reject, only the
// requester can cancel, only the blocker can unblock, block prevents new
// requests) fast and deterministically.
const mongoose = require("mongoose");

jest.mock("../models/Connection");
jest.mock("../models/User");
jest.mock("../utils/sendNotifications", () => jest.fn());
jest.mock("../controllers/followController", () => ({
  PUBLIC_PROFILE_SELECT: "name role profilePic companyLogo headline",
  PUBLIC_PROFILE_FIELDS: { name: 1, role: 1, profilePic: 1, companyLogo: 1, headline: 1, isActive: 1 },
  attachCurrentCompany: jest.fn((people) => Promise.resolve(people)),
  escapeRegex: (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
}));

const Connection = require("../models/Connection");
const User = require("../models/User");
const sendNotification = require("../utils/sendNotifications");
const {
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
} = require("../controllers/connectionController");

function mockQuery(resolvedValue) {
  const q = {};
  ["select", "lean", "sort", "skip", "limit", "populate"].forEach((m) => {
    q[m] = jest.fn(() => q);
  });
  q.then = (resolve, reject) => Promise.resolve(resolvedValue).then(resolve, reject);
  q.catch = (reject) => Promise.resolve(resolvedValue).catch(reject);
  return q;
}

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const validId = () => new mongoose.Types.ObjectId().toString();

function fakeConnectionDoc(overrides = {}) {
  return {
    _id: validId(),
    requester: validId(),
    recipient: validId(),
    status: "pending",
    blockedBy: null,
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no prior relationship between any two users, and every
  // targeted user "exists and is active" unless a test overrides it —
  // matches followController.test.js's default-mocks-then-override style.
  Connection.find.mockReturnValue(mockQuery([]));
  Connection.findOne.mockResolvedValue(null);
});

describe("sendRequest", () => {
  it("rejects connecting with yourself (400)", async () => {
    const id = validId();
    const req = { params: { userId: id }, user: { _id: id, name: "Viewer" } };
    const res = mockRes();

    await sendRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("404s when the target user doesn't exist", async () => {
    User.findById.mockReturnValue(mockQuery(null));
    const req = { params: { userId: validId() }, user: { _id: validId(), name: "Viewer" } };
    const res = mockRes();

    await sendRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("refuses to request a deactivated account (403)", async () => {
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: false }));
    const req = { params: { userId: validId() }, user: { _id: validId(), name: "Viewer" } };
    const res = mockRes();

    await sendRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Connection.create).not.toHaveBeenCalled();
  });

  it("creates a pending connection and notifies the target when none exists", async () => {
    const targetId = validId();
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    Connection.findOne.mockResolvedValue(null);
    Connection.create.mockResolvedValue({ _id: validId() });

    const req = { params: { userId: targetId }, user: { _id: validId(), name: "Alice" } };
    const res = mockRes();

    await sendRequest(req, res);

    expect(Connection.create).toHaveBeenCalledWith(
      expect.objectContaining({ requester: req.user._id, recipient: targetId })
    );
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: targetId, type: "connection_request" })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("409s when a request is already pending from me", async () => {
    const myId = validId();
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    Connection.findOne.mockResolvedValue(fakeConnectionDoc({ status: "pending", requester: myId }));

    const req = { params: { userId: validId() }, user: { _id: myId, name: "Alice" } };
    const res = mockRes();

    await sendRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(Connection.create).not.toHaveBeenCalled();
  });

  it("auto-accepts when the target already sent ME a pending request", async () => {
    const myId = validId();
    const theirId = validId();
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    const existing = fakeConnectionDoc({ status: "pending", requester: theirId, recipient: myId });
    Connection.findOne.mockResolvedValue(existing);

    const req = { params: { userId: theirId }, user: { _id: myId, name: "Alice" } };
    const res = mockRes();

    await sendRequest(req, res);

    expect(existing.status).toBe("accepted");
    expect(existing.save).toHaveBeenCalled();
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: theirId, type: "connection_accepted" })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "accepted" }));
  });

  it("409s when already connected", async () => {
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    Connection.findOne.mockResolvedValue(fakeConnectionDoc({ status: "accepted" }));

    const req = { params: { userId: validId() }, user: { _id: validId(), name: "Alice" } };
    const res = mockRes();

    await sendRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("403s with a distinct message when I blocked them", async () => {
    const myId = validId();
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    Connection.findOne.mockResolvedValue(fakeConnectionDoc({ status: "blocked", blockedBy: myId }));

    const req = { params: { userId: validId() }, user: { _id: myId, name: "Alice" } };
    const res = mockRes();

    await sendRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/unblock/i) }));
  });

  it("403s when they blocked me", async () => {
    const myId = validId();
    const theirId = validId();
    User.findById.mockReturnValue(mockQuery({ role: "jobseeker", isActive: true }));
    Connection.findOne.mockResolvedValue(fakeConnectionDoc({ status: "blocked", blockedBy: theirId }));

    const req = { params: { userId: theirId }, user: { _id: myId, name: "Alice" } };
    const res = mockRes();

    await sendRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("acceptRequest / rejectRequest / cancelRequest", () => {
  it("acceptRequest: only the recipient may accept (403 otherwise)", async () => {
    const doc = fakeConnectionDoc({ status: "pending", recipient: validId() });
    Connection.findById.mockResolvedValue(doc);

    const req = { params: { connectionId: doc._id }, user: { _id: validId(), name: "Someone else" } };
    const res = mockRes();

    await acceptRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it("acceptRequest: recipient accepting succeeds and notifies the requester", async () => {
    const requesterId = validId();
    const recipientId = validId();
    const doc = fakeConnectionDoc({ status: "pending", requester: requesterId, recipient: recipientId });
    Connection.findById.mockResolvedValue(doc);

    const req = { params: { connectionId: doc._id }, user: { _id: recipientId, name: "Bob" } };
    const res = mockRes();

    await acceptRequest(req, res);

    expect(doc.status).toBe("accepted");
    expect(doc.save).toHaveBeenCalled();
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: requesterId, type: "connection_accepted" })
    );
  });

  it("rejectRequest: only the recipient may reject; success deletes the record", async () => {
    const recipientId = validId();
    const doc = fakeConnectionDoc({ status: "pending", recipient: recipientId });
    Connection.findById.mockResolvedValue(doc);

    const req = { params: { connectionId: doc._id }, user: { _id: recipientId } };
    const res = mockRes();

    await rejectRequest(req, res);

    expect(doc.deleteOne).toHaveBeenCalled();
  });

  it("cancelRequest: only the requester may cancel (403 otherwise)", async () => {
    const doc = fakeConnectionDoc({ status: "pending", requester: validId() });
    Connection.findById.mockResolvedValue(doc);

    const req = { params: { connectionId: doc._id }, user: { _id: validId() } };
    const res = mockRes();

    await cancelRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(doc.deleteOne).not.toHaveBeenCalled();
  });
});

describe("removeConnection", () => {
  it("403s if the caller isn't a party to the connection", async () => {
    const doc = fakeConnectionDoc({ status: "accepted", requester: validId(), recipient: validId() });
    Connection.findById.mockResolvedValue(doc);

    const req = { params: { connectionId: doc._id }, user: { _id: validId() } };
    const res = mockRes();

    await removeConnection(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("either party can remove an accepted connection", async () => {
    const recipientId = validId();
    const doc = fakeConnectionDoc({ status: "accepted", requester: validId(), recipient: recipientId });
    Connection.findById.mockResolvedValue(doc);

    const req = { params: { connectionId: doc._id }, user: { _id: recipientId } };
    const res = mockRes();

    await removeConnection(req, res);

    expect(doc.deleteOne).toHaveBeenCalled();
  });
});

describe("blockUser / unblockUser", () => {
  it("blockUser creates a new blocked record when no relationship exists", async () => {
    Connection.findOne.mockResolvedValue(null);
    Connection.create.mockResolvedValue(fakeConnectionDoc({ status: "blocked" }));

    const myId = validId();
    const req = { params: { userId: validId() }, user: { _id: myId } };
    const res = mockRes();

    await blockUser(req, res);

    expect(Connection.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "blocked", blockedBy: myId })
    );
  });

  it("blockUser converts an existing connection to blocked", async () => {
    const doc = fakeConnectionDoc({ status: "accepted" });
    Connection.findOne.mockResolvedValue(doc);

    const myId = validId();
    const req = { params: { userId: validId() }, user: { _id: myId } };
    const res = mockRes();

    await blockUser(req, res);

    expect(doc.status).toBe("blocked");
    expect(doc.blockedBy).toBe(myId);
    expect(doc.save).toHaveBeenCalled();
    expect(Connection.create).not.toHaveBeenCalled();
  });

  it("unblockUser: only the blocker may unblock (403 otherwise)", async () => {
    const doc = fakeConnectionDoc({ status: "blocked", blockedBy: validId() });
    Connection.findOne.mockResolvedValue(doc);

    const req = { params: { userId: validId() }, user: { _id: validId() } };
    const res = mockRes();

    await unblockUser(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(doc.deleteOne).not.toHaveBeenCalled();
  });

  it("unblockUser: the blocker unblocking deletes the record", async () => {
    const myId = validId();
    const doc = fakeConnectionDoc({ status: "blocked", blockedBy: myId });
    Connection.findOne.mockResolvedValue(doc);

    const req = { params: { userId: validId() }, user: { _id: myId } };
    const res = mockRes();

    await unblockUser(req, res);

    expect(doc.deleteOne).toHaveBeenCalled();
  });
});

describe("getConnectionStatus", () => {
  it("returns SELF when checking your own id", async () => {
    const id = validId();
    const req = { params: { userId: id }, user: { _id: id } };
    const res = mockRes();

    await getConnectionStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "SELF" }));
  });

  it("returns NONE when no relationship exists", async () => {
    Connection.findOne.mockResolvedValue(null);
    const req = { params: { userId: validId() }, user: { _id: validId() } };
    const res = mockRes();

    await getConnectionStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "NONE" }));
  });

  it("returns PENDING_SENT when I am the requester", async () => {
    const myId = validId();
    Connection.findOne.mockResolvedValue(fakeConnectionDoc({ status: "pending", requester: myId }));
    const req = { params: { userId: validId() }, user: { _id: myId } };
    const res = mockRes();

    await getConnectionStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING_SENT" }));
  });

  it("returns PENDING_RECEIVED when I am the recipient", async () => {
    const myId = validId();
    Connection.findOne.mockResolvedValue(fakeConnectionDoc({ status: "pending", requester: validId(), recipient: myId }));
    const req = { params: { userId: validId() }, user: { _id: myId } };
    const res = mockRes();

    await getConnectionStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING_RECEIVED" }));
  });

  it("returns CONNECTED for an accepted connection", async () => {
    Connection.findOne.mockResolvedValue(fakeConnectionDoc({ status: "accepted" }));
    const req = { params: { userId: validId() }, user: { _id: validId() } };
    const res = mockRes();

    await getConnectionStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "CONNECTED" }));
  });

  it("distinguishes BLOCKED_BY_ME from BLOCKED_BY_THEM", async () => {
    const myId = validId();
    Connection.findOne.mockResolvedValue(fakeConnectionDoc({ status: "blocked", blockedBy: myId }));
    const req = { params: { userId: validId() }, user: { _id: myId } };
    const res = mockRes();

    await getConnectionStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "BLOCKED_BY_ME" }));
  });
});

describe("getPendingReceived", () => {
  it("includes each row's connectionId so the UI can accept/reject without a second lookup", async () => {
    const myId = validId();
    const otherId = validId();
    const connId = validId();
    Connection.find.mockReturnValue(
      mockQuery([{ _id: connId, requester: otherId, recipient: myId, status: "pending" }])
    );
    Connection.countDocuments.mockResolvedValue(1);
    User.find.mockReturnValue(mockQuery([{ _id: otherId, name: "Bob", role: "jobseeker" }]));

    const req = { query: {}, user: { _id: myId } };
    const res = mockRes();

    await getPendingReceived(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        people: [expect.objectContaining({ _id: otherId, connectionId: String(connId) })],
        total: 1,
      })
    );
  });
});

describe("getMyConnections", () => {
  it("returns people and pagination shaped from the aggregation result", async () => {
    const otherId = validId();
    Connection.aggregate.mockResolvedValue([
      { data: [{ user: { _id: otherId, name: "Alice", role: "jobseeker" } }], totalCount: [{ count: 1 }] },
    ]);

    const req = { query: { page: "1" }, user: { _id: validId() } };
    const res = mockRes();

    await getMyConnections(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        people: [expect.objectContaining({ _id: otherId, name: "Alice" })],
        total: 1,
        page: 1,
      })
    );
  });

  it("returns an empty, well-formed page when the viewer has no connections", async () => {
    Connection.aggregate.mockResolvedValue([{ data: [], totalCount: [] }]);
    const req = { query: {}, user: { _id: validId() } };
    const res = mockRes();

    await getMyConnections(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ people: [], total: 0, totalPages: 1 })
    );
  });

  it("passes a search term through to the aggregation pipeline as a case-insensitive name filter", async () => {
    Connection.aggregate.mockResolvedValue([{ data: [], totalCount: [] }]);
    const req = { query: { q: "ali" }, user: { _id: validId() } };
    const res = mockRes();

    await getMyConnections(req, res);

    const pipeline = Connection.aggregate.mock.calls[0][0];
    const searchStage = pipeline.find((stage) => stage.$match?.["user.name"]);
    expect(searchStage.$match["user.name"]).toEqual(expect.objectContaining({ $regex: "ali", $options: "i" }));
  });
});
