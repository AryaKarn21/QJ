const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "application_update",
        "new_application",
        "job_status_update",
        "password_reset",  
        "password_change",
        "job_application",
        "employer_registration",
        "job_post",
        "account_verification",
        "general_announcement",
        "support_ticket_reply",
        "job_approved",
        "job_rejected",
        "account_deactivated",
        // --- Community Feed module ---
        "post_like",
        "comment_like",
        "post_comment",
        "comment_reply",
        "post_share",
        "post_mention",
        "comment_mention",
        "new_follower",
        "connection_request",
        "connection_accepted",
        "new_message",
        "hiring_alert",
        "job_recommendation",
        "post_moderated",
        // --- Subscription module --- used by subscriptionController.js
        // but missing here until now: sendNotification() swallows the
        // resulting Mongoose ValidationError and just logs it (see
        // utils/sendNotifications.js), so every subscription-activated
        // notification was silently never created.
        "subscription_activated",
        // Fires the same way subscription_activated does, but for a
        // failed gateway verification (eSewa/Khalti) — an admin-facing
        // event, not sent to the subscriber.
        "subscription_payment_failed",
        // Admin-facing: mirrors "employer_registration" for the other
        // signup path (previously only employers triggered an admin
        // notification on registration).
        "jobseeker_registration",
        // Fired the first time a given viewer visits a profile — see
        // controllers/profileViewController.js. Not re-fired on repeat
        // visits from the same viewer.
        "profile_view",
        // Interview notifications
        "interview_scheduled",
        "interview_rescheduled",
        "interview_cancelled",
        // Fired 24h and 1h before a scheduled interview — see
        // utils/interviewReminderCron.js for the dedup-safe scheduler.
        "interview_reminder",
        // Technical/skills assessment workflow — greenfield, added
        // alongside models/Assessment.js.
        "assessment_assigned",
        "assessment_submitted",
        // A Job Provider's optional free-text message to a candidate,
        // attached to a status-change/interview/assessment action (see
        // the "Job Provider Custom Email" feature) — distinct from
        // "new_message" (the community/DM system) since this is tied to
        // a specific application, not a conversation thread.
        "job_provider_message",
      ],
    },
    message: {
      type: String,
      required: true,
    },
    // Who caused this notification (the liker/commenter/follower/etc).
    // Optional and only used by the community types above — every
    // pre-existing notification type keeps working without it.
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    relatedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    relatedApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
    },
    relatedRevenue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Revenue",
    },
    relatedTicket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
    },
    relatedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    relatedComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    relatedConversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    // Frontend deep-link, e.g. "/community/post/<id>" or "/messages/<conversationId>",
    // so the notification bell doesn't need type-specific routing logic.
    link: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);