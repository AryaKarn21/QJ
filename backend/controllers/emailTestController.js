const { sendTestEmail: sendTestEmailViaService } = require("../services/emailService");

// POST /api/email/test — thin wrapper around the existing sendTestEmail
// service (services/emailService.js), shaped to the exact
// { success, emailId } / { success, message } contract requested for this
// endpoint. Reuses the same underlying send path as the pre-existing
// /api/admin/email-logs/test-email endpoint — no duplicate email service.
const testEmail = async (req, res) => {
  const { to } = req.body;

  if (!to || typeof to !== "string" || !to.trim() || !to.includes("@")) {
    return res.status(400).json({ success: false, message: "A valid recipient email address 'to' is required." });
  }

  try {
    const info = await sendTestEmailViaService({
      to: to.trim(),
      subject: "QuickJobs Email Test",
      message:
        "Resend integration is working successfully. This email was sent from the QuickJobs backend.",
    });

    // info is whatever deliver() returns — { messageId } from either the
    // Resend SDK or the nodemailer fallback. Never report success unless
    // sendMail actually resolved (a Resend rejection throws and lands in
    // the catch block below, never here).
    return res.json({ success: true, emailId: info?.messageId || null });
  } catch (error) {
    console.error("[emailTestController] Test email failed:", error.message);
    return res.status(502).json({ success: false, message: error.message || "Email sending failed" });
  }
};

module.exports = { testEmail };
