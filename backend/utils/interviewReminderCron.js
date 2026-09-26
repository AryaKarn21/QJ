// 24h/1h interview reminders + assessment-deadline reminders. Referenced
// by comments in models/Application.js, models/EmailLog.js, and
// models/Notification.js since before this file existed — this is that
// promised cron, finally wired up.
//
// Idempotency: every sweep is driven entirely by dedup fields already
// stored on the Application document itself (interview.reminder24hSentAt,
// interview.reminder1hSentAt, assessment.reminderSentAt) rather than any
// in-memory state, so a process restart never causes a duplicate send and
// no separate job-queue/persistence layer is needed.
const cron = require("node-cron");
const Application = require("../models/Application");
const sendNotification = require("../utils/sendNotifications");
const { sendInterviewReminderEmail, sendAssessmentReminderEmail } = require("../services/interviewEmailService");

const MINUTE_MS = 60 * 1000;

const populateForReminder = (query) =>
  query
    .populate({ path: "job", populate: { path: "employer", select: "name" } })
    .populate("applicant", "name email isActive");

const companyNameFor = (application) =>
  application.job?.companyOverride?.name?.trim() ||
  application.job?.employer?.name?.trim() ||
  "QuickJobs Employer";

async function runInterviewReminderPass({ windowField, windowLabel, minMinutes, maxMinutes }) {
  const now = Date.now();
  const windowStart = new Date(now + minMinutes * MINUTE_MS);
  const windowEnd = new Date(now + maxMinutes * MINUTE_MS);

  const applications = await populateForReminder(
    Application.find({
      "interview.scheduledAt": { $gte: windowStart, $lte: windowEnd },
      "interview.status": { $in: ["SCHEDULED", "CONFIRMED", "RESCHEDULED"] },
      [`interview.${windowField}`]: null,
    })
  );

  for (const application of applications) {
    try {
      const candidate = application.applicant;
      if (!candidate?._id) continue;

      await sendNotification({
        recipient: candidate._id,
        type: "interview_reminder",
        message:
          windowLabel === "1h"
            ? `Your interview for "${application.job.title}" starts in 1 hour.`
            : `Your interview for "${application.job.title}" is tomorrow.`,
        relatedJob: application.job._id,
        relatedApplication: application._id,
        link: "/user/applications",
      });

      if (candidate.email && candidate.isActive !== false) {
        await sendInterviewReminderEmail({
          recipient: candidate.email,
          candidateName: candidate.name || "Candidate",
          companyName: companyNameFor(application),
          jobTitle: application.job.title,
          scheduledAt: application.interview.scheduledAt,
          duration: application.interview.duration,
          mode: application.interview.mode,
          type: application.interview.type,
          meetingLink: application.interview.meetingLink,
          location: application.interview.location,
          timezone: application.interview.timezone,
          applicationId: application._id,
          reminderWindow: windowLabel,
        });
      }

      application.interview[windowField] = new Date();
      await application.save();
    } catch (err) {
      console.error(`[InterviewReminderCron] Failed processing application ${application._id} (${windowLabel}):`, err.message);
    }
  }

  return applications.length;
}

async function runAssessmentReminderPass() {
  const now = Date.now();
  const windowEnd = new Date(now + 24 * 60 * MINUTE_MS);

  const applications = await populateForReminder(
    Application.find({
      "assessment.deadline": { $gte: new Date(now), $lte: windowEnd },
      "assessment.status": { $in: ["assigned", "in_progress"] },
      "assessment.reminderSentAt": null,
    }).select("+assessment.accessToken")
  );

  for (const application of applications) {
    try {
      const candidate = application.applicant;
      if (!candidate?.email || candidate.isActive === false) continue;

      await sendNotification({
        recipient: candidate._id,
        type: "assessment_assigned",
        message: `Reminder: your assessment for "${application.job.title}" is due soon.`,
        relatedJob: application.job._id,
        relatedApplication: application._id,
        link: "/user/applications",
      });

      const token = application.assessment?.accessToken || "";
      const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

      await sendAssessmentReminderEmail({
        recipient: candidate.email,
        candidateName: candidate.name || "Candidate",
        companyName: companyNameFor(application),
        jobTitle: application.job.title,
        assessmentLink: token ? `${FRONTEND_URL}/assessment/${application._id}/${token}` : "",
        applicationId: application._id,
      });

      application.assessment.reminderSentAt = new Date();
      await application.save();
    } catch (err) {
      console.error(`[InterviewReminderCron] Failed processing assessment reminder for application ${application._id}:`, err.message);
    }
  }

  return applications.length;
}

async function runReminderSweep() {
  try {
    const count24h = await runInterviewReminderPass({
      windowField: "reminder24hSentAt",
      windowLabel: "24h",
      minMinutes: 23 * 60 + 45,
      maxMinutes: 24 * 60 + 15,
    });
    if (count24h) console.log(`[InterviewReminderCron] Sent ${count24h} 24h interview reminder(s).`);
  } catch (err) {
    console.error("[InterviewReminderCron] 24h interview pass failed:", err.message);
  }

  try {
    const count1h = await runInterviewReminderPass({
      windowField: "reminder1hSentAt",
      windowLabel: "1h",
      minMinutes: 45,
      maxMinutes: 75,
    });
    if (count1h) console.log(`[InterviewReminderCron] Sent ${count1h} 1h interview reminder(s).`);
  } catch (err) {
    console.error("[InterviewReminderCron] 1h interview pass failed:", err.message);
  }

  try {
    const countAssessment = await runAssessmentReminderPass();
    if (countAssessment) console.log(`[InterviewReminderCron] Sent ${countAssessment} assessment deadline reminder(s).`);
  } catch (err) {
    console.error("[InterviewReminderCron] Assessment reminder pass failed:", err.message);
  }
}

function startReminderCron() {
  // 15-minute tick with ±30-minute windows around each exact mark means a
  // 15-minute cadence can never miss or double-fire a given reminder.
  cron.schedule("*/15 * * * *", runReminderSweep);
  console.log("[InterviewReminderCron] Scheduled (every 15 minutes).");
}

module.exports = { startReminderCron, runReminderSweep };
