const nodemailer = require("nodemailer");

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

/**
 * Send an email using the configured nodemailer transporter.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text email content
 * @param {string} [html] - Optional HTML email content
 * @returns {Promise<any>}
 */
const sendMail = async (to, subject, text, html = null) => {
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const mailOptions = {
    from: `"QuickJobs" <${fromAddress}>`,
    to,
    subject,
    text,
  };

  if (html) {
    mailOptions.html = html;
  }

  return await getTransporter().sendMail(mailOptions);
};

module.exports = sendMail;

