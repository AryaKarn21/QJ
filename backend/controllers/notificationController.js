const User = require("../models/User");
const Notification = require("../models/Notification");
const Announcement = require("../models/Announcement");


exports.getJobseekerNotifications = async (req, res) => {
  try {
    // Fetch user-specific notifications
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .populate("relatedJob")
      .populate("relatedApplication")
      .populate("relatedRevenue");

    // Fetch announcements for jobseekers and all users
    const announcements = await Announcement.find({
      targetRole: { $in: ["jobseeker", "all"] },
    }).sort({ createdAt: -1 });

    // Merge and sort by date
    const merged = [...notifications, ...announcements].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(merged);
  } catch (error) {
    console.error("Error fetching jobseeker notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getEmployerNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .populate("relatedJob")
      .populate("relatedApplication")
      .populate("relatedRevenue");

    const announcements = await Announcement.find({
      targetRole: { $in: ["employer", "all"] },
    }).sort({ createdAt: -1 });

    const merged = [...notifications, ...announcements].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(merged);
  } catch (error) {
    console.error("Error fetching employer notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .populate("relatedJob")
      .populate("relatedApplication")
      .populate("relatedRevenue");

    const announcements = await Announcement.find({
      targetRole: { $in: ["admin", "all"] },
    }).sort({ createdAt: -1 });

    const merged = [...notifications, ...announcements].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(merged);
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
};




// --- Community module: unified, role-agnostic notification endpoints ---
// The three functions above are split per-role and merge in Announcements,
// which the Community module's notifications don't need. These are
// additive endpoints (own route, own path) so nothing above changes.

exports.getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("actor", "name role")
        .lean(),
      Notification.countDocuments({ recipient: req.user.id, isRead: false }),
    ]);

    res.json({ notifications, unreadCount, page, limit, hasMore: notifications.length === limit });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json({ notification });
  } catch (error) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/notification/:id — a user may only delete their own
// notification; the recipient filter (not just the :id) enforces that
// server-side rather than trusting the frontend to only show delete
// buttons on the requester's own notifications.
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id,
    });
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.generalAnnouncement = async (req, res) => {
  const { message, targetRole } = req.body;

  if (!message) {
    return res
      .status(400)
      .json({ message: "Announcement message is required" });
  }

  try {
    const announcement = new Announcement({
      message,
      targetRole: targetRole || "all",
      createdBy: req.user._id, 
    });

    await announcement.save();

    res
      .status(201)
      .json({ message: "Announcement created successfully", announcement });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ message: "Server error" });
  }
};
