const mongoose = require("mongoose");

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    // Re-subscribing after an unsubscribe flips this back to true rather
    // than creating a duplicate document (email has a unique index).
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema);
