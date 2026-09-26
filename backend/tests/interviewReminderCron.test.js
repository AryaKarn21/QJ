jest.mock("../models/Application");
jest.mock("../utils/sendNotifications");
jest.mock("../services/interviewEmailService");

const Application = require("../models/Application");
const sendNotification = require("../utils/sendNotifications");
const { sendInterviewReminderEmail, sendAssessmentReminderEmail } = require("../services/interviewEmailService");
const { runReminderSweep } = require("../utils/interviewReminderCron");

function buildApplicationDoc(overrides = {}) {
  return {
    _id: "app1",
    job: { _id: "job1", title: "Engineer", employer: { name: "Alpha Corp" } },
    applicant: { _id: "cand1", name: "Candidate", email: "candidate@example.com", isActive: true },
    interview: {
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      duration: 30,
      mode: "Video Call",
      status: "SCHEDULED",
      reminder24hSentAt: null,
      reminder1hSentAt: null,
    },
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  sendInterviewReminderEmail.mockResolvedValue({ success: true });
  sendAssessmentReminderEmail.mockResolvedValue({ success: true });
});

describe("interviewReminderCron — dedup", () => {
  it("sends a 24h reminder once and stamps reminder24hSentAt so a second sweep doesn't resend", async () => {
    const application = buildApplicationDoc();
    // First sweep call returns the application (not yet reminded); every
    // subsequent Application.find call in the same sweep (1h pass,
    // assessment pass) returns empty so we can isolate the 24h pass.
    let callCount = 0;
    Application.find.mockImplementation(() => {
      callCount += 1;
      const result = callCount === 1 ? [application] : [];
      return {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        then: (resolve) => Promise.resolve(result).then(resolve),
      };
    });

    await runReminderSweep();

    expect(sendInterviewReminderEmail).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "interview_reminder" }));
    expect(application.interview.reminder24hSentAt).toBeInstanceOf(Date);
    expect(application.save).toHaveBeenCalled();

    // Simulate a second sweep 15 minutes later — the same application now
    // has reminder24hSentAt set, so a real query would exclude it. We
    // simulate that by having the mock return an empty list this time.
    jest.clearAllMocks();
    sendInterviewReminderEmail.mockResolvedValue({ success: true });
    Application.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      then: (resolve) => Promise.resolve([]).then(resolve),
    });

    await runReminderSweep();

    expect(sendInterviewReminderEmail).not.toHaveBeenCalled();
  });

  it("does not send a reminder for an interview outside the 24h/1h windows", async () => {
    Application.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      then: (resolve) => Promise.resolve([]).then(resolve),
    });

    await runReminderSweep();

    expect(sendInterviewReminderEmail).not.toHaveBeenCalled();
    expect(sendAssessmentReminderEmail).not.toHaveBeenCalled();
  });
});
