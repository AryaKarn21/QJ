jest.mock("../models/Assessment");
jest.mock("../models/AssessmentAttempt");
jest.mock("../models/Application");
jest.mock("../models/Job");
jest.mock("../utils/sendNotifications");
jest.mock("../services/interviewEmailService");

const Assessment = require("../models/Assessment");
const AssessmentAttempt = require("../models/AssessmentAttempt");
const Application = require("../models/Application");
const Job = require("../models/Job");
const sendNotification = require("../utils/sendNotifications");
const { sendAssessmentRequestEmail } = require("../services/interviewEmailService");

const {
  createAssessment,
  assignAssessment,
  getAssessmentForCandidate,
  startAttempt,
} = require("../controllers/assessmentController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("assessmentController — createAssessment validation", () => {
  it("rejects an mcq question with zero correct options marked", async () => {
    Job.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ employer: "emp1", title: "Job" }) });

    const req = {
      user: { id: "emp1" },
      body: {
        jobId: "job1",
        title: "Screening",
        duration: 30,
        deadline: "2026-12-01",
        questions: [
          { type: "mcq", questionText: "2+2?", options: ["3", "4"], correctOptionIndexes: [] },
        ],
      },
    };
    const res = mockRes();

    await createAssessment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Assessment.create).not.toHaveBeenCalled();
  });

  it("rejects an mcq question whose correctOptionIndexes point outside the options array", async () => {
    Job.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ employer: "emp1", title: "Job" }) });

    const req = {
      user: { id: "emp1" },
      body: {
        jobId: "job1",
        title: "Screening",
        duration: 30,
        deadline: "2026-12-01",
        questions: [
          { type: "mcq", questionText: "2+2?", options: ["3", "4"], correctOptionIndexes: [5] },
        ],
      },
    };
    const res = mockRes();

    await createAssessment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Assessment.create).not.toHaveBeenCalled();
  });

  it("accepts a valid mcq question with one correct option marked", async () => {
    Job.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ employer: "emp1", title: "Job" }) });
    Assessment.create.mockResolvedValue({ _id: "assess1" });

    const req = {
      user: { id: "emp1" },
      body: {
        jobId: "job1",
        title: "Screening",
        duration: 30,
        deadline: "2026-12-01",
        questions: [
          { type: "mcq", questionText: "2+2?", options: ["3", "4"], correctOptionIndexes: [1] },
        ],
      },
    };
    const res = mockRes();

    await createAssessment(req, res);

    expect(Assessment.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("assessmentController — assignAssessment", () => {
  const buildApplication = () => ({
    _id: "app1",
    job: { _id: "job1", title: "Engineer", employer: { _id: "emp1", name: "Alpha Corp" } },
    applicant: { _id: "cand1", name: "Candidate", email: "candidate@example.com" },
    assessment: {},
    statusHistory: [],
    save: jest.fn().mockResolvedValue(true),
  });

  it("threads the employer's customMessage into the assessment request email", async () => {
    Assessment.findById.mockResolvedValue({ _id: "assess1", employer: "emp1", job: "job1", deadline: new Date("2026-12-01"), isActive: true });
    const application = buildApplication();
    Application.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(application) }),
    });
    sendAssessmentRequestEmail.mockResolvedValue({ success: true });

    const req = {
      params: { id: "assess1" },
      user: { id: "emp1" },
      body: { applicationId: "app1", customMessage: "Please finish before Friday." },
    };
    const res = mockRes();

    await assignAssessment(req, res);

    expect(sendAssessmentRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({ customMessage: "Please finish before Friday." })
    );
    expect(application.statusHistory[0].note).toBe("Please finish before Friday.");
  });

  it("rejects assigning an inactive assessment", async () => {
    Assessment.findById.mockResolvedValue({ _id: "assess1", employer: "emp1", isActive: false });

    const req = {
      params: { id: "assess1" },
      user: { id: "emp1" },
      body: { applicationId: "app1" },
    };
    const res = mockRes();

    await assignAssessment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendAssessmentRequestEmail).not.toHaveBeenCalled();
  });
});

describe("assessmentController — candidate access authorization", () => {
  it("returns 403 when the authenticated user is not the application's applicant", async () => {
    Application.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "app1",
        applicant: "cand1",
        assessment: { assessment: "assess1", accessToken: "real-token" },
      }),
    });

    const req = { params: { applicationId: "app1", token: "real-token" }, user: { id: "someone-else" } };
    const res = mockRes();

    await getAssessmentForCandidate(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 404 when the token doesn't match the application's stored accessToken", async () => {
    Application.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "app1",
        applicant: "cand1",
        assessment: { assessment: "assess1", accessToken: "real-token" },
      }),
    });

    const req = { params: { applicationId: "app1", token: "wrong-token" }, user: { id: "cand1" } };
    const res = mockRes();

    await getAssessmentForCandidate(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("assessmentController — startDate gating", () => {
  it("blocks starting an attempt before the assessment's startDate", async () => {
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    Application.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "app1",
        applicant: "cand1",
        assessment: { assessment: "assess1", accessToken: "tok", deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), attemptsUsed: 0, status: "assigned" },
        save: jest.fn().mockResolvedValue(true),
      }),
    });
    Assessment.findById.mockResolvedValue({ _id: "assess1", maxAttempts: 1, startDate: futureStart, duration: 30 });

    const req = { params: { applicationId: "app1", token: "tok" }, user: { id: "cand1" } };
    const res = mockRes();

    await startAttempt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(AssessmentAttempt.create).not.toHaveBeenCalled();
  });
});
