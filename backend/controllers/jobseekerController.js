const User = require("../models/User");
const Jobseeker = require("../models/Jobseeker");
const Job = require("../models/Job");
const Application = require("../models/Application");
const mongoose = require("mongoose");
const { persistUpload, deleteStoredFile } = require("../services/media.service");
const { SAFE_USER_FIELDS } = require("../utils/safeUserFields");
const {
  JOBSEEKER_STATUSES,
  VISIBILITY_OPTIONS,
  sanitizeStringList,
} = require("../utils/profileStatus");
const bcrypt = require("bcryptjs");
const sendNotification = require("../utils/sendNotifications");

// Get Jobseeker Profile
const getJobseekerProfile = async (req, res) => {
  try {
    // `-password` alone still leaked otpCode/otpExpires/failedLoginAttempts/
    // lockUntil/lastLoginIP — see utils/safeUserFields.js.
    const jobseeker = await User.findById(req.user.id).select(SAFE_USER_FIELDS);
    if (!jobseeker || jobseeker.role !== "jobseeker") {
      return res.status(404).json({ message: "Jobseeker not found" });
    }
    res.json(jobseeker);
  } catch (error) {
    console.error("Error in getJobseekerProfile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// The client sends `experiences[].companyId` verbatim from the "link to a
// real company" picker (see CompanySearchInput.tsx). Nothing prevented a
// crafted/stale payload from setting a `companyId` that isn't a real,
// active Employer account — this would let a jobseeker's public profile
// claim to work at an arbitrary/nonexistent company id. We only trust a
// `companyId` that resolves to an actual `role: "employer"` User; any
// other value is dropped back to null (the free-text `institution` name
// the user typed is always preserved either way).
const sanitizeExperienceCompanyLinks = async (experiences) => {
  if (!Array.isArray(experiences) || experiences.length === 0) return experiences;

  const candidateIds = [
    ...new Set(
      experiences
        .map((exp) => exp?.companyId)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
        .map(String)
    ),
  ];
  if (candidateIds.length === 0) {
    return experiences.map((exp) => ({ ...exp, companyId: null }));
  }

  const validCompanies = await User.find({
    _id: { $in: candidateIds },
    role: "employer",
    isActive: { $ne: false },
  })
    .select("_id")
    .lean();
  const validIds = new Set(validCompanies.map((c) => String(c._id)));

  return experiences.map((exp) => ({
    ...exp,
    companyId: exp?.companyId && validIds.has(String(exp.companyId)) ? exp.companyId : null,
  }));
};

const updateJobseekerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobseeker = await Jobseeker.findById(userId);

    if (!jobseeker || jobseeker.role !== "jobseeker") {
      return res.status(404).json({ message: "Jobseeker not found" });
    }

    const { name, skills, qualifications, experiences, projects, certifications, bio, headline, removeResume } = req.body;

    if (name !== undefined) jobseeker.name = name;
    if (bio !== undefined) jobseeker.bio = typeof bio === "string" ? bio.trim().slice(0, 600) : "";
    if (headline !== undefined) jobseeker.headline = typeof headline === "string" ? headline.trim().slice(0, 160) : "";
    if (skills !== undefined)
      jobseeker.skills = Array.isArray(skills) ? skills : skills.split(",").map((s) => s.trim()).filter(Boolean);
    if (qualifications !== undefined)
      jobseeker.qualifications = JSON.parse(qualifications);
    if (experiences !== undefined) {
      const parsedExperiences = JSON.parse(experiences);
      jobseeker.experiences = await sanitizeExperienceCompanyLinks(parsedExperiences);
    }
    if (projects !== undefined) jobseeker.projects = JSON.parse(projects);
    if (certifications !== undefined) jobseeker.certifications = JSON.parse(certifications);

    // Handle profilePic file — persistUpload writes to Supabase Storage
    // when configured (services/media.service.js), local disk otherwise;
    // old file (either kind) is deleted only after the new one saves
    // successfully, so a failed upload never leaves the user with no
    // photo. ownerId namespaces the storage path so one user's upload can
    // never land in (or overwrite) another user's folder.
    if (req.files?.profilePic) {
      const oldPhoto = jobseeker.profilePic;
      jobseeker.profilePic = await persistUpload(req.files.profilePic[0], "profile_pics", jobseeker._id);
      if (oldPhoto) deleteStoredFile(oldPhoto);
    }

    // Handle coverPhoto file — same upload field the Employer profile
    // already uses (userUploadMiddleware.js already had "coverPhoto"
    // wired for storage/validation; this is the first jobseeker-side
    // consumer of it).
    if (req.files?.coverPhoto) {
      const oldCover = jobseeker.coverPhoto;
      jobseeker.coverPhoto = await persistUpload(req.files.coverPhoto[0], "cover_photos", jobseeker._id);
      if (oldCover) deleteStoredFile(oldCover);
    } else if (req.body.removeCoverPhoto === "true" || req.body.removeCoverPhoto === true) {
      // Explicit removal — FormData booleans arrive as strings, so both
      // forms are checked. Only reachable for the authenticated user's own
      // record (jobseeker was loaded via req.user.id above), never a
      // frontend-supplied id.
      if (jobseeker.coverPhoto) deleteStoredFile(jobseeker.coverPhoto);
      jobseeker.coverPhoto = null;
    }

    // Handle resume file
    if (req.files?.resume) {
      const oldResume = jobseeker.resume;
      jobseeker.resume = await persistUpload(req.files.resume[0], "resumes", jobseeker._id);
      if (oldResume) deleteStoredFile(oldResume);
    } else if (removeResume === "true" || removeResume === true) {
      if (jobseeker.resume) deleteStoredFile(jobseeker.resume);
      jobseeker.resume = null;
    }

    await jobseeker.save();

    // SECURITY FIX: `jobseeker` above is the full Mongoose doc (needed for
    // `.save()`) — sending it straight back leaked the password hash,
    // otpCode/otpExpires, lastLoginIP/UserAgent, etc. (same class of bug
    // fixed elsewhere via SAFE_USER_FIELDS — this update endpoint was
    // missed in that pass). Re-fetch with the safe projection instead of
    // hand-picking fields off the just-saved doc, so this can't drift out
    // of sync with SAFE_USER_FIELDS again.
    const safeJobseeker = await Jobseeker.findById(userId).select(SAFE_USER_FIELDS);
    res.json({ message: "Profile updated successfully", jobseeker: safeJobseeker });
  } catch (error) {
    console.error("Error in updateJobseekerProfile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Applied Jobs with application status
const getAppliedJobs = async (req, res) => {
  try {
    const jobseekerId = req.user._id || req.user.id;

    const applications = await Application.find({ applicant: jobseekerId })
      .populate({
        path: "job",
        populate: {
          path: "employer",
          select: "name email companyLogo",
        },
      })
      .select("job status createdAt interview")
      .sort({ createdAt: -1 });

    // Clean up any orphaned applications whose jobs have been deleted
    const orphanedAppIds = applications
      .filter((app) => !app || !app.job)
      .map((app) => app._id);
    if (orphanedAppIds.length > 0) {
      try {
        if (typeof Application.deleteMany === "function") {
          const resDel = Application.deleteMany({ _id: { $in: orphanedAppIds } });
          if (resDel && typeof resDel.catch === "function") {
            resDel.catch((err) =>
              console.error("Failed to clean up orphaned applications:", err)
            );
          }
        }
      } catch (err) {
        console.error("Failed to clean up orphaned applications:", err);
      }
    }

    const validApplications = applications.filter((app) => app && app.job);

    const jobsWithStatus = validApplications.map((app) => {
      const jobData =
        typeof app.job.toObject === "function" ? app.job.toObject() : app.job;
      return {
        ...jobData,
        applicationId: app._id,
        applicationStatus: app.status,
        appliedAt: app.createdAt,
        interview: app.interview,
      };
    });

    res.json(jobsWithStatus);
  } catch (error) {
    console.error("Error in getAppliedJobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Dashboard Stats
const getDashboardStats = async (req, res) => {
  try {
    const jobseekerId = req.user.id;

    const stats = await Application.aggregate([
      {
        $match: {
          applicant: new mongoose.Types.ObjectId(jobseekerId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      totalApplications: 0,
      pending: 0,
      reviewed: 0,
      accepted: 0,
      rejected: 0,
      // Application.js's status enum has a 5th value, "Interview
      // Scheduled" (set by employerController.js's updateApplication when
      // an employer schedules one) — this switch previously had no case
      // for it, so as soon as ANY application moved to that status, its
      // count vanished from every bucket below (while still counting
      // toward totalApplications, since that increment happens outside
      // the switch) — the exact "shows 0 everywhere right when I schedule
      // an interview" bug.
      interviewScheduled: 0,
    };

    stats.forEach((stat) => {
      result.totalApplications += stat.count;
      switch (stat._id) {
        case "Interview Scheduled":
          result.interviewScheduled = stat.count;
          break;
        case "Pending":
          result.pending = stat.count;
          break;
        case "Reviewed":
          result.reviewed = stat.count;
          break;
        case "Accepted":
          result.accepted = stat.count;
          break;
        case "Rejected":
          result.rejected = stat.count;
          break;
      }
    });

    res.json(result);
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update the job seeker's career-status ("Open to Opportunities" etc.) —
// deliberately separate from updateJobseekerProfile above: that endpoint
// is multipart (resume/photo uploads) and edits the full profile form;
// this one is a small, focused JSON PUT from the status editor drawer, so
// it doesn't need to round-trip the whole profile or go through multer.
//
// Security (per the feature spec): req.user.id from the authenticate
// middleware is the only source of truth for *whose* record this is —
// nothing here trusts a userId/role/statusType the client could send.
// Every enum is validated against the shared allow-lists in
// utils/profileStatus.js rather than trusting the client's strings.
const updateJobseekerStatus = async (req, res) => {
  try {
    const { status, targetRoles, preferredLocations, employmentTypes, visibility } = req.body;

    if (typeof status !== "string" || !JOBSEEKER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Please select a valid career status." });
    }
    if (visibility !== undefined && !VISIBILITY_OPTIONS.includes(visibility)) {
      return res.status(400).json({ message: "Please select a valid visibility option." });
    }

    const jobseeker = await Jobseeker.findById(req.user.id);
    if (!jobseeker || jobseeker.role !== "jobseeker") {
      return res.status(404).json({ message: "Jobseeker not found" });
    }

    jobseeker.profileStatus = {
      statusType: "JOB_SEEKER",
      status,
      targetRoles: sanitizeStringList(targetRoles),
      preferredLocations: sanitizeStringList(preferredLocations),
      employmentTypes: sanitizeStringList(employmentTypes),
      visibility: visibility || jobseeker.profileStatus?.visibility || "public",
      updatedAt: new Date(),
    };

    await jobseeker.save();

    res.json({
      message: "Career status updated successfully.",
      profileStatus: jobseeker.profileStatus,
    });
  } catch (error) {
    console.error("Error in updateJobseekerStatus:", error);
    res.status(500).json({ message: "Unable to update your status. Please try again." });
  }
};

// Update notification preferences
const updateNotificationPreferences = async (req, res) => {
  const jobseekerId = req.user._id || req.user.id;
  const { allNotifications, applicationStatus, newJobs, community } = req.body;

  try {
    const user = await User.findById(jobseekerId);
    if (!user || user.role !== "jobseeker") {
      return res.status(404).json({ message: "Jobseeker not found" });
    }

    if (!user.notificationPreferences) {
      user.notificationPreferences = {};
    }
    if (allNotifications !== undefined) {
      user.notificationPreferences.allNotifications = Boolean(allNotifications);
    }
    if (applicationStatus !== undefined) {
      user.notificationPreferences.applicationStatus = Boolean(applicationStatus);
    }
    if (newJobs !== undefined) {
      user.notificationPreferences.newJobs = Boolean(newJobs);
    }
    if (community !== undefined) {
      user.notificationPreferences.community = Boolean(community);
    }

    await user.save();

    res.status(200).json({
      message: "Notification preferences updated",
      notificationPreferences: user.notificationPreferences,
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Deactivate Jobseeker Account
const deactivateAccount = async (req, res) => {
  const jobseekerId = req.user._id || req.user.id;
  const { password } = req.body;

  if (!password) {
    return res
      .status(400)
      .json({ message: "Please enter your password to confirm deactivation." });
  }

  try {
    const jobseeker = await User.findById(jobseekerId);
    if (!jobseeker || jobseeker.role !== "jobseeker") {
      return res.status(404).json({ message: "Jobseeker not found" });
    }

    if (!jobseeker.password) {
      return res.status(400).json({
        message: "Password confirmation isn't available for accounts signed in with Google. Please contact support to deactivate.",
      });
    }

    const isMatch = await bcrypt.compare(password, jobseeker.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    jobseeker.isActive = false;
    jobseeker.deactivatedAt = new Date();
    await jobseeker.save();

    await sendNotification({
      recipient: jobseeker._id,
      type: "account_deactivated",
      message: "Your account has been deactivated.",
      link: "/user/profile",
    });

    res.status(200).json({ message: "Account deactivated successfully" });
  } catch (error) {
    console.error("Deactivate account error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getJobseekerProfile,
  updateJobseekerProfile,
  getAppliedJobs,
  getDashboardStats,
  updateJobseekerStatus,
  updateNotificationPreferences,
  deactivateAccount,
};