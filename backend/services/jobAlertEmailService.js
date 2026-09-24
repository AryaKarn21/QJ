const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const sendMail = require("../utils/sendMail");
const { unsubscribeFooter } = require("../utils/newsletterToken");

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

// Fired once, when an admin approves a job (Pending -> Active) — see
// jobController.js's updateJobStatus. Only newsletter subscribers get
// this, not every jobseeker in the database: they're the audience that
// explicitly opted in to "job alerts and hiring trends" (the footer's own
// wording for what subscribing means), so this is consent-based, not a
// mass unsolicited blast to the whole user table.
async function notifyNewsletterOfNewJob(job) {
  try {
    const subscribers = await NewsletterSubscriber.find({ isActive: true }).select("email").lean();
    if (subscribers.length === 0) return;

    const jobUrl = `${FRONTEND_URL}/jobs/${job._id}`;
    const companyName = job.companyOverride?.name || job.employer?.name || "";
    const subject = `New job alert: ${job.title}${companyName ? ` at ${companyName}` : ""}`;
    const locationLine = [job.location, job.country].filter(Boolean).join(", ");

    for (const sub of subscribers) {
      const footer = unsubscribeFooter(sub.email);
      const text =
        `A new job matching your interests was just posted on QuickJobs:\n\n` +
        `${job.title}${companyName ? ` — ${companyName}` : ""}\n` +
        `${locationLine ? `${locationLine}\n` : ""}` +
        `${job.jobtype ? `${job.jobtype}\n` : ""}\n` +
        `View and apply: ${jobUrl}${footer.text}`;
      const html =
        `<div style="font-family:sans-serif;color:#1e293b;line-height:1.6;">` +
        `<p>A new job matching your interests was just posted on QuickJobs:</p>` +
        `<h3 style="margin-bottom:4px;">${job.title}</h3>` +
        `<p style="margin:0;color:#475569;">${[companyName, locationLine, job.jobtype].filter(Boolean).join(" · ")}</p>` +
        `<p style="margin-top:16px;"><a href="${jobUrl}" style="background:#f97316;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">View & Apply</a></p>` +
        `</div>${footer.html}`;

      // Best-effort per recipient — one bounced/invalid address must not
      // stop the rest of the alert from going out.
      sendMail(sub.email, subject, text, html).catch((err) =>
        console.error(`Job alert email failed for ${sub.email}:`, err.message)
      );
    }
  } catch (error) {
    // A failure here must never block the admin's job-approval action
    // itself — the job is already Active by the time this runs.
    console.error("Failed to send new-job alert emails:", error.message);
  }
}

module.exports = { notifyNewsletterOfNewJob };
