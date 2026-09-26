const sendMail = require("../utils/sendMail");

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

// Display labels for the handful of zones QuickJobs actually operates in.
const TIMEZONE_LABELS = {
  "Asia/Kathmandu": "Nepal Time (NPT)",
  "Asia/Kolkata": "India Standard Time (IST)",
  "Asia/Dhaka": "Bangladesh Standard Time (BST)",
  UTC: "Coordinated Universal Time (UTC)",
};
const getTimezoneLabel = (timezone) => TIMEZONE_LABELS[timezone] || timezone || "Asia/Kathmandu";

// Escape HTML entities to prevent markup injection in emails
const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Format date and time for emails in a given timezone.
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
 * Core QuickJobs branded HTML email wrapper.
 */
const buildEmailHtml = ({
  heading,
  badgeText,
  badgeColor = "badge-scheduled",
  greetingName,
  introParagraph = "",
  customMessage = "",
  rows = [], // Array of { label, value, isLink, linkUrl }
  ctaText = "",
  ctaUrl = "",
  calloutHtml = "",
  footerNote = "",
}) => {
  const customMessageBlock = customMessage
    ? `
      <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6; white-space: pre-wrap;"><strong>A note from the employer:</strong><br/>${escapeHtml(customMessage)}</p>
      </div>`
    : "";

  let tableHtml = "";
  if (rows && rows.length > 0) {
    const rowItems = rows
      .filter((r) => r.value)
      .map(
        (r) => `
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: #64748B; width: 140px; vertical-align: top;">${escapeHtml(r.label)}</td>
          <td style="padding: 10px 12px; font-size: 14px; font-weight: 600; color: #0F172A; vertical-align: top;">
            ${r.isLink && r.linkUrl ? `<a href="${r.linkUrl}" target="_blank" style="color: #EA580C; text-decoration: none; word-break: break-all;">${escapeHtml(r.value)}</a>` : escapeHtml(r.value)}
          </td>
        </tr>`
      )
      .join("");

    tableHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin: 20px 0; border-collapse: collapse;">
        ${rowItems}
      </table>`;
  }

  const ctaButtonHtml =
    ctaText && ctaUrl
      ? `
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #EA580C; color: #FFFFFF !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.25);">${escapeHtml(ctaText)}</a>
      </div>`
      : "";

  const badgeClassMap = {
    "badge-scheduled": "background-color: #FEF3C7; color: #B45309;",
    "badge-rescheduled": "background-color: #E0E7FF; color: #4338CA;",
    "badge-cancelled": "background-color: #FEE2E2; color: #B91C1C;",
    "badge-success": "background-color: #DCFCE7; color: #15803D;",
  };
  const badgeStyle = badgeClassMap[badgeColor] || badgeClassMap["badge-scheduled"];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <div style="padding: 24px 12px; background-color: #F8FAFC;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0;">
      <!-- Header -->
      <div style="background-color: #0F172A; padding: 24px 32px; text-align: left;">
        <span style="color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Quick<span style="color: #EA580C;">Jobs</span></span>
      </div>

      <!-- Main Content -->
      <div style="padding: 32px;">
        ${badgeText ? `<div style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; ${badgeStyle}">${escapeHtml(badgeText)}</div>` : ""}
        <h1 style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 14px 0; line-height: 1.3;">${escapeHtml(heading)}</h1>
        ${greetingName ? `<p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">Hello <strong>${escapeHtml(greetingName)}</strong>,</p>` : ""}
        ${introParagraph ? `<div style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">${introParagraph}</div>` : ""}
        ${customMessageBlock}
        ${calloutHtml}
        ${tableHtml}
        ${ctaButtonHtml}

        ${footerNote ? `<p style="margin-top: 24px; font-size: 14px; line-height: 1.6; color: #475569;">${footerNote}</p>` : ""}

        <p style="margin-top: 28px; font-size: 14px; line-height: 1.6; color: #64748B;">
          Regards,<br>
          <strong style="color: #0F172A;">QuickJobs</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; text-align: center; font-size: 12px; color: #94A3B8; line-height: 1.5;">
        <p style="margin: 0 0 6px 0;">QuickJobs • Career Opportunities Platform</p>
        <p style="margin: 0;">This is an automated email. Please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>`.trim();
};

/**
 * Backward compatibility helper building interview HTML.
 */
const buildInterviewHtml = ({
  heading,
  badgeText,
  badgeColor = "badge-scheduled",
  candidateName,
  jobTitle,
  companyName,
  date,
  time,
  timezone,
  durationText,
  interviewMode,
  interviewType,
  interviewer,
  meetingLink,
  location,
  notes,
  isCancelled = false,
  cancellationReason,
  customMessage = "",
  isGeneric = false,
  bodyText = "",
  ctaText = "",
  ctaUrl = "",
}) => {
  if (isGeneric) {
    return buildEmailHtml({
      heading,
      badgeText,
      badgeColor,
      greetingName: candidateName,
      introParagraph: bodyText,
      customMessage,
      ctaText,
      ctaUrl,
    });
  }

  if (isCancelled) {
    return buildEmailHtml({
      heading: "Interview Cancelled",
      badgeText: "Interview Cancelled",
      badgeColor: "badge-cancelled",
      greetingName: candidateName,
      introParagraph: `Your interview for the position of <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong> has been cancelled.`,
      calloutHtml: `
        <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 18px; margin: 16px 0;">
          <p style="color: #991B1B; margin: 0; font-size: 14px; line-height: 1.6;">
            ${cancellationReason ? `<strong>Reason:</strong> ${escapeHtml(cancellationReason)}` : "The employer has cancelled this scheduled session."}
          </p>
        </div>`,
      customMessage,
      footerNote: "You can track your other applications and scheduled sessions anytime on your QuickJobs dashboard.",
    });
  }

  const rows = [
    { label: "Position", value: jobTitle },
    { label: "Company", value: companyName },
    interviewType ? { label: "Round", value: interviewType } : null,
    interviewer ? { label: "Interviewer", value: interviewer } : null,
    date ? { label: "Date", value: date } : null,
    time ? { label: "Time", value: timezone ? `${time} (${timezone})` : time } : null,
    durationText ? { label: "Duration", value: durationText } : null,
    interviewMode ? { label: "Format", value: interviewMode } : null,
    meetingLink ? { label: "Meeting Link", value: meetingLink, isLink: true, linkUrl: meetingLink } : null,
    location ? { label: "Location", value: location } : null,
    notes ? { label: "Instructions / Notes", value: notes } : null,
  ].filter(Boolean);

  return buildEmailHtml({
    heading,
    badgeText,
    badgeColor,
    greetingName: candidateName,
    introParagraph: `Your interview has been scheduled for the following position at <strong>${escapeHtml(companyName)}</strong>:`,
    rows,
    customMessage,
    ctaText: meetingLink ? "Join Interview" : "View Application",
    ctaUrl: meetingLink || `${FRONTEND_URL}/user/applications`,
    footerNote: "Please make sure you are available 5 minutes prior to the scheduled time. If you need to reschedule, please contact the employer as early as possible.",
  });
};

// ============================================================
// 1. Job Opportunity / Posted Email
// ============================================================
const buildJobPostedEmailContent = ({
  candidateName = "Candidate",
  jobTitle = "Position",
  companyName = "QuickJobs Employer",
  location = "",
  employmentType = "Full-time",
  jobId = "",
}) => {
  const jobUrl = jobId ? `${FRONTEND_URL}/jobs/${jobId}` : `${FRONTEND_URL}/jobs`;
  const subject = `New Job Opportunity — ${jobTitle}`;

  const text =
    `Hello ${candidateName},\n\n` +
    `A new job matching your profile has been posted on QuickJobs.\n\n` +
    `Position:\n${jobTitle}\n\n` +
    `Company:\n${companyName}\n\n` +
    (location ? `Location:\n${location}\n\n` : "") +
    (employmentType ? `Employment Type:\n${employmentType}\n\n` : "") +
    `[View Job]: ${jobUrl}\n\n` +
    `Regards,\nQuickJobs\n\n` +
    `This is an automated email. Please do not reply.`;

  const rows = [
    { label: "Position", value: jobTitle },
    { label: "Company", value: companyName },
    location ? { label: "Location", value: location } : null,
    employmentType ? { label: "Employment Type", value: employmentType } : null,
  ].filter(Boolean);

  const html = buildEmailHtml({
    heading: `New Job Opportunity`,
    badgeText: "New Job",
    badgeColor: "badge-scheduled",
    greetingName: candidateName,
    introParagraph: `A new job matching your profile has been posted on QuickJobs.`,
    rows,
    ctaText: "View Job",
    ctaUrl: jobUrl,
  });

  return { subject, text, html };
};

const sendJobPostedEmail = async ({ recipient, userId = "", jobId = "", ...args }) => {
  const { subject, text, html } = buildJobPostedEmailContent({ ...args, jobId });
  try {
    await sendMail(recipient, subject, text, html, {
      type: "job_alert",
      recipientUser: userId || undefined,
      relatedJob: jobId || undefined,
      idempotencyKey: `job_alert:${jobId}:${recipient}`,
    });
    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown error";
    return { success: false, recipient, error: safeError };
  }
};

// ============================================================
// 2. Application Status / Shortlisting Email
// ============================================================
const buildStatusChangeEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  status = "",
  customMessage = "",
  applicationId = "",
}) => {
  const applicationUrl = `${FRONTEND_URL}/user/applications`;
  const isAccepted = status === "Accepted";
  const isRejected = status === "Rejected";
  const isShortlisted = status === "Shortlisted";

  let heading = `Application ${status || "Updated"}`;
  let badgeText = status || "Update";
  let badgeColor = "badge-rescheduled";
  let subject = `Application Update — ${jobTitle}`;
  let bodyText = "";

  if (isShortlisted) {
    heading = "Application Shortlisted";
    badgeText = "Shortlisted";
    badgeColor = "badge-scheduled";
    subject = `Application Update — ${jobTitle}`;
    bodyText =
      `Your application for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong> has been shortlisted.<br><br>` +
      `Please check your QuickJobs account for the next steps.`;
  } else if (isAccepted) {
    heading = "Application Accepted";
    badgeText = "Accepted";
    badgeColor = "badge-success";
    subject = `Application Accepted — ${jobTitle} at ${companyName}`;
    bodyText =
      `Congratulations! Your application for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong> has been accepted.<br><br>` +
      `Please check your QuickJobs account for the next steps.`;
  } else if (isRejected) {
    heading = "Application Update";
    badgeText = "Update";
    badgeColor = "badge-cancelled";
    subject = `Application Update — ${jobTitle} at ${companyName}`;
    bodyText =
      `Thank you for applying for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong>. After careful review, we will not be moving forward with your application at this time.<br><br>` +
      `You can track your other applications anytime on your QuickJobs dashboard.`;
  } else {
    bodyText = `Your application for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong> has been updated to "${escapeHtml(status)}".`;
  }

  const text =
    `Hello ${candidateName},\n\n` +
    (isShortlisted
      ? `Your application for ${jobTitle} at ${companyName} has been shortlisted.\n\nPlease check your QuickJobs account for the next steps.`
      : isAccepted
      ? `Congratulations! Your application for ${jobTitle} at ${companyName} has been accepted.\n\nPlease check your QuickJobs account for next steps.`
      : isRejected
      ? `Thank you for applying for ${jobTitle} at ${companyName}. After careful review, we will not be moving forward with your application at this time.`
      : `Your application for ${jobTitle} at ${companyName} has been updated to "${status}".`) +
    (customMessage ? `\n\nA note from the employer:\n${customMessage}` : "") +
    `\n\nView Application: ${applicationUrl}\n\nRegards,\nQuickJobs`;

  const html = buildEmailHtml({
    heading,
    badgeText,
    badgeColor,
    greetingName: candidateName,
    introParagraph: bodyText,
    customMessage,
    ctaText: "View Application",
    ctaUrl: applicationUrl,
  });

  return { subject, text, html };
};

const sendApplicationStatusEmail = async ({ recipient, applicationId = "", ...args }) => {
  const { subject, text, html } = buildStatusChangeEmailContent({ ...args, applicationId });
  try {
    await sendMail(recipient, subject, text, html, {
      type: "application_status_update",
      relatedApplication: applicationId || undefined,
    });
    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown error";
    return { success: false, recipient, error: safeError };
  }
};

const sendStatusChangeEmail = sendApplicationStatusEmail;

// ============================================================
// 3. Interview Scheduled
// ============================================================
const buildInterviewScheduledEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  scheduledAt,
  duration = 30,
  mode = "Video Call",
  type = "",
  interviewer = "",
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
    `Job: ${jobTitle}\n` +
    `Company: ${companyName}\n` +
    (type ? `Round: ${type}\n` : "") +
    `Date: ${date}\n` +
    `Time: ${time}\n` +
    `Timezone: ${timezoneLabel}\n` +
    `Duration: ${durationText}\n` +
    `Format: ${mode}\n` +
    (interviewer ? `Interviewer: ${interviewer}\n` : "") +
    (meetingLink ? `Meeting Link: ${meetingLink}\n` : "") +
    (location ? `Location: ${location}\n` : "") +
    (notes ? `Instructions: ${notes}\nAdditional Notes: ${notes}\n` : "") +
    (customMessage ? `\nA note from the employer:\n${customMessage}\n` : "") +
    `\nView Interview: ${FRONTEND_URL}/user/applications\n\n` +
    `Regards,\n${companyName}\n\n` +
    `This is an automated email from QuickJobs. Please do not reply.`;

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
    interviewer,
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
      relatedInterview: interviewId || undefined,
      idempotencyKey: `interview_scheduled:${applicationId || interviewId}:${recipient}`,
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
// 4. Interview Rescheduled
// ============================================================
const buildInterviewRescheduledEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  scheduledAt,
  previousScheduledAt,
  duration = 30,
  mode = "Video Call",
  type = "",
  interviewer = "",
  meetingLink = "",
  location = "",
  notes = "",
  timezone = "Asia/Kathmandu",
  customMessage = "",
}) => {
  const { date, time, timezone: timezoneLabel } = formatInterviewDateTime(scheduledAt, timezone);
  const previousFormatted = previousScheduledAt
    ? formatInterviewDateTime(previousScheduledAt, timezone)
    : null;
  const durationText = formatDuration(duration);
  const headingPrefix = type || "Interview";
  const subject = `${headingPrefix} Rescheduled — ${jobTitle} at ${companyName}`;

  const text =
    `Hello ${candidateName},\n\n` +
    `Your ${type ? type.toLowerCase() : "interview"} for "${jobTitle}" at ${companyName} has been rescheduled to a new time:\n\n` +
    `Position: ${jobTitle}\n` +
    `Company: ${companyName}\n` +
    (type ? `Round: ${type}\n` : "") +
    (previousFormatted ? `Previous: ${previousFormatted.date} ${previousFormatted.time} (${previousFormatted.timezone})\n` : "") +
    `New Date: ${date}\n` +
    `New Time: ${time}\n` +
    `Timezone: ${timezoneLabel}\n` +
    (interviewer ? `Interviewer: ${interviewer}\n` : "") +
    `Duration: ${durationText}\n` +
    `Format: ${mode}\n` +
    (meetingLink ? `Meeting Link: ${meetingLink}\n` : "") +
    (location ? `Interview Location: ${location}\n` : "") +
    (notes ? `Additional Notes: ${notes}\n` : "") +
    (customMessage ? `\nA note from the employer:\n${customMessage}\n` : "") +
    `\nPlease make note of this updated schedule.\n\n` +
    `Best regards,\nQuickJobs Team`;

  const rows = [
    { label: "Position", value: jobTitle },
    { label: "Company", value: companyName },
    type ? { label: "Round", value: type } : null,
    previousFormatted ? { label: "Previous Schedule", value: `${previousFormatted.date} at ${previousFormatted.time} (${previousFormatted.timezone})` } : null,
    { label: "New Date", value: date },
    { label: "New Time", value: `${time} (${timezoneLabel})` },
    interviewer ? { label: "Interviewer", value: interviewer } : null,
    { label: "Duration", value: durationText },
    { label: "Format", value: mode },
    meetingLink ? { label: "Meeting Link", value: meetingLink, isLink: true, linkUrl: meetingLink } : null,
    location ? { label: "Location", value: location } : null,
    notes ? { label: "Notes", value: notes } : null,
  ].filter(Boolean);

  const html = buildEmailHtml({
    heading: `${headingPrefix} Rescheduled`,
    badgeText: `${type || "Interview"} Rescheduled`,
    badgeColor: "badge-rescheduled",
    greetingName: candidateName,
    introParagraph: `Your interview for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong> has been rescheduled:`,
    rows,
    customMessage,
    ctaText: meetingLink ? "Join Interview" : "View Application",
    ctaUrl: meetingLink || `${FRONTEND_URL}/user/applications`,
    footerNote: "Please make note of this updated schedule. If you need further adjustments, contact the employer promptly.",
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
      relatedInterview: interviewId || undefined,
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
// 5. Interview Cancelled
// ============================================================
const buildInterviewCancelledEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  reason = "",
  scheduledAt = null,
  customMessage = "",
}) => {
  const subject = `Interview Cancelled — ${jobTitle} at ${companyName}`;
  const formattedDate = scheduledAt ? formatInterviewDateTime(scheduledAt).fullFormatted : "";

  const text =
    `Hello ${candidateName},\n\n` +
    `Your interview for "${jobTitle}" at ${companyName}${formattedDate ? ` scheduled for ${formattedDate}` : ""} has been cancelled.\n\n` +
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
// 6. Interview Reminder (24h / 1h)
// ============================================================
const buildInterviewReminderEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  scheduledAt,
  duration = 30,
  mode = "Video Call",
  type = "",
  interviewer = "",
  meetingLink = "",
  location = "",
  timezone = "Asia/Kathmandu",
  reminderWindow = "24h",
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
    (interviewer ? `Interviewer: ${interviewer}\n` : "") +
    `Duration: ${durationText}\n` +
    `Format: ${mode}\n` +
    (meetingLink ? `Meeting Link: ${meetingLink}\n` : "") +
    (location ? `Interview Location: ${location}\n` : "") +
    `\nBest regards,\nQuickJobs Team`;

  const rows = [
    { label: "Position", value: jobTitle },
    { label: "Company", value: companyName },
    type ? { label: "Round", value: type } : null,
    interviewer ? { label: "Interviewer", value: interviewer } : null,
    { label: "Date", value: date },
    { label: "Time", value: `${time} (${timezoneLabel})` },
    { label: "Duration", value: durationText },
    { label: "Format", value: mode },
    meetingLink ? { label: "Meeting Link", value: meetingLink, isLink: true, linkUrl: meetingLink } : null,
    location ? { label: "Location", value: location } : null,
  ].filter(Boolean);

  const html = buildEmailHtml({
    heading: `Your ${headingPrefix} ${whenPhrase}`,
    badgeText: "Reminder",
    badgeColor: "badge-rescheduled",
    greetingName: candidateName,
    introParagraph: `This is a reminder that your interview for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong> ${whenPhrase}.`,
    rows,
    ctaText: meetingLink ? "Join Interview" : "View Details",
    ctaUrl: meetingLink || `${FRONTEND_URL}/user/applications`,
  });

  return { subject, text, html };
};

const sendInterviewReminderEmail = async ({ recipient, applicationId = "", ...contentArgs }) => {
  const { subject, text, html } = buildInterviewReminderEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "interview_reminder",
      relatedApplication: applicationId || undefined,
      idempotencyKey: `interview_reminder_${contentArgs.reminderWindow || "24h"}:${applicationId}:${recipient}`,
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
// 7. Technical Assessment Assignment
// ============================================================
const buildAssessmentRequestEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  assessmentTitle = "Technical Assessment",
  duration = "30 minutes",
  assessmentLink = "",
  assessmentDeadline = "",
  customMessage = "",
}) => {
  const subject = `Technical Assessment — ${jobTitle}`;

  const text =
    `Hello ${candidateName},\n\n` +
    `You have been invited to complete a technical assessment for:\n\n` +
    `${jobTitle}\n\n` +
    `Company:\n${companyName}\n\n` +
    `Assessment:\n${assessmentTitle}\n\n` +
    `Duration:\n${duration}\n\n` +
    `Deadline:\n${assessmentDeadline || "TBD"}\n\n` +
    (assessmentLink ? `[Start Assessment]: ${assessmentLink}\n\n` : "") +
    (customMessage ? `A note from the employer:\n${customMessage}\n\n` : "") +
    `Regards,\nQuickJobs`;

  const rows = [
    { label: "Position", value: jobTitle },
    { label: "Company", value: companyName },
    { label: "Assessment", value: assessmentTitle },
    { label: "Duration", value: duration },
    assessmentDeadline ? { label: "Deadline", value: assessmentDeadline } : null,
  ].filter(Boolean);

  const html = buildEmailHtml({
    heading: "Technical Assessment",
    badgeText: "Assessment Invitation",
    badgeColor: "badge-scheduled",
    greetingName: candidateName,
    introParagraph: `You have been invited to complete a technical assessment for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong>.`,
    rows,
    customMessage,
    ctaText: "Start Assessment",
    ctaUrl: assessmentLink,
    footerNote: "The assessment link is secure and unique to your application. Please ensure you have a stable internet connection before starting.",
  });

  return { subject, text, html };
};

const sendAssessmentRequestEmail = async ({ recipient, applicationId = "", ...contentArgs }) => {
  const { subject, text, html } = buildAssessmentRequestEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "assessment_request",
      relatedApplication: applicationId || undefined,
      idempotencyKey: `assessment_assigned:${applicationId}:${recipient}`,
    });
    console.log(`[AssessmentEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nStatus: sent`);
    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown mail delivery error";
    console.error(`[AssessmentEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nStatus: failed\nError: ${safeError}`);
    return { success: false, recipient, error: safeError };
  }
};

const sendAssessmentAssignedEmail = sendAssessmentRequestEmail;

// ============================================================
// 8. Technical Assessment Submission (Notifies Employer)
// ============================================================
const buildAssessmentSubmittedEmailContent = ({
  employerName = "Employer",
  candidateName = "Candidate",
  jobTitle = "Position",
  assessmentTitle = "Technical Assessment",
  score = 0,
  maxScore = 0,
  passed,
  submissionUrl = "",
}) => {
  const subject = `Assessment Submitted — ${candidateName}`;
  const scoreInfo = maxScore > 0 ? `${score} / ${maxScore}` : `${score} points`;
  const resultInfo = passed !== undefined ? (passed ? "Passed" : "Did not meet passing score") : "Pending Review";

  const text =
    `Hello ${employerName},\n\n` +
    `${candidateName} has submitted the technical assessment for:\n\n` +
    `Position: ${jobTitle}\n` +
    `Assessment: ${assessmentTitle}\n` +
    `Score: ${scoreInfo} (${resultInfo})\n\n` +
    `View submission:\n${submissionUrl}\n\n` +
    `Regards,\nQuickJobs`;

  const rows = [
    { label: "Candidate", value: candidateName },
    { label: "Position", value: jobTitle },
    { label: "Assessment", value: assessmentTitle },
    { label: "Score", value: scoreInfo },
    { label: "Result", value: resultInfo },
  ];

  const html = buildEmailHtml({
    heading: "Assessment Submitted",
    badgeText: "Submission Received",
    badgeColor: "badge-success",
    greetingName: employerName,
    introParagraph: `<strong>${escapeHtml(candidateName)}</strong> has submitted the technical assessment for <strong>${escapeHtml(jobTitle)}</strong>.`,
    rows,
    ctaText: "View Assessment",
    ctaUrl: submissionUrl,
  });

  return { subject, text, html };
};

const sendAssessmentSubmittedEmail = async ({
  recipient,
  employerName = "Employer",
  candidateName = "Candidate",
  jobTitle = "Position",
  assessmentTitle = "Technical Assessment",
  score = 0,
  maxScore = 0,
  passed,
  applicationId = "",
  jobId = "",
}) => {
  const submissionUrl = jobId
    ? `${FRONTEND_URL}/employer/jobs/${jobId}/applicants`
    : `${FRONTEND_URL}/employer/dashboard`;

  const { subject, text, html } = buildAssessmentSubmittedEmailContent({
    employerName,
    candidateName,
    jobTitle,
    assessmentTitle,
    score,
    maxScore,
    passed,
    submissionUrl,
  });

  try {
    await sendMail(recipient, subject, text, html, {
      type: "assessment_submitted",
      relatedApplication: applicationId || undefined,
      relatedJob: jobId || undefined,
    });
    console.log(`[AssessmentEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nEvent: Submitted\nStatus: sent`);
    return { success: true, recipient };
  } catch (error) {
    const safeError = error?.message || "Unknown mail delivery error";
    console.error(`[AssessmentEmail]\nRecipient: ${recipient}\nApplication: ${applicationId}\nEvent: Submitted\nStatus: failed\nError: ${safeError}`);
    return { success: false, recipient, error: safeError };
  }
};

// ============================================================
// 9. Assessment Reminder
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

  const html = buildEmailHtml({
    heading: "Assessment Reminder",
    badgeText: "Reminder",
    badgeColor: "badge-rescheduled",
    greetingName: candidateName,
    introParagraph: `This is a friendly reminder to complete the assessment for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong> before the deadline.`,
    ctaText: "Complete Assessment",
    ctaUrl: assessmentLink,
  });

  return { subject, text, html };
};

const sendAssessmentReminderEmail = async ({ recipient, applicationId = "", ...contentArgs }) => {
  const { subject, text, html } = buildAssessmentReminderEmailContent(contentArgs);
  try {
    await sendMail(recipient, subject, text, html, {
      type: "assessment_reminder",
      relatedApplication: applicationId || undefined,
      idempotencyKey: `assessment_reminder:${applicationId}:${recipient}`,
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
// 10. Application Confirmation & Employer Received Notice
// ============================================================
const sendApplicationSubmittedEmail = async ({
  recipient,
  candidateName = "Candidate",
  jobTitle = "Position",
  companyName = "QuickJobs Employer",
  applicationId = "",
  jobId = "",
}) => {
  const subject = `Application Submitted — ${jobTitle}`;
  const applicationUrl = `${FRONTEND_URL}/user/applications`;
  const text =
    `Hello ${candidateName},\n\n` +
    `Your application for "${jobTitle}" at ${companyName} has been submitted successfully.\n\n` +
    `The employer has been notified and will review your profile shortly.\n\n` +
    `View Application: ${applicationUrl}\n\n` +
    `Regards,\nQuickJobs`;

  const rows = [
    { label: "Position", value: jobTitle },
    { label: "Company", value: companyName },
  ];

  const html = buildEmailHtml({
    heading: "Application Submitted",
    badgeText: "Submitted",
    badgeColor: "badge-success",
    greetingName: candidateName,
    introParagraph: `Your application for <strong>${escapeHtml(jobTitle)}</strong> at <strong>${escapeHtml(companyName)}</strong> has been submitted successfully.`,
    rows,
    ctaText: "Track Application",
    ctaUrl: applicationUrl,
  });

  try {
    await sendMail(recipient, subject, text, html, {
      type: "application_confirmation",
      relatedApplication: applicationId || undefined,
      relatedJob: jobId || undefined,
      idempotencyKey: `application_confirmation:${applicationId}:${recipient}`,
    });
    return { success: true, recipient };
  } catch (error) {
    return { success: false, recipient, error: error?.message || "Failed" };
  }
};

const sendNewApplicationReceivedEmail = async ({
  recipient,
  employerName = "Employer",
  candidateName = "Candidate",
  jobTitle = "Position",
  applicationId = "",
  jobId = "",
}) => {
  const subject = `New Application Received — ${jobTitle}`;
  const applicantsUrl = jobId
    ? `${FRONTEND_URL}/employer/jobs/${jobId}/applicants`
    : `${FRONTEND_URL}/employer/dashboard`;

  const text =
    `Hello ${employerName},\n\n` +
    `${candidateName} has applied to your job posting "${jobTitle}".\n\n` +
    `Review Application: ${applicantsUrl}\n\n` +
    `Regards,\nQuickJobs`;

  const rows = [
    { label: "Candidate", value: candidateName },
    { label: "Position", value: jobTitle },
  ];

  const html = buildEmailHtml({
    heading: "New Application Received",
    badgeText: "New Applicant",
    badgeColor: "badge-scheduled",
    greetingName: employerName,
    introParagraph: `<strong>${escapeHtml(candidateName)}</strong> just applied for <strong>${escapeHtml(jobTitle)}</strong>.`,
    rows,
    ctaText: "Review Applicant",
    ctaUrl: applicantsUrl,
  });

  try {
    await sendMail(recipient, subject, text, html, {
      type: "new_application_notice",
      relatedApplication: applicationId || undefined,
      relatedJob: jobId || undefined,
    });
    return { success: true, recipient };
  } catch (error) {
    return { success: false, recipient, error: error?.message || "Failed" };
  }
};

// ============================================================
// 11. Custom Job Provider Message
// ============================================================
const buildCustomMessageEmailContent = ({
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  message = "",
}) => {
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

// ============================================================
// 12. Test Email Utility (Super Admin verification)
// ============================================================
const sendTestEmail = async ({ to, subject, message }) => {
  const testSubject = subject || "QuickJobs Email Test";
  const testText = message || "This is a test email sent from QuickJobs to verify the complete delivery pipeline.";
  const html = buildEmailHtml({
    heading: "QuickJobs Email Verification",
    badgeText: "Delivery Test",
    badgeColor: "badge-success",
    greetingName: "Admin",
    introParagraph: escapeHtml(testText),
    footerNote: "If you received this message, the email provider configuration and delivery pipeline are working successfully.",
  });

  const info = await sendMail(to, testSubject, testText, html, {
    type: "test_email",
    force: true,
  });

  return info;
};

module.exports = {
  formatInterviewDateTime,
  formatDuration,
  getTimezoneLabel,
  buildEmailHtml,
  buildInterviewHtml,
  buildJobPostedEmailContent,
  buildStatusChangeEmailContent,
  buildInterviewScheduledEmailContent,
  buildInterviewRescheduledEmailContent,
  buildInterviewCancelledEmailContent,
  buildInterviewReminderEmailContent,
  buildAssessmentRequestEmailContent,
  buildAssessmentSubmittedEmailContent,
  buildAssessmentReminderEmailContent,
  buildCustomMessageEmailContent,
  sendJobPostedEmail,
  sendApplicationStatusEmail,
  sendStatusChangeEmail,
  sendInterviewScheduledEmail,
  sendInterviewRescheduledEmail,
  sendInterviewCancelledEmail,
  sendInterviewReminderEmail,
  sendAssessmentAssignedEmail,
  sendAssessmentRequestEmail,
  sendAssessmentSubmittedEmail,
  sendAssessmentReminderEmail,
  sendApplicationSubmittedEmail,
  sendNewApplicationReceivedEmail,
  sendCustomMessageEmail,
  sendTestEmail,
};
