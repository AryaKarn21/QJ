jest.mock("../models/Application");
jest.mock("../models/Job");
jest.mock("../models/User");
jest.mock("../models/Assessment");
jest.mock("../models/AssessmentAttempt");
jest.mock("../models/NotificationSettings");
jest.mock("../models/Follow");
jest.mock("../models/EmailLog");
jest.mock("../utils/sendNotifications");
jest.mock("../utils/sendMail");

const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const Assessment = require("../models/Assessment");
const AssessmentAttempt = require("../models/AssessmentAttempt");
const NotificationSettings = require("../models/NotificationSettings");
const Follow = require("../models/Follow");
const EmailLog = require("../models/EmailLog");
const sendNotification = require("../utils/sendNotifications");
const sendMail = require("../utils/sendMail");

const {
  sendJobPostedEmail,
  sendApplicationStatusEmail,
  sendInterviewScheduledEmail,
  sendInterviewRescheduledEmail,
  sendInterviewCancelledEmail,
  sendInterviewReminderEmail,
  sendAssessmentAssignedEmail,
  sendAssessmentSubmittedEmail,
  sendApplicationSubmittedEmail,
  sendNewApplicationReceivedEmail,
} = require("../services/emailService");

const { notifyJobSeekersOfNewJob } = require("../utils/jobNotificationHelper");
const { updateApplication } = require("../controllers/employerController");
const { assignAssessment, submitAssessment } = require("../controllers/assessmentController");
const { updateApplicationStatus, approveJob } = require("../controllers/adminController");
const { sendTestEmail } = require("../controllers/emailLogController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("QUICKJOBS — Job Seeker Email Pipeline Verification", () => {
  describe("1. Job Posting Notification & Email Delivery", () => {
    it("notifies eligible job seekers with in-app notification AND branded email when a job is published", async () => {
      NotificationSettings.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ jobAlertMode: "matching" }),
      });

      const seekers = [
        {
          _id: "seeker1",
          name: "Bikash Shrestha",
          email: "bikash@example.com",
          location: "Kathmandu",
          notificationPreferences: { newJobs: true, emailAlerts: true },
        },
      ];
      User.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(seekers) });
      sendMail.mockResolvedValue({ messageId: "job-alert-123" });

      const mockJob = {
        _id: "job1",
        title: "Frontend Developer",
        location: "Kathmandu",
        jobtype: "Full-time",
        employer: "emp1",
        companyOverride: { name: "Nepal Tech" },
      };

      await notifyJobSeekersOfNewJob({ job: mockJob, employer: { name: "Nepal Tech" } });

      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "seeker1",
          type: "job_recommendation",
          message: 'New job "Frontend Developer" posted at Kathmandu',
          relatedJob: "job1",
        })
      );

      expect(sendMail).toHaveBeenCalledWith(
        "bikash@example.com",
        "New Job Opportunity — Frontend Developer",
        expect.stringContaining("A new job matching your profile has been posted on QuickJobs."),
        expect.stringContaining("Frontend Developer"),
        expect.objectContaining({ type: "job_alert", relatedJob: "job1" })
      );
    });
  });

  describe("2. Application Submission & Confirmation", () => {
    it("delivers confirmation email to applicant and new application notice to employer", async () => {
      sendMail.mockResolvedValue({ messageId: "app-confirm-123" });

      const seekerResult = await sendApplicationSubmittedEmail({
        recipient: "candidate@example.com",
        candidateName: "Sita Sharma",
        jobTitle: "Node.js Architect",
        companyName: "Cloud Innovations",
        applicationId: "app100",
        jobId: "job100",
      });

      expect(seekerResult.success).toBe(true);
      expect(sendMail).toHaveBeenCalledWith(
        "candidate@example.com",
        "Application Submitted — Node.js Architect",
        expect.stringContaining("Your application for \"Node.js Architect\" at Cloud Innovations has been submitted successfully."),
        expect.stringContaining("Track Application"),
        expect.objectContaining({ type: "application_confirmation", relatedApplication: "app100" })
      );

      const employerResult = await sendNewApplicationReceivedEmail({
        recipient: "employer@example.com",
        employerName: "Tech Boss",
        candidateName: "Sita Sharma",
        jobTitle: "Node.js Architect",
        applicationId: "app100",
        jobId: "job100",
      });

      expect(employerResult.success).toBe(true);
      expect(sendMail).toHaveBeenCalledWith(
        "employer@example.com",
        "New Application Received — Node.js Architect",
        expect.stringContaining("Sita Sharma has applied to your job posting \"Node.js Architect\"."),
        expect.stringContaining("Review Applicant"),
        expect.objectContaining({ type: "new_application_notice", relatedApplication: "app100" })
      );
    });
  });

  describe("3. Application Status Updates & Shortlisting", () => {
    it("delivers Shortlisted email and in-app notification when employer shortlists a candidate", async () => {
      const application = {
        _id: "app1",
        status: "Pending",
        statusHistory: [],
        job: { _id: "job1", title: "Full Stack Engineer", employer: { _id: "emp1", name: "QuickCorp" } },
        applicant: { _id: "cand1", name: "Rohan Verma", email: "rohan@example.com", isActive: true },
        save: jest.fn().mockResolvedValue(true),
      };

      Application.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(application) }),
      });
      sendMail.mockResolvedValue({ messageId: "shortlist-123" });

      const req = {
        params: { applicationId: "app1" },
        user: { id: "emp1" },
        body: { status: "Shortlisted", customMessage: "Your profile is impressive!" },
      };
      const res = mockRes();

      await updateApplication(req, res);

      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "cand1",
          type: "application_update",
          message: 'Your application for "Full Stack Engineer" has been shortlisted.',
        })
      );

      expect(sendMail).toHaveBeenCalledWith(
        "rohan@example.com",
        "Application Update — Full Stack Engineer",
        expect.stringContaining("Your application for Full Stack Engineer at QuickCorp has been shortlisted."),
        expect.stringContaining("View Application"),
        expect.objectContaining({ type: "application_status_update", relatedApplication: "app1" })
      );
    });

    it("sends Accepted email when candidate application is accepted", async () => {
      sendMail.mockResolvedValue({ messageId: "accepted-123" });

      const result = await sendApplicationStatusEmail({
        recipient: "candidate@example.com",
        candidateName: "Rohan Verma",
        companyName: "QuickCorp",
        jobTitle: "Full Stack Engineer",
        status: "Accepted",
        applicationId: "app1",
      });

      expect(result.success).toBe(true);
      const [, subject, text, html] = sendMail.mock.calls[0];
      expect(subject).toBe("Application Accepted — Full Stack Engineer at QuickCorp");
      expect(text).toContain("Congratulations! Your application for Full Stack Engineer at QuickCorp has been accepted.");
      expect(html).toContain("Application Accepted");
    });
  });

  describe("4. Interview Scheduling, Rescheduling, & Cancellation Emails", () => {
    it("delivers interview scheduling email with interviewer, date, time, timezone, and meeting link", async () => {
      sendMail.mockResolvedValue({ messageId: "interview-sched-123" });

      const result = await sendInterviewScheduledEmail({
        recipient: "candidate@example.com",
        candidateName: "Pooja Gurung",
        companyName: "Himalaya Software",
        jobTitle: "DevOps Engineer",
        scheduledAt: "2026-10-15T09:00:00.000Z",
        duration: 45,
        mode: "Video Call",
        type: "Technical Interview",
        interviewer: "Sundar Shrestha (Head of Engineering)",
        meetingLink: "https://meet.google.com/him-tech-ops",
        notes: "Please have your terminal and AWS CLI ready.",
        timezone: "Asia/Kathmandu",
        applicationId: "app200",
      });

      expect(result.success).toBe(true);
      const [recipient, subject, text, html] = sendMail.mock.calls[0];
      expect(recipient).toBe("candidate@example.com");
      expect(subject).toBe("Technical Interview Scheduled — DevOps Engineer at Himalaya Software");
      expect(text).toContain("Date: 15 October 2026");
      expect(text).toContain("Time: 2:45 PM");
      expect(text).toContain("Timezone: Nepal Time (NPT)");
      expect(text).toContain("Interviewer: Sundar Shrestha (Head of Engineering)");
      expect(text).toContain("Meeting Link: https://meet.google.com/him-tech-ops");
      expect(html).toContain("Sundar Shrestha (Head of Engineering)");
      expect(html).toContain("Join Interview");
    });

    it("delivers interview rescheduled email with previous and new schedules", async () => {
      sendMail.mockResolvedValue({ messageId: "resched-123" });

      const result = await sendInterviewRescheduledEmail({
        recipient: "candidate@example.com",
        candidateName: "Pooja Gurung",
        companyName: "Himalaya Software",
        jobTitle: "DevOps Engineer",
        scheduledAt: "2026-10-16T10:00:00.000Z",
        previousScheduledAt: "2026-10-15T09:00:00.000Z",
        duration: 45,
        mode: "Video Call",
        type: "Technical Interview",
        meetingLink: "https://meet.google.com/him-tech-ops",
        timezone: "Asia/Kathmandu",
        applicationId: "app200",
      });

      expect(result.success).toBe(true);
      const [, subject, text, html] = sendMail.mock.calls[0];
      expect(subject).toContain("Rescheduled");
      expect(text).toContain("Previous: 15 October 2026 2:45 PM (Nepal Time (NPT))");
      expect(text).toContain("New Date: 16 October 2026");
      expect(text).toContain("New Time: 3:45 PM");
      expect(html).toContain("Previous Schedule");
      expect(html).toContain("16 October 2026");
    });

    it("delivers interview cancelled email with original date and reason", async () => {
      sendMail.mockResolvedValue({ messageId: "cancel-123" });

      const result = await sendInterviewCancelledEmail({
        recipient: "candidate@example.com",
        candidateName: "Pooja Gurung",
        companyName: "Himalaya Software",
        jobTitle: "DevOps Engineer",
        scheduledAt: "2026-10-15T09:00:00.000Z",
        reason: "Position filled internally",
        applicationId: "app200",
      });

      expect(result.success).toBe(true);
      const [, subject, text, html] = sendMail.mock.calls[0];
      expect(subject).toBe("Interview Cancelled — DevOps Engineer at Himalaya Software");
      expect(text).toContain("Reason: Position filled internally");
      expect(html).toContain("Position filled internally");
      expect(html).toContain("Interview Cancelled");
    });
  });

  describe("5. Technical Assessment Invitation & Submission", () => {
    it("delivers assessment invitation email with secure link, assessment title, and duration", async () => {
      sendMail.mockResolvedValue({ messageId: "assess-inv-123" });

      const result = await sendAssessmentAssignedEmail({
        recipient: "candidate@example.com",
        candidateName: "Alok KC",
        companyName: "Apex FinTech",
        jobTitle: "Backend Developer",
        assessmentTitle: "Algorithms & Concurrency",
        duration: "60 minutes",
        assessmentDeadline: "30 October 2026",
        assessmentLink: "https://quickjobs.app/assessment/app300/token123",
        applicationId: "app300",
      });

      expect(result.success).toBe(true);
      const [, subject, text, html] = sendMail.mock.calls[0];
      expect(subject).toBe("Technical Assessment — Backend Developer");
      expect(text).toContain("Assessment:\nAlgorithms & Concurrency");
      expect(text).toContain("Duration:\n60 minutes");
      expect(text).toContain("Deadline:\n30 October 2026");
      expect(text).toContain("[Start Assessment]: https://quickjobs.app/assessment/app300/token123");
      expect(html).toContain("Algorithms &amp; Concurrency");
      expect(html).toContain("Start Assessment");
    });

    it("delivers assessment submitted email to employer with candidate score and submission link", async () => {
      sendMail.mockResolvedValue({ messageId: "assess-sub-123" });

      const result = await sendAssessmentSubmittedEmail({
        recipient: "employer@apex.com",
        employerName: "Apex Hiring Team",
        candidateName: "Alok KC",
        jobTitle: "Backend Developer",
        assessmentTitle: "Algorithms & Concurrency",
        score: 92,
        maxScore: 100,
        passed: true,
        applicationId: "app300",
        jobId: "job300",
      });

      expect(result.success).toBe(true);
      const [recipient, subject, text, html] = sendMail.mock.calls[0];
      expect(recipient).toBe("employer@apex.com");
      expect(subject).toBe("Assessment Submitted — Alok KC");
      expect(text).toContain("Score: 92 / 100 (Passed)");
      expect(html).toContain("View Assessment");
      expect(html).toContain("Alok KC");
    });
  });

  describe("6. Super Admin Test Email Utility", () => {
    it("sends test email and returns success with provider info", async () => {
      sendMail.mockResolvedValue({ messageId: "test-msg-id-789" });

      const req = {
        body: { to: "admin@quickjobs.local", subject: "Pipeline Check", message: "Verifying SMTP connection" },
        user: { role: "superadmin" },
      };
      const res = mockRes();

      await sendTestEmail(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          recipient: "admin@quickjobs.local",
          messageId: "test-msg-id-789",
        })
      );
    });

    it("rejects invalid recipient email with 400", async () => {
      const req = {
        body: { to: "not-an-email" },
        user: { role: "superadmin" },
      };
      const res = mockRes();

      await sendTestEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
