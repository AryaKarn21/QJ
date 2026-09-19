// Unit tests for jobController.applyInJob's resume-storage error handling
// (POST /api/jobs/apply) — specifically the branch added alongside
// media.service.js's production Cloudinary-required guard: a resume
// upload that fails because cloud storage isn't configured must surface
// as a distinct 503, not the generic 500 every other unexpected error
// falls back to.
jest.mock("../models/Job");
jest.mock("../models/Application");
jest.mock("../models/User");
jest.mock("../services/media.service");
jest.mock("../utils/sendNotifications", () => jest.fn().mockResolvedValue(undefined));

const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");
const { persistUpload } = require("../services/media.service");

const { applyInJob } = require("../controllers/jobController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function baseReqRes() {
  const req = {
    body: { jobId: "job1", howDidYouHear: "Friend", coverLetter: "I'd love this role." },
    user: { id: "jobseeker1" },
    file: { buffer: Buffer.from("%PDF-1.4"), mimetype: "application/pdf" },
  };
  return { req, res: mockRes() };
}

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockResolvedValue({ _id: "jobseeker1", role: "jobseeker", name: "Jane Doe" });
  Job.findById.mockReturnValue({
    populate: jest.fn().mockResolvedValue({ _id: "job1", title: "QA Engineer", employer: null, deadline: null }),
  });
  Application.findOne.mockResolvedValue(null);
});

describe("applyInJob — resume storage failure", () => {
  it("returns 503 with a clear message when cloud storage is not configured", async () => {
    const err = new Error("File storage is not configured for production. Please contact support.");
    err.code = "CLOUD_STORAGE_NOT_CONFIGURED";
    persistUpload.mockRejectedValue(err);

    const { req, res } = baseReqRes();
    await applyInJob(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      message: "File storage is not configured for production. Please contact support.",
    });
    // Never silently "succeeds" — no Application document gets created
    // for an application whose resume was never actually persisted.
    expect(Application.prototype.save).not.toHaveBeenCalled();
  });

  it("still returns a generic 500 for an unrelated/unexpected upload error", async () => {
    persistUpload.mockRejectedValue(new Error("ECONNRESET"));

    const { req, res } = baseReqRes();
    await applyInJob(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
  });

  it("succeeds normally (201) when persistUpload resolves with a URL", async () => {
    persistUpload.mockResolvedValue("https://res.cloudinary.com/test-cloud/raw/upload/v1/qj/resumes/jobseeker1/abc.pdf");
    Application.prototype.save = jest.fn().mockResolvedValue(undefined);
    Job.findByIdAndUpdate.mockResolvedValue(undefined);

    const { req, res } = baseReqRes();
    await applyInJob(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("rejects with 400 before ever touching resume storage when no file is attached", async () => {
    const { req, res } = baseReqRes();
    req.file = undefined;

    await applyInJob(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(persistUpload).not.toHaveBeenCalled();
  });
});
