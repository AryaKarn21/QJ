const nodemailer = require("nodemailer");
const EmailLog = require("../models/EmailLog");

let cachedTransporter = null;

function getProviderName() {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) return "Resend";
  if (process.env.SMTP_HOST && process.env.SMTP_HOST.trim()) return "SMTP";
  return process.env.EMAIL_SERVICE ? process.env.EMAIL_SERVICE.toUpperCase() : "Gmail";
}

function getTransporter() {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
    if (!cachedTransporter || cachedTransporter._provider !== "resend") {
      cachedTransporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY.trim(),
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      cachedTransporter._provider = "resend";
    }
    return cachedTransporter;
  }

  if (process.env.SMTP_HOST && process.env.SMTP_HOST.trim()) {
    if (!cachedTransporter || cachedTransporter._provider !== "smtp") {
      cachedTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST.trim(),
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          pass: process.env.SMTP_PASS || (process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : ""),
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      cachedTransporter._provider = "smtp";
    }
    return cachedTransporter;
  }

  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : "";

  if (!user || !pass) {
    const missing = [];
    if (!user) missing.push("EMAIL_USER");
    if (!pass) missing.push("EMAIL_PASS");
    const err = new Error(
      `Email provider not configured on server. Missing: ${missing.join(
        ", "
      )} (or set RESEND_API_KEY in Render environment variables).`
    );
    err.code = "EMAIL_CREDENTIALS_MISSING";
    throw err;
  }

  if (!cachedTransporter || cachedTransporter._provider !== "default") {
    cachedTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    cachedTransporter._provider = "default";
  }

  return cachedTransporter;
}

function getSenderConfig() {
  const fromName = process.env.EMAIL_FROM_NAME || "QuickJobs";
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@quickjobs.local";
  return {
    fromName,
    fromEmail,
    formatted: `"${fromName}" <${fromEmail}>`,
  };
}

// Every automated email is a no-reply — the "from" mailbox is whatever
// account credentials are configured (EMAIL_FROM, or EMAIL_USER as a
// fallback so existing deployments keep working unchanged), but the
// display name reads "QuickJobs" (or EMAIL_FROM_NAME) and every message
// carries this footer so recipients don't mistake it for a two-way conversation.
const NO_REPLY_TEXT_FOOTER =
  "\n\n---\nThis is an automated message from QuickJobs. Please do not reply to this email.";
const NO_REPLY_HTML_FOOTER =
  '<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">' +
  "This is an automated message from QuickJobs. Please do not reply to this email.</p>";

/**
 * Send an email using the configured email transporter.
 * Every call writes an EmailLog row first (status "queued"), then updates it to
 * "sent" or "failed" once the send resolves/rejects.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text email content
 * @param {string} [html] - Optional HTML email content
 * @param {object} [meta] - Optional metadata: { type, recipientUser, relatedJob, relatedApplication, relatedInterview, relatedAssessment, idempotencyKey, force }
 * @returns {Promise<any>}
 */
const sendMail = async (to, subject, text, html = null, meta = {}) => {
  if (!to || typeof to !== "string" || !to.trim() || !to.includes("@")) {
    const error = new Error(`Invalid recipient email address: "${to}"`);
    console.error(`[sendMail] Validation error: ${error.message}`);
    throw error;
  }
  const cleanTo = to.trim().toLowerCase();

  const { fromName, fromEmail, formatted: fromFormatted } = getSenderConfig();
  if (!fromEmail || fromEmail === "undefined" || fromEmail === "null" || !fromEmail.includes("@")) {
    const error = new Error("Invalid sender email configuration. Please set EMAIL_FROM or EMAIL_USER.");
    console.error(`[sendMail] Sender error: ${error.message}`);
    throw error;
  }

  const provider = getProviderName();

  // Idempotency check: prevent sending duplicate emails for the same event unless force=true
  if (meta.idempotencyKey && !meta.force) {
    try {
      const existing = await EmailLog.findOne({
        idempotencyKey: meta.idempotencyKey,
        status: { $in: ["sent", "delivered", "SENT", "DELIVERED"] },
      });
      if (existing) {
        console.log(`[sendMail] Skipping duplicate email for idempotencyKey: ${meta.idempotencyKey}`);
        return { messageId: existing.providerMessageId || "idempotent-duplicate", skipped: true };
      }
    } catch (e) {
      // Non-blocking error for idempotency query
    }
  }

  const textWithFooter = text.includes("This is an automated message from QuickJobs")
    ? text
    : `${text}${NO_REPLY_TEXT_FOOTER}`;
  const htmlWithFooter = html
    ? html.includes("This is an automated message from QuickJobs")
      ? html
      : `${html}${NO_REPLY_HTML_FOOTER}`
    : null;

  const mailOptions = {
    from: fromFormatted,
    to: cleanTo,
    subject,
    text: textWithFooter,
  };
  if (htmlWithFooter) {
    mailOptions.html = htmlWithFooter;
  }

  let log = null;
  try {
    log = await EmailLog.create({
      recipientEmail: cleanTo,
      senderEmail: fromEmail,
      recipientUser: meta.recipientUser || undefined,
      type: meta.type || "general",
      provider,
      subject,
      textBody: textWithFooter,
      htmlBody: htmlWithFooter || undefined,
      relatedJob: meta.relatedJob || undefined,
      relatedApplication: meta.relatedApplication || undefined,
      relatedInterview: meta.relatedInterview || undefined,
      relatedAssessment: meta.relatedAssessment || undefined,
      idempotencyKey: meta.idempotencyKey || undefined,
      status: "queued",
    });
  } catch (err) {
    console.error("[sendMail] Failed to create initial EmailLog row:", err.message);
  }

  try {
    const info = await getTransporter().sendMail(mailOptions);
    if (log) {
      log.status = "sent";
      log.sentAt = new Date();
      log.attempts += 1;
      log.providerMessageId = info?.messageId || "";
      await log.save();
    }
    return info;
  } catch (error) {
    const safeError = error?.message || "Unknown error";
    if (log) {
      log.status = "failed";
      log.failureReason = safeError;
      log.attempts += 1;
      await log.save();
    }

    console.error(
      `Email failed:\nrecipient = ${cleanTo}\ntype = ${meta.type || "general"}\nprovider = ${provider}\nerror = ${safeError}`
    );

    throw error;
  }
};

/**
 * Re-attempts a previously failed EmailLog row using its stored content.
 */
const retryFailedEmail = async (emailLogId) => {
  const log = await EmailLog.findById(emailLogId);
  if (!log) {
    const err = new Error("Email log not found");
    err.code = "EMAIL_LOG_NOT_FOUND";
    throw err;
  }
  if (log.status !== "failed" && log.status !== "FAILED") {
    const err = new Error(`Email is not in a failed state (current status: ${log.status})`);
    err.code = "EMAIL_NOT_FAILED";
    throw err;
  }

  const { fromEmail, formatted: fromFormatted } = getSenderConfig();
  const mailOptions = {
    from: fromFormatted,
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
    log.provider = getProviderName();
    log.providerMessageId = info?.messageId || "";
    log.senderEmail = fromEmail;
    await log.save();
    return info;
  } catch (error) {
    const safeError = error?.message || "Unknown error";
    log.status = "failed";
    log.failureReason = safeError;
    log.attempts += 1;
    await log.save();

    console.error(
      `Email failed:\nrecipient = ${log.recipientEmail}\ntype = ${log.type || "general"}\nprovider = ${getProviderName()}\nerror = ${safeError}`
    );

    throw error;
  }
};

module.exports = sendMail;
module.exports.retryFailedEmail = retryFailedEmail;
module.exports.getProviderName = getProviderName;
module.exports.getSenderConfig = getSenderConfig;
