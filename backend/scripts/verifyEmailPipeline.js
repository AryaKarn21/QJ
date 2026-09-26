require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const nodemailer = require("nodemailer");

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : "";

async function main() {
  console.log("Verifying email credentials for:", user);
  if (!user || !pass) {
    throw new Error("EMAIL_USER or EMAIL_PASS missing from environment variables.");
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });

  await transporter.verify();
  console.log("Transporter verification: SUCCESS");

  const fromAddress = process.env.EMAIL_FROM || user;
  const fromName = process.env.EMAIL_FROM_NAME || "QuickJobs";

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: user,
    subject: "QuickJobs — End-to-End Delivery Verification",
    text: "This automated email confirms that the QuickJobs email pipeline is delivering messages through the mail provider to the recipient inbox.\n\n---\nThis is an automated message from QuickJobs. Please do not reply to this email.",
    html: `
      <div style="font-family:sans-serif;max-width:550px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0f172a;margin-top:0;">QuickJobs Email Pipeline Verified</h2>
        <p style="color:#334155;line-height:1.6;">This automated email confirms that the QuickJobs email delivery pipeline is fully functional and messages are being delivered to the recipient inbox.</p>
        <p style="font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:20px;">This is an automated message from QuickJobs. Please do not reply to this email.</p>
      </div>
    `.trim(),
  });

  console.log("EMAIL_DELIVERY_SUCCESS");
  console.log("Message ID:", info.messageId);
  console.log("Accepted:", info.accepted);
  console.log("Provider Response:", info.response);
}

main().catch((err) => {
  console.error("DELIVERY_FAILED:", err.message);
  process.exit(1);
});
