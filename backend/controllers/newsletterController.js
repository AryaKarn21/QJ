const NewsletterSubscriber = require("../models/NewsletterSubscriber");

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

module.exports = { subscribe };
