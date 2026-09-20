// Unit tests for the ProfileView system's business logic
// (backend/controllers/profileViewController.js). Mocks the Mongoose
// models rather than hitting a real DB, same approach as
// tests/connectionController.test.js — locks in the rules: no self-views,
// blocked pairs are skipped entirely, repeat views dedupe onto the same
// row instead of creating new ones, and only the FIRST view notifies.
const mongoose = require("mongoose");

jest.mock("../models/ProfileView");
jest.mock("../models/Connection");
jest.mock("../models/User");
jest.mock("../utils/sendNotifications", () => jest.fn());
jest.mock("../controllers/followController", () => ({
  PUBLIC_PROFILE_SELECT: "name role profilePic companyLogo headline",
  attachCurrentCompany: jest.fn((people) => Promise.resolve(people)),
}));

const ProfileView = require("../models/ProfileView");
const Connection = require("../models/Connection");
const User = require("../models/User");
const sendNotification = require("../utils/sendNotifications");
const {
  recordProfileView,
  getMyProfileViewers,
  getMyProfileViewCount,
} = require("../controllers/profileViewController");

function mockQuery(resolvedValue) {
  const q = {};
  ["select", "lean", "sort", "skip", "limit"].forEach((m) => {
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

beforeEach(() => {
  jest.clearAllMocks();
  Connection.findOne.mockReturnValue(mockQuery(null)); // not blocked, by default
});

describe("recordProfileView", () => {
  it("does not record a view of your own profile", async () => {
    const myId = validId();
    const req = { params: { userId: myId }, user: { _id: myId } };
    const res = mockRes();

    await recordProfileView(req, res);

    expect(ProfileView.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ recorded: false });
  });

  it("rejects an invalid user id with 400", async () => {
    const req = { params: { userId: "not-an-id" }, user: { _id: validId() } };
    const res = mockRes();

    await recordProfileView(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(ProfileView.create).not.toHaveBeenCalled();
  });

  it("does not record or notify when the pair is blocked", async () => {
    Connection.findOne.mockReturnValue(mockQuery({ _id: validId() }));
    const req = { params: { userId: validId() }, user: { _id: validId() } };
    const res = mockRes();

    await recordProfileView(req, res);

    expect(ProfileView.create).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ recorded: false });
  });

  it("creates a new record and notifies the profile owner on a first-ever view", async () => {
    const viewerId = validId();
    const profileId = validId();
    ProfileView.findOne.mockResolvedValue(null);
    ProfileView.create.mockResolvedValue({});
    const req = { params: { userId: profileId }, user: { _id: viewerId } };
    const res = mockRes();

    await recordProfileView(req, res);

    expect(ProfileView.create).toHaveBeenCalledWith({ viewer: viewerId, profile: profileId });
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: profileId, actor: viewerId, type: "profile_view" })
    );
    expect(res.json).toHaveBeenCalledWith({ recorded: true, firstView: true });
  });

  it("dedupes a repeat view onto the existing row without re-notifying", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    ProfileView.findOne.mockResolvedValue({ viewCount: 1, lastViewedAt: new Date(0), save });
    const req = { params: { userId: validId() }, user: { _id: validId() } };
    const res = mockRes();

    await recordProfileView(req, res);

    expect(ProfileView.create).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ recorded: true, firstView: false });
  });
});

describe("getMyProfileViewers", () => {
  it("returns a paginated, most-recent-first list scoped to the caller", async () => {
    const myId = validId();
    const viewerId = validId();
    ProfileView.find.mockReturnValue(mockQuery([{ viewer: viewerId, lastViewedAt: new Date(), viewCount: 2 }]));
    ProfileView.countDocuments.mockResolvedValue(1);
    User.find.mockReturnValue(mockQuery([{ _id: viewerId, name: "Jane Doe", role: "jobseeker" }]));

    const req = { user: { _id: myId }, query: {} };
    const res = mockRes();

    await getMyProfileViewers(req, res);

    expect(ProfileView.find).toHaveBeenCalledWith({ profile: myId });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, total: 1, totalPages: 1 })
    );
    const payload = res.json.mock.calls[0][0];
    expect(payload.viewers).toHaveLength(1);
    expect(payload.viewers[0]).toMatchObject({ _id: viewerId, viewCount: 2 });
  });

  it("drops rows whose viewer account no longer exists", async () => {
    const myId = validId();
    ProfileView.find.mockReturnValue(mockQuery([{ viewer: validId(), lastViewedAt: new Date(), viewCount: 1 }]));
    ProfileView.countDocuments.mockResolvedValue(1);
    User.find.mockReturnValue(mockQuery([])); // viewer account was deleted

    const req = { user: { _id: myId }, query: {} };
    const res = mockRes();

    await getMyProfileViewers(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.viewers).toHaveLength(0);
  });
});

describe("getMyProfileViewCount", () => {
  it("returns the total view-document count for the caller", async () => {
    ProfileView.countDocuments.mockResolvedValue(7);
    const req = { user: { _id: validId() } };
    const res = mockRes();

    await getMyProfileViewCount(req, res);

    expect(res.json).toHaveBeenCalledWith({ total: 7 });
  });
});
