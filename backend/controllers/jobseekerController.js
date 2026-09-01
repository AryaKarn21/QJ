const User = require("../models/User");
const Jobseeker = require("../models/Jobseeker");
const Job = require("../models/Job");
const Application = require("../models/Application");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { SAFE_USER_FIELDS } = require("../utils/safeUserFields");
const {
  JOBSEEKER_STATUSES,
  VISIBILITY_OPTIONS,
  sanitizeStringList,
} = require("../utils/profileStatus");

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

// Delete a previously stored upload file.
// `storedPath` is the full root-relative path as saved in DB,
// e.g. "/uploads/profile_pics/abc.png" — we resolve it against the
// backend root so we never build a double-subfolder path.
const deleteFile = (storedPath) => {
  if (!storedPath) return;
  // storedPath is e.g. "/uploads/profile_pics/uuid.png"
  const filePath = path.join(__dirname, "..", storedPath);
  fs.unlink(filePath, (err) => {
    if (err) console.error(`Failed to delete file: ${filePath}`, err.message);
  });
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

    const { name, skills, qualifications, experiences, projects, certifications } = req.body;

    if (name !== undefined) jobseeker.name = name;
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

    // Handle profilePic file — delete old file using the full stored path
    if (req.files?.profilePic) {
      if (jobseeker.profilePic) deleteFile(jobseeker.profilePic);
      jobseeker.profilePic = `/uploads/profile_pics/${req.files.profilePic[0].filename}`;
    }

    // Handle coverPhoto file — same upload field the Employer profile
    // already uses (userUploadMiddleware.js already had "coverPhoto"
    // wired for storage/validation; this is the first jobseeker-side
    // consumer of it).
    if (req.files?.coverPhoto) {
      if (jobseeker.coverPhoto) deleteFile(jobseeker.coverPhoto);
      jobseeker.coverPhoto = `/uploads/cover_photos/${req.files.coverPhoto[0].filename}`;
    } else if (req.body.removeCoverPhoto === "true" || req.body.removeCoverPhoto === true) {
      // Explicit removal — FormData booleans arrive as strings, so both
      // forms are checked. Only reachable for the authenticated user's own
      // record (jobseeker was loaded via req.user.id above), never a
      // frontend-supplied id.
      if (jobseeker.coverPhoto) deleteFile(jobseeker.coverPhoto);
      jobseeker.coverPhoto = null;
    }

    // Handle resume file
    if (req.files?.resume) {
      if (jobseeker.resume) deleteFile(jobseeker.resume);
      jobseeker.resume = `/uploads/resumes/${req.files.resume[0].filename}`;
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
    const jobseekerId = req.user.id;

    const applications = await Application.find({ applicant: jobseekerId })
      .populate({
        path: "job",
        populate: {
          path: "employer",
          select: "name email",
        },
      })
      .select("job status createdAt");

    const jobsWithStatus = applications.map((app) => ({
      ...app.job.toObject(),
      applicationStatus: app.status,
      appliedAt: app.createdAt,
    }));

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
    };

    stats.forEach((stat) => {
      result.totalApplications += stat.count;
      switch (stat._id) {
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

module.exports = {
  getJobseekerProfile,
  updateJobseekerProfile,
  getAppliedJobs,
  getDashboardStats,
  updateJobseekerStatus,
};