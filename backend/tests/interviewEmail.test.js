jest.mock("../models/Application");
jest.mock("../models/Job");
jest.mock("../models/User");
jest.mock("../utils/sendMail");
jest.mock("../utils/sendNotifications");

const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const sendMail = require("../utils/sendMail");
const sendNotification = require("../utils/sendNotifications");

const {
  formatInterviewDateTime,
  sendInterviewScheduledEmail,
  sendInterviewRescheduledEmail,
  sendInterviewCancelledEmail,
  sendInterviewReminderEmail,
} = require("../services/interviewEmailService");

const {
  updateApplication,
  resendInterviewEmail,
} = require("../controllers/employerController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Interview Scheduling & Email Flow Tests", () => {
  describe("1. Timezone & DateTime Formatting (Nepal Time NPT)", () => {
    it("converts UTC timestamps correctly to Nepal Time (Asia/Kathmandu, UTC+5:45)", () => {
      // 2026-09-22T04:45:00.000Z in UTC is exactly 10:30 AM in Nepal (UTC+5:45)
      const utcDate = new Date("2026-09-22T04:45:00.000Z");
      const formatted = formatInterviewDateTime(utcDate);

      expect(formatted.date).toBe("22 September 2026");
      expect(formatted.time).toBe("10:30 AM");
      expect(formatted.timezone).toBe("Nepal Time (NPT)");
      expect(formatted.fullFormatted).toContain("22 September 2026 at 10:30 AM (Nepal Time (NPT))");
    });
  });

  describe("2. Branded Email Templates", () => {
    it("generates correct subject, meeting link, and details for scheduled interview", async () => {
      sendMail.mockResolvedValue({ messageId: "test-123" });

      const result = await sendInterviewScheduledEmail({
        recipient: "candidate@example.com",
        candidateName: "Aayush Sharma",
        companyName: "Tech Innovators Nepal",
        jobTitle: "Senior React Developer",
        scheduledAt: "2026-09-22T04:45:00.000Z",
        duration: 45,
        mode: "Video Call",
        meetingLink: "https://meet.google.com/abc-defg-hij",
        notes: "Please have a code editor ready.",
        applicationId: "app123",
      });

      expect(result.success).toBe(true);
      expect(sendMail).toHaveBeenCalledTimes(1);

      const [recipient, subject, text, html] = sendMail.mock.calls[0];
      expect(recipient).toBe("candidate@example.com");
      expect(subject).toBe("Interview Scheduled — Senior React Developer at Tech Innovators Nepal");
      expect(text).toContain("Date: 22 September 2026");
      expect(text).toContain("Time: 10:30 AM");
      expect(text).toContain("Timezone: Nepal Time (NPT)");
      expect(text).toContain("Duration: 45 minutes");
      expect(text).toContain("Meeting Link: https://meet.google.com/abc-defg-hij");
      expect(html).toContain("Join Interview");
      expect(html).toContain("Tech Innovators Nepal");
    });

    it("inserts an employer customMessage into both text and html without dropping boilerplate", async () => {
      sendMail.mockResolvedValue({ messageId: "test-124" });

      await sendInterviewScheduledEmail({
        recipient: "candidate@example.com",
        candidateName: "Aayush Sharma",
        companyName: "Tech Innovators Nepal",
        jobTitle: "Senior React Developer",
        scheduledAt: "2026-09-22T04:45:00.000Z",
        duration: 45,
        mode: "Video Call",
        type: "Technical Interview",
        meetingLink: "https://meet.google.com/abc-defg-hij",
        customMessage: "Please review our take-home exercise beforehand.",
        applicationId: "app123",
      });

      const [, subject, text, html] = sendMail.mock.calls[0];
      expect(subject).toBe("Technical Interview Scheduled — Senior React Developer at Tech Innovators Nepal");
      expect(text).toContain("Please review our take-home exercise beforehand.");
      expect(text).toContain("Duration: 45 minutes");
      expect(html).toContain("A note from the employer");
      expect(html).toContain("Please review our take-home exercise beforehand.");
      expect(html).toContain("Join Interview");
    });

    it("respects a per-interview timezone instead of the hardcoded Nepal Time default", () => {
      const utcDate = new Date("2026-09-22T04:45:00.000Z");
      const formatted = formatInterviewDateTime(utcDate, "UTC");
      expect(formatted.timezone).toBe("Coordinated Universal Time (UTC)");
      expect(formatted.time).toBe("4:45 AM");
    });

    it("sends a 24h interview reminder email with the correct subject/body phrasing", async () => {
      sendMail.mockResolvedValue({ messageId: "reminder-24h" });

      const result = await sendInterviewReminderEmail({
        recipient: "candidate@example.com",
        candidateName: "Aayush Sharma",
        companyName: "Tech Innovators Nepal",
        jobTitle: "Senior React Developer",
        scheduledAt: "2026-09-22T04:45:00.000Z",
        duration: 30,
        mode: "Video Call",
        applicationId: "app123",
        reminderWindow: "24h",
      });

      expect(result.success).toBe(true);
      const [, subject, text] = sendMail.mock.calls[0];
      expect(subject).toContain("Tomorrow");
      expect(text).toContain("is tomorrow");
      expect(sendMail.mock.calls[0][4]).toEqual(
        expect.objectContaining({ type: "interview_reminder", relatedApplication: "app123" })
      );
    });

    it("sends a 1h interview reminder email with the correct subject/body phrasing", async () => {
      sendMail.mockResolvedValue({ messageId: "reminder-1h" });

      const result = await sendInterviewReminderEmail({
        recipient: "candidate@example.com",
        candidateName: "Aayush Sharma",
        companyName: "Tech Innovators Nepal",
        jobTitle: "Senior React Developer",
        scheduledAt: "2026-09-22T04:45:00.000Z",
        duration: 30,
        mode: "Video Call",
        applicationId: "app123",
        reminderWindow: "1h",
      });

      expect(result.success).toBe(true);
      const [, subject, text] = sendMail.mock.calls[0];
      expect(subject).toContain("1 Hour");
      expect(text).toContain("starts in 1 hour");
    });
  });

  describe("3. updateApplication Controller — Schedule Interview Flow", () => {
    it("successfully schedules interview, populates company, sends email, and returns honest status", async () => {
      const mockApp = {
        _id: "app123",
        status: "Pending",
        job: {
          _id: "job123",
          title: "Full Stack Engineer",
          employer: {
            _id: "emp123",
            name: "Alpha Corp",
          },
        },
        applicant: {
          _id: "user123",
          name: "Suman Shrestha",
          email: "suman@example.com",
          isActive: true,
        },
        interview: {},
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };

      Application.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockApp),
        }),
      });
      sendMail.mockResolvedValue({ messageId: "mail-999" });

      const req = {
        params: { applicationId: "app123" },
        user: { id: "emp123" },
        body: {
          status: "Interview Scheduled",
          interview: {
            scheduledAt: "2026-09-25T08:15:00.000Z",
            duration: 30,
            mode: "Video Call",
            meetingLink: "https://zoom.us/j/123456",
            notes: "Initial technical screening",
          },
        },
      };
      const res = mockRes();

      await updateApplication(req, res);

      expect(mockApp.status).toBe("Interview Scheduled");
      expect(mockApp.interview.emailStatus).toBe("sent");
      expect(mockApp.save).toHaveBeenCalled();
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "user123",
          type: "interview_scheduled",
          message: expect.stringContaining("Alpha Corp"),
        })
      );
      expect(sendMail).toHaveBeenCalledWith(
        "suman@example.com",
        "Interview Scheduled — Full Stack Engineer at Alpha Corp",
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          email: expect.objectContaining({
            sent: true,
            recipient: "suman@example.com",
          }),
        })
      );
    });

    it("rejects unauthorized employer attempting to schedule interview", async () => {
      const mockApp = {
        _id: "app123",
        job: {
          employer: { _id: "other_employer" },
        },
        applicant: { email: "test@example.com" },
      };

      Application.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockApp),
        }),
      });

      const req = {
        params: { applicationId: "app123" },
        user: { id: "unauthorized_emp" },
        body: {
          status: "Interview Scheduled",
          interview: { scheduledAt: "2026-09-25T08:15:00.000Z" },
        },
      };
      const res = mockRes();

      await updateApplication(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("preserves interview record when email delivery fails and reports delivery failure honestly", async () => {
      const mockApp = {
        _id: "app123",
        status: "Pending",
        job: {
          _id: "job123",
          title: "UI Designer",
          employer: { _id: "emp123", name: "Design Studio" },
        },
        applicant: {
          _id: "user123",
          name: "Rina Rai",
          email: "rina@example.com",
          isActive: true,
        },
        interview: {},
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };

      Application.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockApp),
        }),
      });
      // Simulate SMTP connection failure
      sendMail.mockRejectedValue(new Error("SMTP connection timeout"));

      const req = {
        params: { applicationId: "app123" },
        user: { id: "emp123" },
        body: {
          status: "Interview Scheduled",
          interview: {
            scheduledAt: "2026-09-25T08:15:00.000Z",
            mode: "Phone Call",
          },
        },
      };
      const res = mockRes();

      await updateApplication(req, res);

      // Interview must still be saved
      expect(mockApp.status).toBe("Interview Scheduled");
      expect(mockApp.interview.emailStatus).toBe("failed");
      expect(mockApp.interview.emailError).toContain("SMTP connection timeout");
      expect(mockApp.save).toHaveBeenCalled();
      // In-app notification still delivered
      expect(sendNotification).toHaveBeenCalled();

      // Response reports honest email delivery failure
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          email: expect.objectContaining({
            sent: false,
            recipient: "rina@example.com",
          }),
        })
      );
    });

    it("handles missing candidate email gracefully without crashing", async () => {
      const mockApp = {
        _id: "app123",
        status: "Pending",
        job: {
          _id: "job123",
          title: "Data Analyst",
          employer: { _id: "emp123", name: "Analytics Co" },
        },
        applicant: {
          _id: "user123",
          name: "Anonymous User",
          email: "", // Missing email
          isActive: true,
        },
        interview: {},
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };

      Application.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockApp),
        }),
      });

      const req = {
        params: { applicationId: "app123" },
        user: { id: "emp123" },
        body: {
          status: "Interview Scheduled",
          interview: { scheduledAt: "2026-09-25T08:15:00.000Z" },
        },
      };
      const res = mockRes();

      await updateApplication(req, res);

      expect(mockApp.status).toBe("Interview Scheduled");
      expect(mockApp.interview.emailStatus).toBe("failed");
      expect(mockApp.interview.emailError).toContain("Candidate email address not found");
      expect(sendMail).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          email: expect.objectContaining({
            sent: false,
          }),
        })
      );
    });

    it("sends 'Interview Rescheduled' email when updating an already-scheduled interview", async () => {
      const mockApp = {
        _id: "app123",
        status: "Interview Scheduled",
        job: {
          _id: "job123",
          title: "DevOps Engineer",
          employer: { _id: "emp123", name: "Cloud Tech" },
        },
        applicant: {
          _id: "user123",
          name: "Bikash Thapa",
          email: "bikash@example.com",
          isActive: true,
        },
        interview: {
          scheduledAt: new Date("2026-09-22T04:45:00.000Z"),
          mode: "Video Call",
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Application.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockApp),
        }),
      });
      sendMail.mockResolvedValue({ messageId: "resched-123" });

      const req = {
        params: { applicationId: "app123" },
        user: { id: "emp123" },
        body: {
          status: "Interview Scheduled",
          interview: {
            scheduledAt: "2026-09-26T06:00:00.000Z",
            mode: "Video Call",
            meetingLink: "https://meet.google.com/new-link",
          },
        },
      };
      const res = mockRes();

      await updateApplication(req, res);

      expect(sendMail).toHaveBeenCalledWith(
        "bikash@example.com",
        "Interview Rescheduled — DevOps Engineer at Cloud Tech",
        expect.stringContaining("rescheduled to a new time"),
        expect.any(String),
        expect.any(Object)
      );
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "interview_rescheduled",
        })
      );
    });

    it("sends 'Interview Cancelled' email when an active interview is cancelled/rejected", async () => {
      const mockApp = {
        _id: "app123",
        status: "Interview Scheduled",
        job: {
          _id: "job123",
          title: "QA Engineer",
          employer: { _id: "emp123", name: "Test Corp" },
        },
        applicant: {
          _id: "user123",
          name: "Sita Sharma",
          email: "sita@example.com",
          isActive: true,
        },
        interview: {
          scheduledAt: new Date("2026-09-22T04:45:00.000Z"),
        },
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };

      Application.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockApp),
        }),
      });
      sendMail.mockResolvedValue({ messageId: "cancel-123" });

      const req = {
        params: { applicationId: "app123" },
        user: { id: "emp123" },
        body: {
          status: "Rejected",
        },
      };
      const res = mockRes();

      await updateApplication(req, res);

      expect(sendMail).toHaveBeenCalledWith(
        "sita@example.com",
        "Interview Cancelled — QA Engineer at Test Corp",
        expect.stringContaining("cancelled"),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe("4. resendInterviewEmail Endpoint", () => {
    it("resends interview email and updates delivery status", async () => {
      const mockApp = {
        _id: "app123",
        status: "Interview Scheduled",
        job: {
          _id: "job123",
          title: "Product Manager",
          employer: { _id: "emp123", name: "Apex Solutions" },
        },
        applicant: {
          _id: "user123",
          name: "Prashant Karki",
          email: "prashant@example.com",
          isActive: true,
        },
        interview: {
          scheduledAt: new Date("2026-09-28T05:00:00.000Z"),
          duration: 30,
          mode: "Video Call",
          meetingLink: "https://meet.google.com/pm-interview",
          emailStatus: "failed",
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Application.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockApp),
        }),
      });
      sendMail.mockResolvedValue({ messageId: "retry-1" });

      const req = {
        params: { applicationId: "app123" },
        user: { id: "emp123" },
      };
      const res = mockRes();

      await resendInterviewEmail(req, res);

      expect(sendMail).toHaveBeenCalledWith(
        "prashant@example.com",
        "Interview Scheduled — Product Manager at Apex Solutions",
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
      expect(mockApp.interview.emailStatus).toBe("sent");
      expect(mockApp.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          email: expect.objectContaining({
            sent: true,
            recipient: "prashant@example.com",
          }),
        })
      );
    });

    it("returns 400 when application does not have an active scheduled interview", async () => {
      const mockApp = {
        _id: "app123",
        status: "Reviewed", // Not Interview Scheduled
        job: { employer: { _id: "emp123" } },
        applicant: { email: "candidate@example.com" },
      };

      Application.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockApp),
        }),
      });

      const req = {
        params: { applicationId: "app123" },
        user: { id: "emp123" },
      };
      const res = mockRes();

      await resendInterviewEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(sendMail).not.toHaveBeenCalled();
    });
  });
});
