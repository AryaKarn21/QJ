const NotificationSettings = require("../models/NotificationSettings");
const User = require("../models/User");
const Follow = require("../models/Follow");
const sendNotification = require("./sendNotifications");
const { sendJobPostedEmail } = require("../services/emailService");

/**
 * Notifies matching jobseekers via in-app notification and branded email
 * when a new job is published.
 *
 * @param {object} params
 * @param {object} params.job - Saved Job document or lean object
 * @param {object} [params.employer] - Optional employer User/Employer doc
 */
async function notifyJobSeekersOfNewJob({ job, employer }) {
  try {
    const settings = await NotificationSettings.findById(NotificationSettings.SINGLETON_ID).lean();
    const jobAlertMode = settings?.jobAlertMode || "matching";

    const employerId = employer?._id || job.employer?._id || job.employer;
    const employerName =
      job.companyOverride?.name?.trim() ||
      employer?.name?.trim() ||
      "QuickJobs Employer";

    const seekers = await User.find({
      role: "jobseeker",
      "notificationPreferences.newJobs": { $ne: false },
      isActive: { $ne: false },
    }).lean();

    let relevantSeekers;
    if (jobAlertMode === "all") {
      relevantSeekers = seekers.filter((s) => (s.notificationPreferences || {}).allNotifications !== false);
    } else if (jobAlertMode === "following") {
      const followerIds = await Follow.find({ following: employerId, followingType: "company" }).distinct("follower");
      const followerIdSet = new Set(followerIds.map(String));
      relevantSeekers = seekers.filter((s) => {
        const prefs = s.notificationPreferences || {};
        if (prefs.allNotifications === false) return false;
        return followerIdSet.has(String(s._id));
      });
    } else {
      // "matching" — location-based filter
      relevantSeekers = seekers.filter((s) => {
        const prefs = s.notificationPreferences || {};
        if (prefs.allNotifications === false) return false;
        const locMatch =
          s.location &&
          (s.location === job.location ||
            (Array.isArray(s.preferredLocations) && s.preferredLocations.includes(job.location)));
        return locMatch || !s.location;
      });
    }

    await Promise.all(
      relevantSeekers.map(async (seeker) => {
        try {
          await sendNotification({
            recipient: seeker._id,
            type: "job_recommendation",
            message: `New job "${job.title}" posted at ${job.location}`,
            relatedJob: job._id,
            link: `/jobs/${job._id}`,
          });

          if (seeker.notificationPreferences?.emailAlerts !== false && seeker.email) {
            await sendJobPostedEmail({
              recipient: seeker.email,
              candidateName: seeker.name || "Jobseeker",
              jobTitle: job.title,
              companyName: employerName,
              location: job.location,
              employmentType: job.jobtype,
              jobId: job._id,
              userId: seeker._id,
            });
          }
        } catch (itemErr) {
          console.error(`Failed to notify jobseeker ${seeker._id}:`, itemErr.message);
        }
      })
    );
  } catch (err) {
    console.error("Error in notifyJobSeekersOfNewJob:", err.message);
  }
}

module.exports = { notifyJobSeekersOfNewJob };
