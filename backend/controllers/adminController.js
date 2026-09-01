const Job = require("../models/Job");
const User = require("../models/User");
const Jobseeker = require("../models/Jobseeker");
const Employer = require("../models/Employer");
const Recruiter = require("../models/Recruiter");
const Mentor = require("../models/Mentor");
const Application = require("../models/Application");
const sendNotification = require("../utils/sendNotifications");
const { SAFE_USER_FIELDS } = require("../utils/safeUserFields");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

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

// Get Admin Stats
const getAdminStats = async (req, res) => {
  try {
    const totalJobseekers = await User.countDocuments({ role: "jobseeker" });
    const totalEmployers = await User.countDocuments({ role: "employer" });
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();

    res.status(200).json({
      totalJobseekers,
      totalEmployers,
      totalJobs,
      totalApplications,
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
    const [jobseekers, employers, recruiters, mentors, admins] = await Promise.all([
      Jobseeker.find().select(SAFE_USER_FIELDS),
      Employer.find().select(SAFE_USER_FIELDS),
      Recruiter.find().select(SAFE_USER_FIELDS),
      Mentor.find().select(SAFE_USER_FIELDS),
      User.find({ role: { $in: ["admin", "superadmin"] } }).select(SAFE_USER_FIELDS),
    ]);

    const users = [...jobseekers, ...employers, ...recruiters, ...mentors, ...admins];
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
    const user = await User.findById(id).select("role");
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

    res.json({ message: `User role updated to ${newRole}.` });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get All Jobs
const getAllJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";

    const query = search
      ? { $or: [{ title: { $regex: search, $options: "i" } }] }
      : {};

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate("employer", "name email companyLogo")
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

    const updatableFields = [
      "title", "location", "jobtype", "salary", "experience",
      "jobcategory", "level", "deadline", "openings", "istrending",
      "status", "description",
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });

    await job.save();
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

    job.status = "active";
    await job.save();

    res.json({ message: "Job approved", job });
  } catch (error) {
    console.error("Error approving job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reject a job
const rejectJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    job.status = "rejected";
    await job.save();

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
  getAllJobs,
  editJob,
  deleteJob,
  getDailyLoggedInUsersCount,
  approveJob,
  rejectJob,
  getAllCompanies,
  verifyCompany,
  rejectCompany,
};