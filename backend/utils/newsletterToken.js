const crypto = require("crypto");

// Lightweight signed-link token for one-click unsubscribe — not a JWT (no
// expiry needed, an unsubscribe link should keep working indefinitely) and
// no new secret/dependency: just an HMAC of the email using the existing
// JWT_SECRET, so a link can't be forged to unsubscribe an address the
// requester doesn't already know, without adding any new schema/model.
function signUnsubscribeToken(email) {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET || "")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

function verifyUnsubscribeToken(email, token) {
  if (!email || !token) return false;
  const expected = signUnsubscribeToken(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");

// Every subscriber-facing email (newsletter broadcast or new-job alert)
// carries this same one-click unsubscribe footer — shared here so both
// send paths (newsletterController.js, services/jobAlertEmailService.js)
// stay identical instead of hand-formatting it twice.
function unsubscribeFooter(email) {
  const token = signUnsubscribeToken(email);
  const url = `${BACKEND_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
  return {
    text: `\n\n—\nYou're receiving this because you subscribed to QuickJobs updates. Unsubscribe: ${url}`,
    html: `<p style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
      You're receiving this because you subscribed to QuickJobs updates.
      <a href="${url}" style="color:#94a3b8;">Unsubscribe</a>
    </p>`,
  };
}

module.exports = { signUnsubscribeToken, verifyUnsubscribeToken, unsubscribeFooter };
