const sendMail = require("../utils/sendMail");

/**
 * Helper to format date and time in Nepal Time (NPT, Asia/Kathmandu, UTC+5:45).
 * Formats:
 *   Date: 22 September 2026
 *   Time: 10:30 AM
 *   Timezone: Nepal Time (NPT)
 * @param {Date|string} dateInput
 * @returns {{ date: string, time: string, timezone: string, fullFormatted: string }}
 */
const formatInterviewDateTime = (dateInput) => {
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) {
    return {
      date: "Date TBD",
      time: "Time TBD",
      timezone: "Nepal Time (NPT)",
      fullFormatted: "Scheduled Date & Time TBD",
    };
  }

  const date = dateObj.toLocaleDateString("en-GB", {
    timeZone: "Asia/Kathmandu",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const time = dateObj.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const timezone = "Nepal Time (NPT)";
  const fullFormatted = `${date} at ${time} (${timezone})`;

  return { date, time, timezone, fullFormatted };
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
 * Build professional QuickJobs HTML template for interview emails.
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
  meetingLink,
  location,
  notes,
  isCancelled = false,
  cancellationReason,
}) => {
  const isVideo = interviewMode && /video|online|zoom|meet|teams/i.test(interviewMode);
  const isInPerson = interviewMode && /person|on-site|office/i.test(interviewMode);

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
        <p>${
          isCancelled
            ? `Your interview for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been cancelled.`
            : `Your interview has been scheduled for the following position at <strong>${companyName}</strong>.`
        }</p>

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
            <td class="label">Interview Type</td>
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
            ${cancellationReason ? `<strong>Reason:</strong> ${cancellationReason}` : "The employer has cancelled this scheduled session."}
          </p>
        </div>
        <p style="margin-top: 24px; font-size: 14px; color: #475569;">
          You can track your other applications and scheduled sessions anytime on your QuickJobs dashboard.
        </p>
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

/**
 * Send Interview Scheduled Email
 */
const sendInterviewScheduledEmail = async ({
  recipient,
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  scheduledAt,
  duration = 30,
  mode = "Video Call",
  meetingLink = "",
  location = "",
  notes = "",
  applicationId = "",
  interviewId = "",
}) => {
  const { date, time, timezone, fullFormatted } = formatInterviewDateTime(scheduledAt);
  const durationText = formatDuration(duration);

  const subject = `Interview Scheduled — ${jobTitle} at ${companyName}`;

  let text =
    `Hello ${candidateName},\n\n` +
    `Your interview has been scheduled for the following position:\n\n` +
    `Position: ${jobTitle}\n` +
    `Company: ${companyName}\n` +
    `Date: ${date}\n` +
    `Time: ${time}\n` +
    `Timezone: ${timezone}\n` +
    `Duration: ${durationText}\n` +
    `Interview Type: ${mode}\n` +
    (meetingLink ? `Meeting Link: ${meetingLink}\n` : "") +
    (location ? `Interview Location: ${location}\n` : "") +
    (notes ? `Additional Notes: ${notes}\n` : "") +
    `\nPlease make sure you are available at the scheduled time.\n\n` +
    `Best regards,\nQuickJobs Team`;

  const html = buildInterviewHtml({
    heading: "Interview Scheduled",
    badgeText: "Interview Scheduled",
    badgeColor: "badge-scheduled",
    candidateName,
    jobTitle,
    companyName,
    date,
    time,
    timezone,
    durationText,
    interviewMode: mode,
    meetingLink,
    location,
    notes,
  });

  try {
    await sendMail(recipient, subject, text, html);

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

/**
 * Send Interview Rescheduled Email
 */
const sendInterviewRescheduledEmail = async ({
  recipient,
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  scheduledAt,
  duration = 30,
  mode = "Video Call",
  meetingLink = "",
  location = "",
  notes = "",
  applicationId = "",
  interviewId = "",
}) => {
  const { date, time, timezone } = formatInterviewDateTime(scheduledAt);
  const durationText = formatDuration(duration);

  const subject = `Interview Rescheduled — ${jobTitle} at ${companyName}`;

  let text =
    `Hello ${candidateName},\n\n` +
    `Your interview for "${jobTitle}" at ${companyName} has been rescheduled to a new time:\n\n` +
    `Position: ${jobTitle}\n` +
    `Company: ${companyName}\n` +
    `New Date: ${date}\n` +
    `New Time: ${time}\n` +
    `Timezone: ${timezone}\n` +
    `Duration: ${durationText}\n` +
    `Interview Type: ${mode}\n` +
    (meetingLink ? `Meeting Link: ${meetingLink}\n` : "") +
    (location ? `Interview Location: ${location}\n` : "") +
    (notes ? `Additional Notes: ${notes}\n` : "") +
    `\nPlease make note of this updated schedule.\n\n` +
    `Best regards,\nQuickJobs Team`;

  const html = buildInterviewHtml({
    heading: "Interview Rescheduled",
    badgeText: "Interview Rescheduled",
    badgeColor: "badge-rescheduled",
    candidateName,
    jobTitle,
    companyName,
    date,
    time,
    timezone,
    durationText,
    interviewMode: mode,
    meetingLink,
    location,
    notes,
  });

  try {
    await sendMail(recipient, subject, text, html);

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

/**
 * Send Interview Cancelled Email
 */
const sendInterviewCancelledEmail = async ({
  recipient,
  candidateName = "Candidate",
  companyName = "QuickJobs Employer",
  jobTitle = "Position",
  reason = "",
  applicationId = "",
}) => {
  const subject = `Interview Cancelled — ${jobTitle} at ${companyName}`;

  let text =
    `Hello ${candidateName},\n\n` +
    `Your interview for "${jobTitle}" at ${companyName} has been cancelled.\n\n` +
    (reason ? `Reason: ${reason}\n\n` : "") +
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
  });

  try {
    await sendMail(recipient, subject, text, html);

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

module.exports = {
  formatInterviewDateTime,
  formatDuration,
  sendInterviewScheduledEmail,
  sendInterviewRescheduledEmail,
  sendInterviewCancelledEmail,
};
