jest.mock("../models/Application");
jest.mock("../models/Assessment");
jest.mock("../models/User");
jest.mock("../models/NotificationSettings");
jest.mock("../models/Follow");
jest.mock("../utils/sendNotifications");
jest.mock("../utils/sendMail");

const Application = require("../models/Application");
const Assessment = require("../models/Assessment");
const sendMail = require("../utils/sendMail");

const { previewApplicationEmail } = require("../controllers/employerController");
const { buildInterviewScheduledEmailContent } = require("../services/interviewEmailService");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("previewApplicationEmail — no template drift between preview and real send", () => {
  it("renders the exact same subject/html for a schedule_interview preview as the real send path would produce", async () => {
    const application = {
      _id: "app1",
      job: { _id: "job1", title: "Engineer", employer: { _id: "emp1", name: "Alpha Corp" } },
      applicant: { _id: "cand1", name: "Candidate", email: "candidate@example.com" },
    };
    Application.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(application) }),
    });

    const interviewArgs = {
      scheduledAt: "2026-10-01T05:00:00.000Z",
      duration: 45,
      mode: "Video Call",
      type: "Technical Interview",
      meetingLink: "https://meet.google.com/xyz",
    };

    const req = {
      params: { applicationId: "app1" },
      user: { id: "emp1" },
      body: { action: "schedule_interview", customMessage: "Looking forward to it!", interview: interviewArgs },
    };
    const res = mockRes();

    await previewApplicationEmail(req, res);

    expect(res.json).toHaveBeenCalled();
    const previewPayload = res.json.mock.calls[0][0];

    // What the REAL send path would produce for the identical inputs.
    const realContent = buildInterviewScheduledEmailContent({
      candidateName: "Candidate",
      companyName: "Alpha Corp",
      jobTitle: "Engineer",
      ...interviewArgs,
      timezone: "Asia/Kathmandu",
      customMessage: "Looking forward to it!",
    });

    expect(previewPayload.subject).toBe(realContent.subject);
    expect(previewPayload.html).toBe(realContent.html);
    expect(previewPayload.text).toBe(realContent.text);
    expect(previewPayload.to).toBe("candidate@example.com");
    // Preview must never actually send mail or persist anything.
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("returns 403 when the requesting employer does not own the application's job", async () => {
    const application = {
      _id: "app1",
      job: { _id: "job1", title: "Engineer", employer: { _id: "someone-else", name: "Alpha Corp" } },
      applicant: { _id: "cand1", name: "Candidate", email: "candidate@example.com" },
    };
    Application.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(application) }),
    });

    const req = {
      params: { applicationId: "app1" },
      user: { id: "emp1" },
      body: { action: "status_change", status: "Accepted" },
    };
    const res = mockRes();

    await previewApplicationEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 403 previewing an assign_assessment email for an assessment owned by another employer", async () => {
    const application = {
      _id: "app1",
      job: { _id: "job1", title: "Engineer", employer: { _id: "emp1", name: "Alpha Corp" } },
      applicant: { _id: "cand1", name: "Candidate", email: "candidate@example.com" },
    };
    Application.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(application) }),
    });
    Assessment.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ employer: "someone-else", deadline: new Date() }),
    });

    const req = {
      params: { applicationId: "app1" },
      user: { id: "emp1" },
      body: { action: "assign_assessment", assessmentId: "assess1" },
    };
    const res = mockRes();

    await previewApplicationEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
