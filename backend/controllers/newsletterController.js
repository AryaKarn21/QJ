const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const sendMail = require("../utils/sendMail");
const { verifyUnsubscribeToken, unsubscribeFooter } = require("../utils/newsletterToken");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public — footer newsletter form. Upserts on email so re-submitting an
// already-subscribed address (or resubscribing after isActive was flipped
// off) is a harmless no-op instead of a duplicate-key error.
const subscribe = async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }

  try {
    const existing = await NewsletterSubscriber.findOne({ email });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
      }
      return res.status(200).json({ message: "You're already subscribed — thanks for sticking around!" });
    }

    await NewsletterSubscriber.create({ email });
    res.status(201).json({ message: "Subscribed! Watch your inbox for job alerts and hiring trends." });
  } catch (error) {
    // Duplicate-key race (two rapid submits for the same email) — treat
    // the same as "already subscribed" rather than surfacing a 500.
    if (error?.code === 11000) {
      return res.status(200).json({ message: "You're already subscribed — thanks for sticking around!" });
    }
    console.error("Error subscribing to newsletter:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// Public — the link every newsletter/job-alert email carries. Renders a
// tiny confirmation page directly (no JSON, no frontend route needed) so
// the link works standalone straight out of an email client.
const unsubscribe = async (req, res) => {
  const email = (req.query?.email || "").trim().toLowerCase();
  const token = req.query?.token || "";

  const page = (message) => `<!doctype html><html><head><meta charset="utf-8" />
    <title>QuickJobs Newsletter</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;display:flex;
      align-items:center;justify-content:center;min-height:100vh;margin:0;color:#1e293b;}
      .card{background:#fff;border-radius:12px;padding:32px;max-width:420px;box-shadow:0 1px 3px rgba(0,0,0,.1);text-align:center;}
      a{color:#f97316;}</style></head>
    <body><div class="card"><h2>QuickJobs</h2><p>${message}</p></div></body></html>`;

  if (!verifyUnsubscribeToken(email, token)) {
    return res.status(400).send(page("This unsubscribe link is invalid or has expired."));
  }

  try {
    await NewsletterSubscriber.updateOne({ email }, { $set: { isActive: false } });
    res.send(page("You've been unsubscribed from QuickJobs newsletter emails. You can resubscribe any time from the site footer."));
  } catch (error) {
    console.error("Error unsubscribing from newsletter:", error);
    res.status(500).send(page("Something went wrong. Please try again later."));
  }
};

// Admin — subscriber count for the CMS Newsletter tab.
const getNewsletterStats = async (req, res) => {
  try {
    const [total, active] = await Promise.all([
      NewsletterSubscriber.countDocuments(),
      NewsletterSubscriber.countDocuments({ isActive: true }),
    ]);
    res.json({ total, active });
  } catch (error) {
    console.error("Error fetching newsletter stats:", error);
    res.status(500).json({ message: "Failed to load newsletter stats." });
  }
};

// Admin — compose-and-send broadcast to every active subscriber. This is
// the real "hiring trends" half of the footer's promise: subscribers were
// previously stored and never emailed anything at all.
const broadcastNewsletter = async (req, res) => {
  const subject = (req.body?.subject || "").trim();
  const message = (req.body?.message || "").trim();

  if (!subject || !message) {
    return res.status(400).json({ message: "Subject and message are required." });
  }

  try {
    const subscribers = await NewsletterSubscriber.find({ isActive: true }).select("email").lean();

    let sent = 0;
    let failed = 0;
    for (const sub of subscribers) {
      const footer = unsubscribeFooter(sub.email);
      try {
        await sendMail(
          sub.email,
          subject,
          `${message}${footer.text}`,
          `<div style="font-family:sans-serif;color:#1e293b;line-height:1.6;">${message.replace(/\n/g, "<br/>")}</div>${footer.html}`
        );
        sent++;
      } catch (sendError) {
        // One bad/bouncing address must not abort the whole broadcast —
        // log it and keep going, same "never let one failure take down an
        // unrelated flow" rule sendNotification() already follows.
        console.error(`Newsletter broadcast: failed to send to ${sub.email}:`, sendError.message);
        failed++;
      }
    }

    res.json({
      message: `Newsletter sent to ${sent} subscriber${sent === 1 ? "" : "s"}${failed ? ` (${failed} failed)` : ""}.`,
      sent,
      failed,
      total: subscribers.length,
    });
  } catch (error) {
    console.error("Error broadcasting newsletter:", error);
    res.status(500).json({ message: "Failed to send newsletter." });
  }
};

module.exports = { subscribe, unsubscribe, getNewsletterStats, broadcastNewsletter };
