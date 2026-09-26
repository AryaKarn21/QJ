const mongoose = require("mongoose");

// Singleton, same pattern as TrendingSettings.js — a fixed, well-known _id
// instead of a generated ObjectId, so "the notification settings" is
// always exactly one document.
//
// jobAlertMode governs employerController.createJob's jobseeker-fan-out
// when a job is published:
//   - "matching":  today's existing location-based filter (unchanged).
//   - "following": jobseekers who follow the posting employer's company
//                  (via the existing Follow model, followingType:"company").
//   - "all":       every jobseeker with notificationPreferences.newJobs
//                  not explicitly disabled, no location/follow filter.
const SINGLETON_ID = "notification-settings";

const notificationSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: SINGLETON_ID },
    jobAlertMode: {
      type: String,
      enum: ["matching", "following", "all"],
      default: "matching",
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

notificationSettingsSchema.statics.SINGLETON_ID = SINGLETON_ID;

module.exports = mongoose.model("NotificationSettings", notificationSettingsSchema);
