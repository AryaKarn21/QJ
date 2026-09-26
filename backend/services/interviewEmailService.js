const sendMail = require("../utils/sendMail");

// Display labels for the handful of zones QuickJobs actually operates in.
// Any zone id not listed here falls back to showing the raw id, which is
// still a valid, unambiguous label — just less pretty than a named zone.
const TIMEZONE_LABELS = {
  "Asia/Kathmandu": "Nepal Time (NPT)",
  "Asia/Kolkata": "India Standard Time (IST)",
  "Asia/Dhaka": "Bangladesh Standard Time (BST)",
  UTC: "Coordinated Universal Time (UTC)",
};
const getTimezoneLabel = (timezone) => TIMEZONE_LABELS[timezone] || timezone || "Asia/Kathmandu";

// Employer-authored free text (customMessage/cancellationReason/etc.) gets
// rendered into an HTML email — escape it so it can't inject markup into a
// message sent on QuickJobs' behalf.
const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Helper to format date and time in a given IANA timezone (defaults to the
 * app's historical default, Asia/Kathmandu).
 * Formats:
 *   Date: 22 September 2026
 *   Time: 10:30 AM
 *   Timezone: Nepal Time (NPT)
 * @param {Date|string} dateInput
 * @param {string} [timezone]
 * @returns {{ date: string, time: string, timezone: string, fullFormatted: string }}
 */
const formatInterviewDateTime = (dateInput, timezone = "Asia/Kathmandu") => {
  const dateObj = new Date(dateInput);
  const timezoneLabel = getTimezoneLabel(timezone);

  if (isNaN(dateObj.getTime())) {
    return {
      date: "Date TBD",
      time: "Time TBD",
      timezone: timezoneLabel,
      fullFormatted: "Scheduled Date & Time TBD",
    };
  }

  const date = dateObj.toLocaleDateString("en-GB", {
    timeZone: timezone,
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const time = dateObj.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const fullFormatted = `${date} at ${time} (${timezoneLabel})`;

  return { date, time, timezone: timezoneLabel, fullFormatted };
};

/**
 * Format duration string.
 * @param {number|string} duration
 * @returns {string}
 */
const formatDuration = (duration) => {
  if (!duration) return "30 minutes";
  const num = parseInt(duration, 10);
  if (isNaN(num) || num <= 0) return "30 minutes";
  if (num >= 60 && num % 60 === 0) {
    const hours = num / 60;
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${num} minutes`;
};

/**
 * Build professional QuickJobs HTML template for interview/assessment/
 * status emails. `customMessage`, when present, is rendered as an
 * inserted highlighted paragraph under the greeting — it never replaces
 * any of the boilerplate below it.
 */
const buildInterviewHtml = ({
  heading,
  badgeText,
  badgeColor,
  candidateName,
  jobTitle,
  companyName,
  date,
  time,
  timezone,
  durationText,
  interviewMode,
  interviewType,
  meetingLink,
  location,
  notes,
  isCancelled = false,
  cancellationReason,
  customMessage = "",
  // Generic mode: skip the interview-details/cancellation card entirely
  // and just render `bodyText` as the main paragraph — used for
  // status-change / freeform employer-message emails that aren't tied to
  // an interview at all.
  isGeneric = false,
  bodyText = "",
}) => {
  const isVideo = interviewMode && /video|online|zoom|meet|teams/i.test(interviewMode);
  const isInPerson = interviewMode && /person|on-site|office/i.test(interviewMode);

  const customMessageBlock = customMessage
    ? `
        <div class="card" style="background-color: #FFFBEB; border-color: #FDE68A;">
          <p style="margin: 0; color: #92400E; font-size: 14px; white-space: pre-wrap;"><strong>A note from the employer:</strong><br/>${escapeHtml(customMessage)}</p>
        </div>
        `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; }
    table { border-collapse: collapse; }
    .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; }
    .header { background-color: #0F172A; padding: 28px 32px; text-align: left; }
    .logo-text { color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; text-decoration: none; }
    .logo-accent { color: #EA580C; }
    .content { padding: 32px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
    .badge-scheduled { background-color: #FEF3C7; color: #B45309; }
    .badge-rescheduled { background-color: #E0E7FF; color: #4338CA; }
    .badge-cancelled { background-color: #FEE2E2; color: #B91C1C; }
    h1 { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 12px 0; line-height: 1.3; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .card { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .row { padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
    .row:last-child { border-bottom: none; }
    .label { font-size: 13px; font-weight: 600; color: #64748B; width: 140px; }
    .value { font-size: 14px; font-weight: 600; color: #0F172A; }
    .cta-container { text-align: center; margin: 28px 0 16px 0; }
    .cta-button { display: inline-block; background-color: #EA580C; color: #FFFFFF !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2); }
    .footer { background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center; font-size: 13px; color: #94A3B8; }
    .footer a { color: #EA580C; text-decoration: none; }
  </style>
</head>
<body>
  <div style="padding: 24px 12px; background-color: #F8FAFC;">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <a href="https://quickjobs.local" class="logo-text">Quick<span class="logo-accent">Jobs</span></a>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="badge ${badgeColor}">${badgeText}</div>
        <h1>${heading}</h1>
        <p>Hello <strong>${candidateName}</strong>,</p>
        ${
          isGeneric
            ? `<p>${bodyText}</p>${customMessageBlock}`
            : `
        <p>${
          isCancelled
            ? `Your interview for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been cancelled.`
            : `Your interview has been scheduled for the following position at <strong>${companyName}</strong>.`
        }</p>
        ${customMessageBlock}

        <!-- Interview Details Card -->
        ${
          !isCancelled
            ? `
        <table class="card" width="100%">
          <tr class="row">
            <td class="label">Position</td>
            <td class="value">${jobTitle}</td>
          </tr>
          <tr class="row">
            <td class="label">Company</td>
            <td class="value">${companyName}</td>
          </tr>
          ${
            interviewType
              ? `
          <tr class="row">
            <td class="label">Round</td>
            <td class="value">${interviewType}</td>
          </tr>
          `
              : ""
          }
          <tr class="row">
            <td class="label">Date</td>
            <td class="value">${date}</td>
          </tr>
          <tr class="row">
            <td class="label">Time</td>
            <td class="value">${time} (${timezone})</td>
          </tr>
          <tr class="row">
            <td class="label">Duration</td>
            <td class="value">${durationText}</td>
          </tr>
          <tr class="row">
            <td class="label">Format</td>
            <td class="value">${interviewMode || "Video Call"}</td>
          </tr>
          ${
            meetingLink
              ? `
          <tr class="row">
            <td class="label">Meeting Link</td>
            <td class="value"><a href="${meetingLink}" target="_blank" style="color: #EA580C; word-break: break-all;">${meetingLink}</a></td>
          </tr>
          `
              : ""
          }
          ${
            location && isInPerson
              ? `
          <tr class="row">
            <td class="label">Interview Location</td>
            <td class="value">${location}</td>
          </tr>
          `
              : ""
          }
          ${
            notes
              ? `
          <tr class="row">
            <td class="label">Additional Notes</td>
            <td class="value" style="font-weight: normal; color: #334155; white-space: pre-wrap;">${notes}</td>
          </tr>
          `
              : ""
          }
        </table>

        ${
          meetingLink
            ? `
        <div class="cta-container">
          <a href="${meetingLink}" target="_blank" class="cta-button">Join Interview</a>
        </div>
        `
            : ""
        }

        <p style="margin-top: 24px; font-size: 14px; color: #475569;">
          Please make sure you are available 5 minutes prior to the scheduled time. If you need to reschedule, please contact the employer as early as possible.
        </p>
        `
            : `
        <div class="card" style="background-color: #FEF2F2; border-color: #FECACA;">
          <p style="color: #991B1B; margin: 0; font-size: 14px;">
            ${cancellationReason ? `<strong>Reason:</strong> ${escapeHtml(cancellationReason)}` : "The employer has cancelled this scheduled session."}
          </p>
        </div>
        <p style="margin-top: 24px; font-size: 14px; color: #475569;">
          You can track your other applications and scheduled sessions anytime on your QuickJobs dashboard.
        </p>
        `
        }
        `
        }

        <p style="margin-top: 24px; font-size: 14px; color: #64748B;">
          Best regards,<br>
          <strong style="color: #0F172A;">QuickJobs Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin: 0 0 6px 0;">QuickJobs • Career Opportunities Platform</p>
        <p style="margin: 0;">This is an automated notification. Please do not reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

// ============================================================
// Interview Scheduled
// ============================================================
const buildInterviewScheduledEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  scheduledAt,
  duration = 30,
  mode = "Video Call",
  type = "",
  meetingLink = "",
  location = "",
  notes = "",
  timezone = "Asia/Kathmandu",
  customMessage = "",
}) => {
  const { date, time, timezone: timezoneLabel } = formatInterviewDateTime(scheduledAt, timezone);
  const durationText = formatDuration(duration);
  const headingPrefix = type || "Interview";

  const subject = `${headingPrefix} Scheduled — ${jobTitle} at ${companyName}`;

  const text =
    `Hello ${candidateName},\n\n` +
    `Your ${type ? type.toLowerCase() : "interview"} has been scheduled for the following position:\n\n` +
    `Position: ${jobTitle}\n` +
    `Company: ${companyName}\n` +
    (type ? `Round: ${type}\n` : "") +
    `Date: ${date}\n` +
    `Time: ${time}\n` +
    `Timezone: ${timezoneLabel}\n` +
    `Duration: ${durationText}\n` +
    `Format: ${mode}\n` +
    (meetingLink ? `Meeting Link: ${meetingLink}\n` : "") +
    (location ? `Interview Location: ${location}\n` : "") +
    (notes ? `Additional Notes: ${notes}\n` : "") +
    (customMessage ? `\nA note from the employer:\n${customMessage}\n` : "") +
    `\nPlease make sure you are available at the scheduled time.\n\n` +
    `Best regards,\nQuickJobs Team`;

  const html = buildInterviewHtml({
    heading: `${headingPrefix} Scheduled`,
    badgeText: type || "Interview Scheduled",
    badgeColor: "badge-scheduled",
    candidateName,
    jobTitle,
    companyName,
    date,
    time,
    timezone: timezoneLabel,
    durationText,
    interviewMode: mode,
    interviewType: type,
    meetingLink,
    location,
    notes,
    customMessage,
  });

  return { subject, text, html };
};

const sendInterviewScheduledEmail = async ({
  recipient,
  applicationId = "",
  interviewId = "",
  ...contentArgs
}) => {
  const { subject, text, html } = buildInterviewScheduledEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "interview_scheduled",
      relatedApplication: applicationId || undefined,
    });

    console.log(
      `[InterviewEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nInterview: ${interviewId || "N/A"}\nStatus: sent`
    );

    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown mail delivery error";
    console.error(
      `[InterviewEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nInterview: ${interviewId || "N/A"}\nStatus: failed\nError: ${safeError}`
    );

    return { success: false, recipient, error: safeError };
  }
};

// ============================================================
// Interview Rescheduled
// ============================================================
const buildInterviewRescheduledEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  scheduledAt,
  duration = 30,
  mode = "Video Call",
  type = "",
  meetingLink = "",
  location = "",
  notes = "",
  timezone = "Asia/Kathmandu",
  customMessage = "",
}) => {
  const { date, time, timezone: timezoneLabel } = formatInterviewDateTime(scheduledAt, timezone);
  const durationText = formatDuration(duration);
  const headingPrefix = type || "Interview";

  const subject = `${headingPrefix} Rescheduled — ${jobTitle} at ${companyName}`;

  const text =
    `Hello ${candidateName},\n\n` +
    `Your ${type ? type.toLowerCase() : "interview"} for "${jobTitle}" at ${companyName} has been rescheduled to a new time:\n\n` +
    `Position: ${jobTitle}\n` +
    `Company: ${companyName}\n` +
    (type ? `Round: ${type}\n` : "") +
    `New Date: ${date}\n` +
    `New Time: ${time}\n` +
    `Timezone: ${timezoneLabel}\n` +
    `Duration: ${durationText}\n` +
    `Format: ${mode}\n` +
    (meetingLink ? `Meeting Link: ${meetingLink}\n` : "") +
    (location ? `Interview Location: ${location}\n` : "") +
    (notes ? `Additional Notes: ${notes}\n` : "") +
    (customMessage ? `\nA note from the employer:\n${customMessage}\n` : "") +
    `\nPlease make note of this updated schedule.\n\n` +
    `Best regards,\nQuickJobs Team`;

  const html = buildInterviewHtml({
    heading: `${headingPrefix} Rescheduled`,
    badgeText: `${type || "Interview"} Rescheduled`,
    badgeColor: "badge-rescheduled",
    candidateName,
    jobTitle,
    companyName,
    date,
    time,
    timezone: timezoneLabel,
    durationText,
    interviewMode: mode,
    interviewType: type,
    meetingLink,
    location,
    notes,
    customMessage,
  });

  return { subject, text, html };
};

const sendInterviewRescheduledEmail = async ({
  recipient,
  applicationId = "",
  interviewId = "",
  ...contentArgs
}) => {
  const { subject, text, html } = buildInterviewRescheduledEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "interview_rescheduled",
      relatedApplication: applicationId || undefined,
    });

    console.log(
      `[InterviewEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nInterview: ${interviewId || "N/A"}\nEvent: Rescheduled\nStatus: sent`
    );

    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown mail delivery error";
    console.error(
      `[InterviewEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nInterview: ${interviewId || "N/A"}\nEvent: Rescheduled\nStatus: failed\nError: ${safeError}`
    );

    return { success: false, recipient, error: safeError };
  }
};

// ============================================================
// Interview Cancelled
// ============================================================
const buildInterviewCancelledEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  reason = "",
  customMessage = "",
}) => {
  const subject = `Interview Cancelled — ${jobTitle} at ${companyName}`;

  const text =
    `Hello ${candidateName},\n\n` +
    `Your interview for "${jobTitle}" at ${companyName} has been cancelled.\n\n` +
    (reason ? `Reason: ${reason}\n\n` : "") +
    (customMessage ? `A note from the employer:\n${customMessage}\n\n` : "") +
    `Please check your QuickJobs dashboard for any other updates.\n\n` +
    `Best regards,\nQuickJobs Team`;

  const html = buildInterviewHtml({
    heading: "Interview Cancelled",
    badgeText: "Interview Cancelled",
    badgeColor: "badge-cancelled",
    candidateName,
    jobTitle,
    companyName,
    isCancelled: true,
    cancellationReason: reason,
    customMessage,
  });

  return { subject, text, html };
};

const sendInterviewCancelledEmail = async ({ recipient, applicationId = "", ...contentArgs }) => {
  const { subject, text, html } = buildInterviewCancelledEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "interview_cancelled",
      relatedApplication: applicationId || undefined,
    });

    console.log(
      `[InterviewEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nEvent: Cancelled\nStatus: sent`
    );

    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown mail delivery error";
    console.error(
      `[InterviewEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nEvent: Cancelled\nStatus: failed\nError: ${safeError}`
    );

    return { success: false, recipient, error: safeError };
  }
};

// ============================================================
// Interview Reminder (24h / 1h before) — new, first wired by
// utils/interviewReminderCron.js.
// ============================================================
const buildInterviewReminderEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  scheduledAt,
  duration = 30,
  mode = "Video Call",
  type = "",
  meetingLink = "",
  location = "",
  timezone = "Asia/Kathmandu",
  reminderWindow = "24h", // "24h" | "1h"
}) => {
  const { date, time, timezone: timezoneLabel } = formatInterviewDateTime(scheduledAt, timezone);
  const durationText = formatDuration(duration);
  const headingPrefix = type || "Interview";
  const whenPhrase = reminderWindow === "1h" ? "starts in 1 hour" : "is tomorrow";

  const subject =
    reminderWindow === "1h"
      ? `Reminder: ${headingPrefix} Starts in 1 Hour — ${jobTitle} at ${companyName}`
      : `Reminder: ${headingPrefix} Tomorrow — ${jobTitle} at ${companyName}`;

  const text =
    `Hello ${candidateName},\n\n` +
    `This is a reminder that your ${type ? type.toLowerCase() : "interview"} for "${jobTitle}" at ${companyName} ${whenPhrase}.\n\n` +
    `Date: ${date}\n` +
    `Time: ${time}\n` +
    `Timezone: ${timezoneLabel}\n` +
    `Duration: ${durationText}\n` +
    `Format: ${mode}\n` +
    (meetingLink ? `Meeting Link: ${meetingLink}\n` : "") +
    (location ? `Interview Location: ${location}\n` : "") +
    `\nBest regards,\nQuickJobs Team`;

  const html = buildInterviewHtml({
    heading: `Your ${headingPrefix} ${whenPhrase}`,
    badgeText: "Reminder",
    badgeColor: "badge-rescheduled",
    candidateName,
    jobTitle,
    companyName,
    date,
    time,
    timezone: timezoneLabel,
    durationText,
    interviewMode: mode,
    interviewType: type,
    meetingLink,
    location,
  });

  return { subject, text, html };
};

const sendInterviewReminderEmail = async ({ recipient, applicationId = "", ...contentArgs }) => {
  const { subject, text, html } = buildInterviewReminderEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "interview_reminder",
      relatedApplication: applicationId || undefined,
    });
    console.log(
      `[InterviewEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nEvent: Reminder(${contentArgs.reminderWindow || "24h"})\nStatus: sent`
    );
    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown mail delivery error";
    console.error(
      `[InterviewEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nEvent: Reminder(${contentArgs.reminderWindow || "24h"})\nStatus: failed\nError: ${safeError}`
    );
    return { success: false, recipient, error: safeError };
  }
};

// ============================================================
// Assessment Request
// ============================================================
const buildAssessmentRequestEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  assessmentLink = "",
  assessmentDeadline,
  customMessage = "",
}) => {
  const deadlineInfo = assessmentDeadline ? `\nDeadline: ${assessmentDeadline}` : "";
  const subject = `Assessment Required — ${jobTitle} at ${companyName}`;
  const text =
    `Hello ${candidateName},\n\n` +
    `We would like you to complete an assessment for the ${jobTitle} position at ${companyName}.${deadlineInfo}\n\n` +
    (assessmentLink ? `Assessment Link: ${assessmentLink}\n` : "") +
    (customMessage ? `\nA note from the employer:\n${customMessage}\n` : "") +
    `\nPlease complete it at your earliest convenience.\n\nBest regards,\nQuickJobs Team`;

  const html = buildInterviewHtml({
    heading: "Assessment Request",
    badgeText: "Assessment",
    badgeColor: "badge-scheduled",
    candidateName,
    jobTitle,
    companyName,
    date: assessmentDeadline || "",
    time: "",
    timezone: "",
    durationText: "",
    interviewMode: "Online",
    meetingLink: assessmentLink,
    notes: "Please complete the assessment before the deadline.",
    customMessage,
  });

  return { subject, text, html };
};

const sendAssessmentRequestEmail = async ({ recipient, applicationId = "", ...contentArgs }) => {
  const { subject, text, html } = buildAssessmentRequestEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "assessment_request",
      relatedApplication: applicationId || undefined,
    });
    console.log(`[AssessmentEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nStatus: sent`);
    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown mail delivery error";
    console.error(`[AssessmentEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nStatus: failed\nError: ${safeError}`);
    return { success: false, recipient, error: safeError };
  }
};

// ============================================================
// Assessment Reminder — already existed but had zero callers; first
// wired by utils/interviewReminderCron.js.
// ============================================================
const buildAssessmentReminderEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  assessmentLink = "",
}) => {
  const subject = `Reminder: Assessment – ${jobTitle} at ${companyName}`;
  const text =
    `Hello ${candidateName},\n\n` +
    `This is a friendly reminder to complete the assessment for the ${jobTitle} role at ${companyName}.\n` +
    (assessmentLink ? `Assessment Link: ${assessmentLink}\n` : "") +
    `\nWe look forward to reviewing your submission.\n\nBest regards,\nQuickJobs Team`;

  const html = buildInterviewHtml({
    heading: "Assessment Reminder",
    badgeText: "Reminder",
    badgeColor: "badge-rescheduled",
    candidateName,
    jobTitle,
    companyName,
    notes: "Please complete the assessment as soon as possible.",
    meetingLink: assessmentLink,
  });

  return { subject, text, html };
};

const sendAssessmentReminderEmail = async ({ recipient, applicationId = "", ...contentArgs }) => {
  const { subject, text, html } = buildAssessmentReminderEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "assessment_reminder",
      relatedApplication: applicationId || undefined,
    });
    console.log(`[AssessmentEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nStatus: reminder sent`);
    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown mail delivery error";
    console.error(`[AssessmentEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nStatus: reminder failed\nError: ${safeError}`);
    return { success: false, recipient, error: safeError };
  }
};

// ============================================================
// Status change (Accepted/Rejected/etc.) and standalone employer message
// — generic, non-interview emails that still get the same branded shell
// and the same optional customMessage insertion, so they're previewable
// through the same mechanism as the interview/assessment emails above.
// ============================================================
const buildStatusChangeEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  status = "",
  customMessage = "",
}) => {
  const isAccepted = status === "Accepted";
  const isRejected = status === "Rejected";
  const heading = isAccepted ? "Application Accepted" : isRejected ? "Application Update" : `Application ${status || "Updated"}`;
  const badgeText = status || "Update";
  const badgeColor = isAccepted ? "badge-scheduled" : isRejected ? "badge-cancelled" : "badge-rescheduled";

  const bodyText = isAccepted
    ? `Congratulations! Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been accepted.`
    : isRejected
      ? `Thank you for applying for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. After careful review, we will not be moving forward with your application at this time.`
      : `Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been updated to "${status}".`;

  const subject = `${heading} — ${jobTitle} at ${companyName}`;
  const text =
    `Hello ${candidateName},\n\n` +
    bodyText.replace(/<[^>]+>/g, "") +
    (customMessage ? `\n\nA note from the employer:\n${customMessage}\n` : "") +
    `\n\nBest regards,\nQuickJobs Team`;

  const html = buildInterviewHtml({
    heading,
    badgeText,
    badgeColor,
    candidateName,
    isGeneric: true,
    bodyText,
    customMessage,
  });

  return { subject, text, html };
};

const sendStatusChangeEmail = async ({ recipient, applicationId = "", ...contentArgs }) => {
  const { subject, text, html } = buildStatusChangeEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "application_status_update",
      relatedApplication: applicationId || undefined,
    });
    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown mail delivery error";
    return { success: false, recipient, error: safeError };
  }
};

const buildCustomMessageEmailContent = ({ candidateName = "Candidate", companyName = "QuickJobs Employer", message = "" }) => {
  const subject = `Message from ${companyName}`;
  const text = `Hello ${candidateName},\n\n${message}\n\nBest regards,\n${companyName} via QuickJobs`;
  const html = buildInterviewHtml({
    heading: `A message from ${companyName}`,
    badgeText: "Message",
    badgeColor: "badge-rescheduled",
    candidateName,
    isGeneric: true,
    bodyText: escapeHtml(message).replace(/\n/g, "<br/>"),
  });
  return { subject, text, html };
};

const sendCustomMessageEmail = async ({ recipient, applicationId = "", ...contentArgs }) => {
  const { subject, text, html } = buildCustomMessageEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "job_provider_message",
      relatedApplication: applicationId || undefined,
    });
    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown mail delivery error";
    return { success: false, recipient, error: safeError };
  }
};

module.exports = {
  formatInterviewDateTime,
  formatDuration,
  sendInterviewScheduledEmail,
  sendInterviewRescheduledEmail,
  sendInterviewCancelledEmail,
  sendInterviewReminderEmail,
  sendAssessmentRequestEmail,
  sendAssessmentReminderEmail,
  sendStatusChangeEmail,
  sendCustomMessageEmail,
  // Exported so the preview endpoint (employerController.previewApplicationEmail)
  // can render exact email content without sending — no template duplication
  // on the client.
  buildInterviewScheduledEmailContent,
  buildInterviewRescheduledEmailContent,
  buildInterviewCancelledEmailContent,
  buildInterviewReminderEmailContent,
  buildAssessmentRequestEmailContent,
  buildAssessmentReminderEmailContent,
  buildStatusChangeEmailContent,
  buildCustomMessageEmailContent,
};
