const Notification = require("../models/Notification");
const User = require("../models/User");
const { emitToUser } = require("./socket");

// Extended with the Community module's fields (actor / relatedPost /
// relatedComment / relatedConversation / link) -- every existing caller
// that only passes {recipient, type, message, relatedJob, ...} keeps
// working unchanged since all new params are optional and default to null.
// Now also pushes a real-time "notification:new" event over Socket.IO so
// the notification bell updates instantly instead of waiting on a poll.
const sendNotification = async ({
  recipient,
  type,
  message,
  actor = null,
  relatedJob = null,
  relatedApplication = null,
  relatedRevenue = null,
  relatedTicket = null,
  relatedPost = null,
  relatedComment = null,
  relatedConversation = null,
  link = null,
}) => {
  try {
    // Don't notify someone about their own action (e.g. liking your own post).
    if (actor && recipient && String(actor) === String(recipient)) {
      return null;
    }

    const notification = await Notification.create({
      recipient,
      type,
      message,
      actor,
      relatedJob,
      relatedApplication,
      relatedRevenue,
      relatedTicket,
      relatedPost,
      relatedComment,
      relatedConversation,
      link,
    });

    emitToUser(recipient, "notification:new", {
      _id: notification._id,
      type: notification.type,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (error) {
    console.error("Failed to send notification:", error.message);
    return null;
  }
};

// Fan-out helper for every "notify the admin team" event (new registration,
// new job posting, failed subscription payment, …). Three call sites
// (userController.js, employerController.js, subscriptionController.js)
// each hand-rolled `User.find({ role: "admin" })` — which silently excludes
// every "superadmin" account, since that's a distinct role value (see
// User.js's enum and authMiddleware.js's authorizeAdmin, which already
// treats admin/superadmin as equivalent everywhere else). In a project
// whose only admin-tier account is a superadmin — the common case for a
// freshly-seeded instance — that bug means *zero* admin notifications were
// ever created, for anyone, ever: the notification center looks broken
// even though every event that should populate it is firing correctly.
// Centralizing the recipient query here means that mistake can only be
// made once, not once per call site.
async function notifyAllAdmins({ type, message, link = null, ...rest }) {
  const admins = await User.find({ role: { $in: ["admin", "superadmin"] } })
    .select("_id")
    .lean();
  return Promise.all(
    admins.map((admin) =>
      sendNotification({ recipient: admin._id, type, message, link, ...rest })
    )
  );
}

module.exports = sendNotification;
module.exports.notifyAllAdmins = notifyAllAdmins;
