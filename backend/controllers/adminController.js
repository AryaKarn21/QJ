const Job = require("../models/Job");
const User = require("../models/User");
const Jobseeker = require("../models/Jobseeker");
const Employer = require("../models/Employer");
const Recruiter = require("../models/Recruiter");
const Mentor = require("../models/Mentor");
const Application = require("../models/Application");
const Post = require("../models/Post");
const Blog = require("../models/Blog");
const JobCategory = require("../models/JobCategory");
const BlogCategory = require("../models/BlogCategory");
const Report = require("../models/Report");
const Resume = require("../models/Resume");
const Bookmark = require("../models/Bookmark");
const Comment = require("../models/Comment");
const sendNotification = require("../utils/sendNotifications");
const { SAFE_USER_FIELDS } = require("../utils/safeUserFields");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const {
  UPDATABLE_JOB_FIELDS,
  deriveSalaryString,
  deriveExperienceString,
} = require("../utils/jobHelpers");
const { recordAdminAudit } = require("../utils/auditLogger");

// Create a new admin account (superadmin only). This is the ONLY way an
// admin account should be created after initial setup — the public
// /register endpoint deliberately rejects role: 'admin' or 'superadmin'.
const createAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new User({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      isVerified: true,
      emailVerified: true,
      authMethod: "email",
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Admin account created successfully.",
      admin: { id: newAdmin._id, name: newAdmin.name, email: newAdmin.email, role: newAdmin.role },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ message: "Server error while creating admin." });
  }
};

// Get Admin Profile
const getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id).select(SAFE_USER_FIELDS);

    if (!admin || (admin.role !== "admin" && admin.role !== "superadmin")) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json(admin);
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Admin Stats - Complete Top 12 Platform Statistics with real live data
const getAdminStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalJobseekers,
      totalEmployers,
      totalRecruiters,
      totalMentors,
      totalJobs,
      activeJobs,
      pendingJobs,
      totalApplications,
      totalCommunityPosts,
      totalBlogs,
      jobCategoriesCount,
      blogCategoriesCount,
      totalReports,
      pendingReports,
      pendingCompanies,
      // 30-day counts for real trend calculation
      usersLast30,
      jobsLast30,
      applicationsLast30,
      postsLast30,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "jobseeker" }),
      User.countDocuments({ role: "employer" }),
      User.countDocuments({ role: "recruiter" }),
      User.countDocuments({ role: "mentor" }),
      Job.countDocuments({ status: { $ne: "Draft" } }),
      Job.countDocuments({ status: "Active" }),
      Job.countDocuments({ status: "Pending" }),
      Application.countDocuments(),
      Post.countDocuments({ isDeleted: false }),
      Blog.countDocuments(),
      JobCategory.countDocuments(),
      BlogCategory.countDocuments(),
      Report.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      Employer.countDocuments({ verificationStatus: "Pending" }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Job.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, status: { $ne: "Draft" } }),
      Application.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Post.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, isDeleted: false }),
    ]);

    const totalJobProviders = totalEmployers + totalRecruiters;
    const totalCategories = jobCategoriesCount + blogCategoriesCount;
    const pendingApprovals = pendingJobs + pendingCompanies + pendingReports;

    const calcGrowth = (newCount, total) => {
      const prev = total - newCount;
      if (prev <= 0) return newCount > 0 ? 100 : 0;
      return Math.round((newCount / prev) * 100);
    };

    res.status(200).json({
      // 12 Requested Top Metrics
      totalUsers,
      totalJobseekers,
      totalJobProviders,
      totalJobs,
      activeJobs,
      pendingJobs,
      totalApplications,
      totalCommunityPosts,
      totalBlogs,
      totalCategories,
      totalReports,
      pendingApprovals,
      // Granular sub-counts
      totalRecruiters,
      totalMentors,
      jobCategoriesCount,
      blogCategoriesCount,
      pendingReports,
      pendingCompanies,
      trends: {
        usersGrowth: calcGrowth(usersLast30, totalUsers),
        jobsGrowth: calcGrowth(jobsLast30, totalJobs),
        applicationsGrowth: calcGrowth(applicationsLast30, totalApplications),
        postsGrowth: calcGrowth(postsLast30, totalCommunityPosts),
      },
    });
  } catch (error) {
    console.error("Error getting admin stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify Employer
const verifyEmployer = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== "employer") {
      return res.status(400).json({ message: "User is not an employer" });
    }

    user.isVerified = !user.isVerified;
    await user.save();

    await sendNotification({
      recipient: user._id,
      type: "account_verification",
      message: user.isVerified
        ? "Your account has been verified by Star Jobs."
        : "Your account has been banned Star Jobs.",
      link: "/employer/profile",
    });

    res.json({
      message: user.isVerified
        ? "Employer verified successfully"
        : "Employer banned successfully",
    });
  } catch (error) {
    console.error("Error verifying employer status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get All Applicants for Employer Jobs
const getAllApplicantsForEmployerJobs = async (req, res) => {
  const employerId = req.params.employerId;

  try {
    const jobs = await Job.find({ employer: employerId }).select("_id title");

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ message: "No jobs found for this employer" });
    }

    const jobIds = jobs.map((job) => job._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      .populate("applicant", "name profilePic email")
      .populate("job", "title");

    res.json(applications);
  } catch (error) {
    console.error("Error fetching applicants for employer:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Application Status
const updateApplication = async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body;

  const validStatuses = ["Pending", "Reviewed", "Accepted", "Rejected"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    application.status = status;
    await application.save();

    await sendNotification({
      recipient: application.applicant,
      // Was "application_status", which isn't in Notification.js's `type`
      // enum (only "application_update"/"job_status_update" exist) — every
      // notification this call tried to create failed Mongoose validation
      // and was silently dropped (sendNotification catches and logs).
      type: "application_update",
      message: `Your application status has been updated to: ${status}`,
      relatedApplication: application._id,
      link: "/user/applications",
    });

    res.json({ message: "Application status updated", application });
  } catch (error) {
    console.error("Error updating application:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get All Applications
const getAllApplications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const [applications, total] = await Promise.all([
      Application.find()
        .populate("applicant", "name email profilePic")
        .populate({ path: "job", select: "title employer", populate: { path: "employer", select: "name email" } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Application.countDocuments(),
    ]);

    res.json({ applications, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching all applications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get All Users — SECURITY FIX: always strip password hash from every
// result set. Previously called .find() with no field projection, which
// sent bcrypt hashes to the frontend for every user role.
// (SAFE_USER_FIELDS now lives in ../utils/safeUserFields.js so every
// controller that needs it — not just this one — uses the same list.)
const getAllUsers = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const { role, status, search } = req.query;

    const query = {};
    if (role && role !== "all") {
      query.role = role;
    }
    if (status === "active") {
      query.isActive = { $ne: false };
      query.lockUntil = { $not: { $gt: new Date() } };
    } else if (status === "deactivated") {
      query.isActive = false;
    } else if (status === "suspended") {
      query.lockUntil = { $gt: new Date() };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (page && limit) {
      const [users, total] = await Promise.all([
        User.find(query)
          .select(SAFE_USER_FIELDS)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ]);
      return res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
    }

    const users = await User.find(query).select(SAFE_USER_FIELDS).sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin" || user.role === "superadmin") {
      return res.status(403).json({ message: "Admins cannot be deleted" });
    }

    await User.findByIdAndDelete(userId);

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin deleted User #${userId}`,
      contentType: "User",
      contentId: userId,
      details: { email: user.email, name: user.name, role: user.role },
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Promote a user to admin / demote an admin back down — superadmin only.
const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!["promote", "demote"].includes(action)) {
    return res.status(400).json({ message: "Action must be 'promote' or 'demote'." });
  }

  try {
    const user = await User.findById(id).select("role email name");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (String(id) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot change your own role." });
    }

    if (user.role === "superadmin") {
      return res.status(403).json({ message: "Superadmin role cannot be changed here." });
    }

    let newRole;
    if (action === "promote") {
      if (user.role === "admin") {
        return res.status(400).json({ message: "User is already an admin." });
      }
      newRole = "admin";
    } else {
      if (user.role !== "admin") {
        return res.status(400).json({ message: "Only admins can be demoted." });
      }
      newRole = "jobseeker";
    }

    await User.findByIdAndUpdate(id, { role: newRole });

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin ${action}d User #${user._id} to ${newRole}`,
      contentType: "User",
      contentId: user._id,
      details: { email: user.email, oldRole: user.role, newRole },
    });

    res.json({ message: `User role updated to ${newRole}.` });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update User Status (Activate, Deactivate, Suspend)
const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason, durationDays } = req.body; // status: "active" | "deactivated" | "suspended"

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Cannot modify superadmin status." });
    }

    let actionLabel = "";
    if (status === "active") {
      user.isActive = true;
      user.lockUntil = undefined;
      user.failedLoginAttempts = 0;
      user.deactivatedAt = undefined;
      actionLabel = "activated";
    } else if (status === "deactivated") {
      user.isActive = false;
      user.deactivatedAt = new Date();
      actionLabel = "deactivated";
    } else if (status === "suspended") {
      user.isActive = false;
      const days = parseInt(durationDays) || 30;
      user.lockUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      user.deactivatedAt = new Date();
      actionLabel = `suspended for ${days} days`;
    } else {
      return res.status(400).json({ message: "Invalid status. Must be 'active', 'deactivated', or 'suspended'." });
    }

    await user.save();

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin ${actionLabel} User #${user._id}`,
      contentType: "User",
      contentId: user._id,
      details: { email: user.email, role: user.role, status, reason },
    });

    sendNotification({
      recipient: user._id,
      type: "account_verification",
      message: status === "active"
        ? "Your account has been reactivated."
        : `Your account has been ${actionLabel}. Reason: ${reason || "Policy violation."}`,
      link: "/",
    });

    const safeUser = await User.findById(user._id).select(SAFE_USER_FIELDS);
    res.json({ message: `User ${actionLabel} successfully.`, user: safeUser });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Deep User Details for Admin Modal
const getUserDetailsAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select(SAFE_USER_FIELDS);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let extraData = {};
    if (user.role === "jobseeker") {
      const [resumes, applications, savedJobsCount, postsCount] = await Promise.all([
        Resume.find({ user: id }).select("title templateId isDefault updatedAt").lean(),
        Application.find({ applicant: id })
          .populate("job", "title employer location")
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        Bookmark.countDocuments({ user: id }),
        Post.countDocuments({ author: id, isDeleted: false }),
      ]);
      extraData = { resumes, applications, savedJobsCount, postsCount };
    } else if (user.role === "employer" || user.role === "recruiter") {
      const [postedJobs, applicantsCount] = await Promise.all([
        Job.find({ employer: id }).select("title status jobtype openings deadline createdAt").sort({ createdAt: -1 }).limit(10).lean(),
        Application.countDocuments({ "job.employer": id }).catch(() => 0),
      ]);
      extraData = { postedJobs, applicantsCount };
    }

    res.json({ user, ...extraData });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get All Jobs
const getAllJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status;
    const category = req.query.category || req.query.jobcategory;
    const employer = req.query.employer;
    const jobtype = req.query.jobtype;
    const location = req.query.location;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const query = {};
    if (status && status !== "all") {
      query.status = status;
    } else {
      query.status = { $ne: "Draft" };
    }

    if (category && category !== "all") {
      query.jobcategory = category;
    }
    if (employer) {
      query.employer = employer;
    }
    if (jobtype && jobtype !== "all") {
      query.jobtype = jobtype;
    }
    if (location) {
      query.location = { $regex: location, $options: "i" };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { "companyOverride.name": { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate("employer", "name email companyLogo isVerified")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Job.countDocuments(query),
    ]);

    res.json({ jobs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching all jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a Job as Admin
const createAdminJob = async (req, res) => {
  try {
    const {
      employer,
      title,
      country,
      location,
      jobtype,
      salary,
      experience,
      jobcategory,
      level,
      deadline,
      openings,
      istrending,
      status = "Active",
      description,
      department,
      workMode,
      minExperience,
      maxExperience,
      salaryMin,
      salaryMax,
      salaryPeriod,
      currency,
      overview,
      responsibilities,
      requirements,
      requiredSkills,
      preferredSkills,
      education,
      benefits,
      perks,
      workingHours,
      companyOverride,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Job title is required." });
    }

    let assignedEmployer = employer;
    if (!assignedEmployer) {
      const defaultEmployer = await User.findOne({ role: "employer", isActive: { $ne: false } }).select("_id").lean();
      assignedEmployer = defaultEmployer ? defaultEmployer._id : req.user._id;
    }

    const derivedSalary = deriveSalaryString({ salary, salaryMin, salaryMax, currency, salaryPeriod });
    const derivedExperience = deriveExperienceString({ experience, minExperience, maxExperience });

    const job = new Job({
      employer: assignedEmployer,
      title,
      country,
      location,
      jobtype,
      salary: derivedSalary,
      experience: derivedExperience,
      jobcategory,
      level,
      deadline,
      openings: openings ? Number(openings) : undefined,
      istrending: !!istrending,
      status,
      description,
      department,
      workMode,
      minExperience: minExperience ? Number(minExperience) : undefined,
      maxExperience: maxExperience ? Number(maxExperience) : undefined,
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      salaryPeriod,
      currency,
      overview,
      responsibilities,
      requirements,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : undefined,
      preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : undefined,
      education,
      benefits: Array.isArray(benefits) ? benefits : undefined,
      perks,
      workingHours,
      companyOverride,
    });

    await job.save();

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin created Job Listing #${job._id}`,
      contentType: "Job",
      contentId: job._id,
      details: { title: job.title },
    });

    res.status(201).json({ message: "Job created successfully", job });
  } catch (error) {
    console.error("Error creating job by admin:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Edit a Job
const editJob = async (req, res) => {
  const { id: jobId } = req.params;
  const user = req.user;

  try {
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isAdmin) {
      return res.status(403).json({ message: "Not authorized to edit this job" });
    }

    UPDATABLE_JOB_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });

    if (req.body.employer) {
      job.employer = req.body.employer;
    }

    if (req.body.salary === undefined && (req.body.salaryMin !== undefined || req.body.salaryMax !== undefined)) {
      job.salary = deriveSalaryString({
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        salaryPeriod: job.salaryPeriod,
      });
    }

    if (req.body.experience === undefined && (req.body.minExperience !== undefined || req.body.maxExperience !== undefined)) {
      job.experience = deriveExperienceString({
        minExperience: job.minExperience,
        maxExperience: job.maxExperience,
      });
    }

    await job.save();

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin edited Job Listing #${job._id}`,
      contentType: "Job",
      contentId: job._id,
      details: { title: job.title },
    });

    res.json(job);
  } catch (error) {
    console.error("Error editing job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a Job
const deleteJob = async (req, res) => {
  const jobId = req.params.id;

  try {
    const job = await Job.findByIdAndDelete(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    try {
      if (typeof Application.deleteMany === "function") {
        await Application.deleteMany({ job: jobId });
      }
    } catch (err) {
      console.error("Failed to delete applications for job:", err);
    }

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin deleted Job Listing #${jobId}`,
      contentType: "Job",
      contentId: jobId,
      details: { title: job.title },
    });

    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Approve a job
const approveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    job.status = "Active";
    job.rejectionReason = "";
    await job.save();

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin approved Job Listing #${job._id}`,
      contentType: "Job",
      contentId: job._id,
      details: { title: job.title },
    });

    await sendNotification({
      recipient: job.employer,
      type: "job_approved",
      message: `Your job posting "${job.title}" has been approved and is now live.`,
      relatedJob: job._id,
      link: "/employer/dashboard",
    });

    res.json({ message: "Job approved", job });
  } catch (error) {
    console.error("Error approving job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reject a job
const rejectJob = async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    job.status = "Rejected";
    job.rejectionReason = reason || "Did not meet posting requirements.";
    await job.save();

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin rejected Job Listing #${job._id}`,
      contentType: "Job",
      contentId: job._id,
      details: { title: job.title, reason: job.rejectionReason },
    });

    await sendNotification({
      recipient: job.employer,
      type: "job_rejected",
      message: `Your job posting "${job.title}" was rejected: ${job.rejectionReason}`,
      relatedJob: job._id,
      link: "/employer/dashboard",
    });

    res.json({ message: "Job rejected", job });
  } catch (error) {
    console.error("Error rejecting job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Toggle trending status
const toggleTrendingStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    job.istrending = !job.istrending;
    await job.save();
    res.json({ message: `Job trending status updated to ${job.istrending}` });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get Daily Logged In Users Count
const getDailyLoggedInUsersCount = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const users = await User.find({
      lastLogin: { $gte: startOfToday, $lte: endOfToday },
    }).select("name email lastLogin role");

    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.error("Error fetching daily logged in users:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get all companies — SECURITY FIX: strip password and sensitive fields
const getAllCompanies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [companies, total] = await Promise.all([
      Employer.find(query)
        .select(SAFE_USER_FIELDS)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Employer.countDocuments(query),
    ]);

    res.json({ companies, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify a company (KYC approved)
const verifyCompany = async (req, res) => {
  try {
    const employer = await Employer.findById(req.params.id);
    if (!employer) return res.status(404).json({ message: "Company not found" });

    employer.verificationStatus = "Verified";
    employer.verificationNote = "";
    employer.isVerified = true;
    await employer.save();

    await sendNotification({
      recipient: employer._id,
      type: "account_verification",
      message: "Your company has been verified by QuickJob.",
      link: "/employer/profile",
    });

    // SECURITY FIX: `employer` above is the full Mongoose doc (needed for
    // `.save()`) — sending it straight back with `res.json(employer)` put
    // the password hash (and OTP/lockout fields) in the response body,
    // since it had no field projection at all. Re-select with the same
    // safe projection every other "return this account" endpoint uses.
    const safeEmployer = await Employer.findById(employer._id).select(SAFE_USER_FIELDS);
    res.json(safeEmployer);
  } catch (error) {
    console.error("Error verifying company:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reject a company's verification (KYC declined)
const rejectCompany = async (req, res) => {
  try {
    const { reason } = req.body;
    const employer = await Employer.findById(req.params.id);
    if (!employer) return res.status(404).json({ message: "Company not found" });

    employer.verificationStatus = "Rejected";
    employer.verificationNote = reason || "Did not meet verification requirements.";
    employer.isVerified = false;
    await employer.save();

    await sendNotification({
      recipient: employer._id,
      type: "account_verification",
      message: `Your company verification was declined: ${employer.verificationNote}`,
      link: "/employer/profile",
    });

    // SECURITY FIX: see verifyCompany above — same unprojected-doc leak.
    const safeEmployer = await Employer.findById(employer._id).select(SAFE_USER_FIELDS);
    res.json(safeEmployer);
  } catch (error) {
    console.error("Error rejecting company:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Company details as Admin
const updateCompanyAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, website, location, bio } = req.body;

    const employer = await Employer.findById(id);
    if (!employer) return res.status(404).json({ message: "Company not found." });

    if (name) employer.name = name;
    if (email) employer.email = email;
    if (website !== undefined) employer.website = website;
    if (location !== undefined) employer.location = location;
    if (bio !== undefined) employer.bio = bio;

    await employer.save();

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin edited Company #${employer._id}`,
      contentType: "Employer",
      contentId: employer._id,
      details: { name: employer.name, email: employer.email },
    });

    const safe = await Employer.findById(employer._id).select(SAFE_USER_FIELDS);
    res.json({ message: "Company updated successfully.", company: safe });
  } catch (error) {
    console.error("Error updating company by admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Suspend / Restore Company
const toggleCompanySuspendAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: "suspend" | "restore"

    const employer = await Employer.findById(id);
    if (!employer) return res.status(404).json({ message: "Company not found." });

    if (action === "suspend") {
      employer.isActive = false;
      employer.deactivatedAt = new Date();
    } else {
      employer.isActive = true;
      employer.deactivatedAt = undefined;
    }

    await employer.save();

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin ${action}ed Company #${employer._id}`,
      contentType: "Employer",
      contentId: employer._id,
      details: { action, reason },
    });

    const safe = await Employer.findById(employer._id).select(SAFE_USER_FIELDS);
    res.json({ message: `Company ${action}ed successfully.`, company: safe });
  } catch (error) {
    console.error("Error toggling company suspend:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Bulk Job Action: Approve, Reject, Feature, Unfeature, Delete, Suspend, Restore
const bulkJobAction = async (req, res) => {
  const { jobIds, action, reason } = req.body;

  if (!Array.isArray(jobIds) || jobIds.length === 0 || !action) {
    return res.status(400).json({ message: "jobIds array and action are required." });
  }

  try {
    let update = {};

    switch (action) {
      case "approve":
        update = { status: "Active", rejectionReason: "" };
        break;
      case "reject":
        update = { status: "Rejected", rejectionReason: reason || "Did not meet requirements." };
        break;
      case "feature":
        update = { istrending: true };
        break;
      case "unfeature":
        update = { istrending: false };
        break;
      case "suspend":
        update = { status: "Suspended" };
        break;
      case "restore":
        update = { status: "Active" };
        break;
      case "delete":
        await Job.deleteMany({ _id: { $in: jobIds } });
        await Application.deleteMany({ job: { $in: jobIds } }).catch(() => {});
        await recordAdminAudit({
          user: req.user,
          action: `Super Admin bulk deleted ${jobIds.length} jobs`,
          contentType: "Job",
          details: { jobIds, count: jobIds.length },
        });
        return res.json({ message: `Successfully deleted ${jobIds.length} jobs.` });
      default:
        return res.status(400).json({ message: `Invalid action: ${action}` });
    }

    await Job.updateMany({ _id: { $in: jobIds } }, { $set: update });

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin bulk ${action} on ${jobIds.length} jobs`,
      contentType: "Job",
      details: { jobIds, action, count: jobIds.length, update },
    });

    res.json({ message: `Successfully applied '${action}' to ${jobIds.length} jobs.` });
  } catch (error) {
    console.error("Error performing bulk job action:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Single Job Status (Suspend, Restore, Feature, Unfeature)
const updateJobStatus = async (req, res) => {
  const { id } = req.params;
  const { status, istrending } = req.body;

  try {
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    if (status !== undefined) job.status = status;
    if (istrending !== undefined) job.istrending = !!istrending;

    await job.save();

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin updated status for Job #${job._id} to ${job.status}`,
      contentType: "Job",
      contentId: job._id,
      details: { status: job.status, istrending: job.istrending },
    });

    res.json({ message: "Job status updated successfully.", job });
  } catch (error) {
    console.error("Error updating job status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all community posts for admin
const getAllCommunityPostsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const { status, search } = req.query;

    const query = {};
    if (status === "deleted") {
      query.isDeleted = true;
    } else if (status === "flagged") {
      query["moderation.status"] = "flagged";
      query.isDeleted = false;
    } else if (status === "removed") {
      query["moderation.status"] = "removed";
    } else if (status === "approved") {
      query["moderation.status"] = "approved";
      query.isDeleted = false;
    } else if (status && status !== "all") {
      query["moderation.status"] = status;
    }

    if (search) {
      query.content = { $regex: search, $options: "i" };
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate("author", "name email profilePic role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching community posts for admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update community post status (hide, restore, approve, remove)
const updateCommunityPostStatusAdmin = async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (action === "hide" || action === "delete") {
      post.isDeleted = true;
      post.moderation.status = "removed";
      post.moderation.reason = reason || "Hidden by administrator.";
    } else if (action === "restore") {
      post.isDeleted = false;
      post.moderation.status = "approved";
      post.moderation.reason = "";
    } else if (action === "approve") {
      post.isDeleted = false;
      post.moderation.status = "approved";
      post.moderation.reviewedBy = req.user._id;
      post.moderation.reviewedAt = new Date();
    } else {
      return res.status(400).json({ message: "Invalid action." });
    }

    await post.save();

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin ${action} on Community Post #${post._id}`,
      contentType: "Post",
      contentId: post._id,
      details: { action, reason },
    });

    res.json({ message: `Post ${action}d successfully.`, post });
  } catch (error) {
    console.error("Error updating post status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all community comments for admin
const getAllCommunityCommentsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search, postId } = req.query;

    const query = {};
    if (postId) query.post = postId;
    if (search) query.content = { $regex: search, $options: "i" };

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate("author", "name email profilePic role")
        .populate("post", "content")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query),
    ]);

    res.json({ comments, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching comments for admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete community comment by admin
const deleteCommunityCommentAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    comment.isDeleted = true;
    await comment.save();

    await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -1 } });

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin deleted Comment #${comment._id}`,
      contentType: "Comment",
      contentId: comment._id,
      details: { content: comment.content?.slice(0, 100), author: comment.author },
    });

    res.json({ message: "Comment deleted successfully." });
  } catch (error) {
    console.error("Error deleting comment by admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all blogs for admin (including drafts, category, and search filter)
const getAllBlogsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const { status, category, search } = req.query;

    const query = {};
    if (status === "published") {
      query.isPublished = true;
    } else if (status === "draft") {
      query.isPublished = false;
    }
    if (category && category !== "all") {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .populate("author", "name email profilePic role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Blog.countDocuments(query),
    ]);

    res.json({ blogs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching blogs for admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update blog status (publish / unpublish / draft) by admin
const updateBlogStatusAdmin = async (req, res) => {
  const { id } = req.params;
  const { isPublished } = req.body;

  try {
    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ message: "Blog not found." });

    blog.isPublished = !!isPublished;
    if (blog.isPublished && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
    await blog.save();

    await recordAdminAudit({
      user: req.user,
      action: `Super Admin ${blog.isPublished ? "published" : "unpublished"} Blog #${blog._id}`,
      contentType: "Blog",
      contentId: blog._id,
      details: { title: blog.title, isPublished: blog.isPublished },
    });

    res.json({ message: `Blog ${blog.isPublished ? "published" : "moved to draft"}.`, blog });
  } catch (error) {
    console.error("Error updating blog status by admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createAdmin,
  getAdminProfile,
  toggleTrendingStatus,
  getAdminStats,
  verifyEmployer,
  getAllApplicantsForEmployerJobs,
  updateApplication,
  getAllApplications,
  getAllUsers,
  deleteUser,
  updateUserRole,
  updateUserStatus,
  getUserDetailsAdmin,
  getAllJobs,
  createAdminJob,
  editJob,
  deleteJob,
  bulkJobAction,
  updateJobStatus,
  getDailyLoggedInUsersCount,
  approveJob,
  rejectJob,
  getAllCompanies,
  verifyCompany,
  rejectCompany,
  updateCompanyAdmin,
  toggleCompanySuspendAdmin,
  getAllCommunityPostsAdmin,
  updateCommunityPostStatusAdmin,
  getAllCommunityCommentsAdmin,
  deleteCommunityCommentAdmin,
  getAllBlogsAdmin,
  updateBlogStatusAdmin,
};