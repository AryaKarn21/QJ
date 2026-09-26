const nodemailer = require("nodemailer");
const EmailLog = require("../models/EmailLog");

let cachedTransporter = null;

function getTransporter() {
  if (!cachedTransporter) {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : "";

    cachedTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return cachedTransporter;
}

// Every automated email is a no-reply — the "from" mailbox is whatever
// account SMTP credentials are configured (EMAIL_FROM, or EMAIL_USER as a
// fallback so existing deployments keep working unchanged), but the
// display name always reads "QuickJobs" and every message carries this
// footer so recipients don't mistake it for a two-way conversation. Two-way
// communication goes through the existing QuickJobs messaging system
// instead (see employer Applicants.tsx's "Message Candidate").
const NO_REPLY_TEXT_FOOTER =
  "\n\n---\nThis is an automated message from QuickJobs. Please do not reply to this email.";
const NO_REPLY_HTML_FOOTER =
  '<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">' +
  "This is an automated message from QuickJobs. Please do not reply to this email.</p>";

/**
 * Send an email using the configured nodemailer transporter. Every call
 * writes an EmailLog row first (status "queued"), then updates it to
 * "sent" or "failed" once the send resolves/rejects — the single place
 * every outbound email in the app goes through, so this is also the single
 * place delivery is tracked from (see models/EmailLog.js).
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text email content
 * @param {string} [html] - Optional HTML email content
 * @param {object} [meta] - Optional metadata for the EmailLog row: { type, recipientUser, relatedJob, relatedApplication }
 * @returns {Promise<any>}
 */
const sendMail = async (to, subject, text, html = null, meta = {}) => {
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const textWithFooter = `${text}${NO_REPLY_TEXT_FOOTER}`;
  const htmlWithFooter = html ? `${html}${NO_REPLY_HTML_FOOTER}` : null;

  const mailOptions = {
    from: `"QuickJobs" <${fromAddress}>`,
    to,
    subject,
    text: textWithFooter,
  };
  if (htmlWithFooter) {
    mailOptions.html = htmlWithFooter;
  }

  const log = await EmailLog.create({
    recipientEmail: to,
    recipientUser: meta.recipientUser || undefined,
    type: meta.type || "general",
    subject,
    textBody: textWithFooter,
    htmlBody: htmlWithFooter || undefined,
    relatedJob: meta.relatedJob || undefined,
    relatedApplication: meta.relatedApplication || undefined,
    status: "queued",
  });

  try {
    const info = await getTransporter().sendMail(mailOptions);
    log.status = "sent";
    log.sentAt = new Date();
    log.attempts += 1;
    await log.save();
    return info;
  } catch (error) {
    log.status = "failed";
    log.failureReason = error?.message || "Unknown error";
    log.attempts += 1;
    await log.save();
    // Preserve existing behavior — every current caller already handles a
    // rejected sendMail() promise itself (e.g. employerController.js sets
    // application.interview.emailStatus = "failed" in its catch block).
    throw error;
  }
};

/**
 * Re-attempts a previously failed EmailLog row using its stored content —
 * used by the Super Admin "retry failed email" action. Idempotency guard:
 * refuses to retry a row that isn't currently "failed" (e.g. already
 * retried successfully by a concurrent request), so a double-click can't
 * send the same email twice.
 */
const retryFailedEmail = async (emailLogId) => {
  const log = await EmailLog.findById(emailLogId);
  if (!log) {
    const err = new Error("Email log not found");
    err.code = "EMAIL_LOG_NOT_FOUND";
    throw err;
  }
  if (log.status !== "failed") {
    const err = new Error(`Email is not in a failed state (current status: ${log.status})`);
    err.code = "EMAIL_NOT_FAILED";
    throw err;
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const mailOptions = {
    from: `"QuickJobs" <${fromAddress}>`,
    to: log.recipientEmail,
    subject: log.subject,
    text: log.textBody,
  };
  if (log.htmlBody) mailOptions.html = log.htmlBody;

  try {
    const info = await getTransporter().sendMail(mailOptions);
    log.status = "sent";
    log.sentAt = new Date();
    log.attempts += 1;
    log.failureReason = undefined;
    await log.save();
    return info;
  } catch (error) {
    log.status = "failed";
    log.failureReason = error?.message || "Unknown error";
    log.attempts += 1;
    await log.save();
    throw error;
  }
};

module.exports = sendMail;
module.exports.retryFailedEmail = retryFailedEmail;
