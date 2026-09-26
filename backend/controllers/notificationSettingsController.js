const NotificationSettings = require("../models/NotificationSettings");

// GET /api/admin/notification-settings
const getNotificationSettings = async (req, res) => {
  try {
    const settings = await NotificationSettings.findOneAndUpdate(
      { _id: NotificationSettings.SINGLETON_ID },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(settings);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/admin/notification-settings — superadmin only, governs
// employerController.createJob's jobseeker-notification targeting mode
// (spec section 2: matching / following / all).
const updateNotificationSettings = async (req, res) => {
  const { jobAlertMode } = req.body;
  if (!["matching", "following", "all"].includes(jobAlertMode)) {
    return res.status(400).json({ message: "jobAlertMode must be one of matching, following, all" });
  }

  try {
    const settings = await NotificationSettings.findOneAndUpdate(
      { _id: NotificationSettings.SINGLETON_ID },
      { jobAlertMode, updatedBy: req.user.id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(settings);
  } catch (error) {
    console.error("Error updating notification settings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getNotificationSettings, updateNotificationSettings };
