const nodemailer = require("nodemailer");

// Reused across calls rather than recreated per-send — cheap either way,
// but matches the "one shared client" convention used for the Gemini
// client elsewhere in this codebase.
let cachedTransporter = null;
function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail", // or any SMTP provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Without these, a bad EMAIL_PASS (e.g. a regular Gmail account
      // password instead of an App Password — Gmail rejects SMTP login
      // with the former once 2-Step Verification is on) or a blocked
      // outbound SMTP port left nodemailer retrying for 60-90+ seconds
      // before finally failing. Every caller of sendMail — forgot-password,
      // OTP, and (as of the "await sendMail" fix) interview-scheduling —
      // was hanging the whole HTTP request for that entire window instead
      // of failing fast. 10s is generous for a real SMTP handshake and
      // fails fast when it's actually broken.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return cachedTransporter;
}

const sendMail = async (to, subject, text) => {
  await getTransporter().sendMail({
    from: `"Job Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
};

module.exports = sendMail;
