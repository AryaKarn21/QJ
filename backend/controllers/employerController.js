// controllers/employerController.js
const Job = require("../models/Job");
const User = require("../models/User");
const Employer = require("../models/Employer");
const Application = require("../models/Application");
const SavedCandidate = require("../models/SavedCandidate");
const CompanyMember = require("../models/CompanyMember");
const sendNotification = require("../utils/sendNotifications");
const sendMail = require("../utils/sendMail");
const { SAFE_USER_FIELDS } = require("../utils/safeUserFields");
const {
  EMPLOYER_STATUSES,
  JOBSEEKER_STATUSES,
  VISIBILITY_OPTIONS,
  sanitizeStringList,
} = require("../utils/profileStatus");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Get Employer Profile
const getEmployerProfile = async (req, res) => {
  try {
    // Fetch the user by ID and ensure they are an employer.
    // `-password` alone (the previous select) leaves otpCode/otpExpires/
    // failedLoginAttempts/lockUntil/lastLoginIP in the response — use the
    // shared safe projection instead (see utils/safeUserFields.js).
    const employer = await User.findById(req.user.id).select(SAFE_USER_FIELDS);
    if (!employer || employer.role !== "employer") {
      return res.status(404).json({ message: "Employer not found" });
    }

    // Return the employer profile data
    res.json(employer);
  } catch (error) {
    console.error("Error fetching employer profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Helper to delete old files and update Employer Profile
const deleteFile = (subfolder, filename) => {
  const filePath = path.join(__dirname, `../uploads/${subfolder}/${filename}`);
  fs.unlink(filePath, (err) => {
    if (err) console.error(`Failed to delete file: ${filePath}`, err.message);
  });
};

const updateEmployerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const employer = await Employer.findById(userId);

    if (!employer || employer.role !== "employer") {
      return res.status(404).json({ message: "Employer not found" });
    }

    // Destructure and update fields if present
  const {
      name, industryType, address, telephone,
      panNumber, companySize, establishedDate, description, website,
    } = req.body;

    if (name) employer.name = name;
    if (industryType) employer.industryType = industryType;
    if (address) employer.address = address;
    if (telephone) employer.telephone = telephone;
    if (panNumber) employer.panNumber = panNumber;
    if (companySize) employer.companySize = companySize;
    if (establishedDate) employer.establishedDate = establishedDate;
    if (description) employer.description = description;
    if (website) employer.website = website;

    // Handle companyLogo upload
    if (req.files?.companyLogo?.[0]) {
      if (employer.companyLogo) {
        const oldFilename = path.basename(employer.companyLogo);
        deleteFile("company_logos", oldFilename);
      }

      employer.companyLogo = `/uploads/company_logos/${req.files.companyLogo[0].filename}`;
    }

    // Handle coverPhoto upload
    if (req.files?.coverPhoto?.[0]) {
      if (employer.coverPhoto) {
        const oldFilename = path.basename(employer.coverPhoto);
        deleteFile("cover_photos", oldFilename);
      }
      employer.coverPhoto = `/uploads/cover_photos/${req.files.coverPhoto[0].filename}`;
    } else if (req.body.removeCoverPhoto === "true" || req.body.removeCoverPhoto === true) {
      // Explicit removal — employer was loaded via req.user.id above, so
      // this can only ever act on the authenticated user's own record.
      if (employer.coverPhoto) {
        deleteFile("cover_photos", path.basename(employer.coverPhoto));
      }
      employer.coverPhoto = null;
    }


    await employer.save();

    // SECURITY FIX: same class of leak as getEmployerProfile above —
    // `employer` here is the full unprojected Mongoose doc.
    const safeEmployer = await Employer.findById(employer._id).select(SAFE_USER_FIELDS);
    res.status(200).json(safeEmployer);
  } catch (error) {
    console.error("Error in updateEmployerProfile:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Create Job
const createJob = async (req, res) => {
  const {
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
    status,
    description,
  } = req.body;

  const employerId = req.user.id;

  try {
    const employer = await User.findById(employerId);

    if (!employer || employer.role !== "employer" || !employer.isVerified) {
      return res
        .status(403)
        .json({ message: "User is not authorized to create jobs" });
    }

    // A deadline in the past would create a job that's already expired
    // and unappliable the moment it goes live — reject it up front with
    // a clear message instead of a confusing schema-validation error.
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(deadlineDate.getTime()) || deadlineDate < today) {
        return res.status(422).json({
          message: "Validation failed",
          errors: ["Application deadline must be today or a future date"],
        });
      }
    }

    const job = new Job({
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
      istrending: istrending || false,
      status: "Pending", // Naukri-style: all new postings are reviewed before going live
      description,
      employer: employerId,
    });

    await job.save();

    // Notify admins (and superadmins) about the new job posting.
    await sendNotification.notifyAllAdmins({
      type: "job_post",
      message: `Employer "${employer.name}" posted a new job: "${title}"`,
      relatedJob: job._id,
      link: "/admin/jobs",
    });

    res.status(201).json(job);
  } catch (error) {
    console.error("Error creating job:", error);

    // Mongoose schema validation (missing/invalid required field, bad enum
    // value, etc.) is a client input problem, not a server crash — return
    // 422 with the exact field(s) that failed instead of a bare 500.
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(422).json({
        message: "Validation failed",
        errors,
      });
    }

    // Bad ObjectId, wrong type cast, etc.
    if (error.name === "CastError") {
      return res.status(400).json({
        message: `Invalid value for field "${error.path}"`,
      });
    }

    // Duplicate key (e.g. a unique index on slug/title+employer later on)
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A job with these details already exists",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};



// Edit Job

const editJob = async (req, res) => {
  const { jobId } = req.params;
  const employerId = req.user.id;

  try {
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.employer.toString() !== employerId) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this job" });
    }

    const previousStatus = job.status;

    // If the deadline is being changed, it must not be set into the past —
    // same rule as job creation, so an edit can't silently create an
    // already-expired listing.
    if (req.body.deadline !== undefined) {
      const deadlineDate = new Date(req.body.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(deadlineDate.getTime()) || deadlineDate < today) {
        return res.status(422).json({
          message: "Validation failed",
          errors: ["Application deadline must be today or a future date"],
        });
      }
    }

    // Updatable fields
   
const updatableFields = [
  "title",
  "country",
  "location",
  "jobtype",
  "salary",
  "experience",
  "jobcategory",
  "level",
  "deadline",
  "openings",
  "istrending",
  "description",
];

updatableFields.forEach((field) => {
  if (req.body[field] !== undefined) {
    job[field] = req.body[field];
  }
});

// Status is restricted: an employer can pause/close/reopen a job only
// AFTER it has been approved at least once. They can never self-approve
// (Pending -> Active) or reverse an admin rejection.
if (req.body.status !== undefined) {
  const alreadyApproved = job.status === "Active" || job.status === "Inactive";
  const requested = req.body.status;
  if (alreadyApproved && ["Active", "Inactive", "Closed"].includes(requested)) {
    job.status = requested;
  } else {
    return res.status(403).json({ message: "Only an admin can approve or reject a job." });
  }
}
    await job.save();

    // Send notifications if status changed
    if (req.body.status && req.body.status !== previousStatus) {
      const applications = await Application.find({ job: job._id });

      for (const app of applications) {
        await sendNotification({
          recipient: app.applicant,
          type: "job_status_update",
          message: `The status of the job "${job.title}" has been updated to "${job.status}".`,
          relatedJob: job._id,
          relatedApplication: app._id,
          link: "/user/applications",
        });
      }
    }

    res.json(job);
  } catch (error) {
    console.error("Error editing job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Application 
const updateApplication = async (req, res) => {
  const { applicationId } = req.params;
  const { status, interview } = req.body;
  const employerId = req.user.id;

  const allowedStatuses = ["Pending", "Reviewed", "Accepted", "Rejected", "Interview Scheduled"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  if (status === "Interview Scheduled" && !interview?.scheduledAt) {
    return res.status(400).json({ message: "Please provide an interview date/time." });
  }

  try {
    // Find the application
    const application = await Application.findById(applicationId)
      .populate("job")
      .populate("applicant");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Check if the employer owns the job related to the application
    if (application.job.employer.toString() !== employerId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this application" });
    }

    // Update status
    application.status = status;
    if (status === "Interview Scheduled") {
      application.interview = {
        scheduledAt: interview.scheduledAt,
        mode: interview.mode || "Video Call",
        meetingLink: interview.meetingLink || "",
        location: interview.location || "",
        notes: interview.notes || "",
      };
    }
    await application.save();

    // Create a notification for the jobseeker
    await sendNotification({
      recipient: application.applicant._id,
      type: "application_update",
      message: `Your application for "${
        application.job.title
      }" has been ${status.toLowerCase()}.`,
      relatedJob: application.job._id,
      relatedApplication: application._id,
      link: "/user/applications",
    });

    // Email the candidate for the three decision-bearing statuses. Pending
    // and Reviewed are just internal triage states, not something worth
    // emailing about — Accepted, Rejected, and Interview Scheduled are the
    // moments a candidate actually needs to hear from us outside the app.
    if (["Accepted", "Rejected", "Interview Scheduled"].includes(status) && application.applicant?.email) {
      let subject;
      let text;
      if (status === "Interview Scheduled") {
        const when = new Date(application.interview.scheduledAt).toLocaleString("en-IN", {
          dateStyle: "full",
          timeStyle: "short",
        });
        subject = `Interview scheduled: ${application.job.title}`;
        text =
          `Hi ${application.applicant.name || "there"},\n\n` +
          `Your interview for "${application.job.title}" has been scheduled.\n\n` +
          `When: ${when}\n` +
          `Mode: ${application.interview.mode}\n` +
          (application.interview.meetingLink ? `Meeting link: ${application.interview.meetingLink}\n` : "") +
          (application.interview.location ? `Location: ${application.interview.location}\n` : "") +
          (application.interview.notes ? `\nNotes from the employer:\n${application.interview.notes}\n` : "") +
          `\nGood luck!\n\n— Quick Jobs`;
      } else if (status === "Accepted") {
        subject = `You're accepted: ${application.job.title}`;
        text =
          `Hi ${application.applicant.name || "there"},\n\n` +
          `Great news — your application for "${application.job.title}" has been accepted. ` +
          `The employer will be in touch with next steps.\n\n— Quick Jobs`;
      } else {
        subject = `Update on your application: ${application.job.title}`;
        text =
          `Hi ${application.applicant.name || "there"},\n\n` +
          `Thank you for applying to "${application.job.title}". After careful review, ` +
          `the employer has decided not to move forward with your application at this time. ` +
          `We encourage you to keep applying to other roles on Quick Jobs.\n\n— Quick Jobs`;
      }

      // Best-effort — a failed email should never block the status update
      // itself (the in-app notification above already succeeded).
      sendMail(application.applicant.email, subject, text).catch((err) =>
        console.error("Failed to send application status email:", err.message)
      );
    }

    res.json({
      message: "Application status updated successfully",
      updatedApplication: {
        applicationId: application._id,
        status: application.status,
        interview: application.interview,
      },
    });
  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Job
const deleteJob = async (req, res) => {
  const { jobId } = req.params;
  const employerId = req.user.id;

  try {
    // Find the job by ID
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Check if the employer is authorized to delete this job
    if (job.employer.toString() !== employerId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this job" });
    }

    // Use deleteOne method to delete the job
    await Job.deleteOne({ _id: jobId });
    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get applicants for a specific job with full application details
const getAppliedJobseekers = async (req, res) => {
  const { jobId } = req.params;
  const employerId = req.user.id;

  try {
    // Step 1: Validate job ownership
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.employer.toString() !== employerId) {
      return res.status(403).json({ message: "Not authorized to view this job's applicants" });
    }

    // Step 2: Get applications for this job
    const applications = await Application.find({ job: jobId })
      .populate("applicant", "name email")
      .sort({ createdAt: -1 });

    // Step 3: Format response
    const applicants = applications.map((app) => ({
      applicationId: app._id,
      applicant: app.applicant,
      coverLetter: app.coverLetter,
      resume: app.resume,
      status: app.status,
      appliedAt: app.createdAt,
    }));

    res.json({
      jobTitle: job.title,
      jobId: job._id,
      applicants,
    });
  } catch (error) {
    console.error("Error fetching applicants:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get Employer's Jobs
const getEmployerJobs = async (req, res) => {
  const employerId = req.user.id; // Get the authenticated user's ID

  try {
    // Find jobs where the employer is the logged-in user
    const jobs = await Job.find({ employer: employerId });
res.json(jobs); // always 200 — an empty array is a valid, non-error state
  } catch (error) {
    console.error("Error fetching employer jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Employer Dashboard Stats
const getEmployerDashboardStats = async (req, res) => {
  const employerId = req.user.id;

  try {
    // Find all jobs posted by this employer
    const jobs = await Job.find({ employer: employerId }, "_id views status");

    const jobIds = jobs.map(job => job._id);

    // Total Jobs (lifetime postings)
    const jobsPostedCount = jobs.length;

    // Active Jobs — currently accepting applications
    const activeJobsCount = jobs.filter((job) => job.status === "Active").length;

    // Total Views across all this employer's jobs (used as "Profile Views")
    const profileViews = jobs.reduce((sum, job) => sum + (job.views?.length || 0), 0);

    // Total Applications for this employer's jobs
    const totalApplicationsCount = await Application.countDocuments({
      job: { $in: jobIds },
    });

    // Pending Applications
    const pendingApplications = await Application.countDocuments({
      job: { $in: jobIds },
      status: "Pending",
    });

    // Optional: Conversion rate
    const conversionRate = profileViews > 0
      ? ((totalApplicationsCount / profileViews) * 100).toFixed(2)
      : "0";

    // Active employees belonging to this company (CompanyMember.company === employerId,
    // same identity used everywhere else — the employer's own User._id is the company ID).
    // Isolated try/catch: if this query fails, the rest of the dashboard stats still load,
    // and we surface a safe 0 fallback instead of crashing the whole endpoint.
    let employeeCount = 0;
    try {
      employeeCount = await CompanyMember.countDocuments({
        company: employerId,
        status: "Active",
      });
    } catch (employeeCountError) {
      console.error("Employer dashboard stats — employeeCount error:", employeeCountError);
      employeeCount = 0;
    }

    res.status(200).json({
      jobsPostedCount,
      activeJobsCount,
      totalApplicationsCount,
      profileViews,
      pendingApplications,
      employeeCount,
      conversionRate: `${conversionRate}%`,
    });
  } catch (error) {
    console.error("Employer dashboard stats error:", error);
    res.status(500).json({ message: "Failed to get employer dashboard stats" });
  }
};

// Get All Applicants for Employer Jobs ,
const getAllApplicantsForEmployer = async (req, res) => {
  const employerId = req.user.id;

  // Pagination settings
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    // Get all jobs posted by this employer
    const jobs = await Job.find({ employer: employerId }).select("_id title");

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ message: "No jobs found for this employer" });
    }

    const jobIds = jobs.map((job) => job._id);

    // Total count of applications for pagination metadata
    const totalApplications = await Application.countDocuments({ job: { $in: jobIds } });
    const totalPages = Math.ceil(totalApplications / limit);

    // Fetch paginated applications sorted by newest
    const applications = await Application.find({ job: { $in: jobIds } })
      .populate("applicant", "name profilePic email")
      .populate("job", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Group applications by job
    const groupedApplications = {};

    applications.forEach((app) => {
      const jobId = app.job._id.toString();

      if (!groupedApplications[jobId]) {
        groupedApplications[jobId] = {
          jobTitle: app.job.title,
          jobId: app.job._id,
          applicants: [],
        };
      }

      groupedApplications[jobId].applicants.push({
        applicationId: app._id,
        applicant: app.applicant,
        coverLetter: app.coverLetter,
        resume: app.resume,
        status: app.status,
        appliedAt: app.createdAt,
      });
    });

    const result = Object.values(groupedApplications);

    res.json({
      currentPage: page,
      totalPages,
      totalApplications,
      perPage: limit,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching applicants for employer jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get All Applicants for Employer Jobs
const getAllApplicantsForEmployerJobs = async (req, res) => {
  const employerId = req.user.id;

  // Get pagination parameters from query string
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  try {
    // Get all jobs posted by this employer
    const jobs = await Job.find({ employer: employerId }).select("_id title");

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ message: "No jobs found for this employer" });
    }

    const jobIds = jobs.map((job) => job._id);

    // Count total number of applications for pagination info
    const totalApplications = await Application.countDocuments({ job: { $in: jobIds } });

    // Fetch paginated applications
    const applications = await Application.find({ job: { $in: jobIds } })
      .populate("applicant", "name profilePic email")
      .populate("job", "title")
      .sort({ createdAt: -1 }) // Optional: newest first
      .skip(skip)
      .limit(limit);

    // Group applications by job
    const groupedApplications = {};

    applications.forEach((app) => {
      const jobId = app.job._id.toString();

      if (!groupedApplications[jobId]) {
        groupedApplications[jobId] = {
          jobTitle: app.job.title,
          jobId: app.job._id,
          applicants: [],
        };
      }

      groupedApplications[jobId].applicants.push({
        applicationId: app._id,
        applicant: app.applicant,
        coverLetter: app.coverLetter,
        resume: app.resume,
        status: app.status,
        appliedAt: app.createdAt,
      });
    });

    const result = Object.values(groupedApplications);

    res.json({
      currentPage: page,
      totalPages: Math.ceil(totalApplications / limit),
      totalApplications,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching applicants for employer jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};




// Update Notification Preferences
// Naukri-style: preferences are a subset field the user owns; only the keys
// actually present in the request body are touched so a partial toggle
// update from the UI never clobbers the other preference.
const updateNotificationPreferences = async (req, res) => {
  const employerId = req.user.id;
  const { allNotifications, newApplications } = req.body;

  try {
    const employer = await User.findById(employerId);
    if (!employer || employer.role !== "employer") {
      return res.status(404).json({ message: "Employer not found" });
    }

    if (!employer.notificationPreferences) {
      employer.notificationPreferences = {};
    }
    if (allNotifications !== undefined) {
      employer.notificationPreferences.allNotifications = Boolean(allNotifications);
    }
    if (newApplications !== undefined) {
      employer.notificationPreferences.newApplications = Boolean(newApplications);
    }

    await employer.save();

    res.status(200).json({
      message: "Notification preferences updated",
      notificationPreferences: employer.notificationPreferences,
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Deactivate Account
// Destructive action, so it requires re-entering the current password —
// same pattern real ATS platforms use — rather than trusting a still-valid
// session token alone. Soft-deactivates (isActive: false) so no data is
// lost and support/admin can reverse it if needed.
const deactivateAccount = async (req, res) => {
  const employerId = req.user.id;
  const { password } = req.body;

  if (!password) {
    return res
      .status(400)
      .json({ message: "Please enter your password to confirm deactivation." });
  }

  try {
    const employer = await User.findById(employerId);
    if (!employer || employer.role !== "employer") {
      return res.status(404).json({ message: "Employer not found" });
    }

    if (!employer.password) {
      // Google-only accounts have no local password to verify against.
      return res.status(400).json({
        message: "Password confirmation isn't available for accounts signed in with Google. Please contact support to deactivate.",
      });
    }

    const isMatch = await bcrypt.compare(password, employer.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    employer.isActive = false;
    employer.deactivatedAt = new Date();
    await employer.save();

    await sendNotification({
      recipient: employer._id,
      type: "account_deactivated",
      message: "Your account has been deactivated.",
      link: "/employer/profile",
    });

    res.status(200).json({ message: "Account deactivated successfully" });
  } catch (error) {
    console.error("Deactivate account error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all candidates (deduplicated) who have applied to any of this
// employer's jobs — powers the "Candidates" page.
const getCandidates = async (req, res) => {
  const employerId = req.user.id;
  try {
    const jobs = await Job.find({ employer: employerId }, "_id");
    const jobIds = jobs.map((j) => j._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      // profileStatus is a Jobseeker-discriminator-only field; populate()
      // hydrates against the base User schema so it must be selected
      // explicitly here (see the Employee-list profile-picture bug this
      // session already fixed the same way in companyMemberController.js).
      .populate("applicant", "name email profilePic profileStatus")
      .populate("job", "title")
      .sort({ createdAt: -1 })
      .lean();

    const savedSet = new Set(
      (await SavedCandidate.find({ employer: employerId }).select("candidate").lean()).map((s) =>
        String(s.candidate)
      )
    );

    // Dedupe by candidate — keep only their most recent application as the
    // representative row, but note how many total applications they have.
    const byCandidate = new Map();
    for (const app of applications) {
      if (!app.applicant) continue;
      const key = String(app.applicant._id);
      if (!byCandidate.has(key)) {
        byCandidate.set(key, {
          candidateId: app.applicant._id,
          name: app.applicant.name,
          email: app.applicant.email,
          profilePic: app.applicant.profilePic,
          // Only ever the candidate's OWN data, already scoped to "did
          // they apply to one of MY jobs" — visibility gating (public vs.
          // private) only matters for a stranger browsing someone's public
          // profile, not an employer reviewing their own applicant, so
          // it's surfaced as-is here regardless of the visibility field.
          careerStatus: app.applicant.profileStatus?.status || null,
          latestJobTitle: app.job?.title,
          latestStatus: app.status,
          latestApplicationId: app._id,
          totalApplications: 1,
          isSaved: savedSet.has(key),
        });
      } else {
        byCandidate.get(key).totalApplications += 1;
      }
    }

    let candidates = Array.from(byCandidate.values());

    // Optional server-side filter by career status (spec: "use the backend
    // for filtering, do not load every profile and filter only in React").
    // Validated against the same allow-list every other status write/read
    // uses — an unrecognized value is ignored rather than 400ing, since
    // this is a query refinement, not a form submission.
    const statusFilter = typeof req.query.status === "string" ? req.query.status : null;
    if (statusFilter && JOBSEEKER_STATUSES.includes(statusFilter)) {
      candidates = candidates.filter((c) => c.careerStatus === statusFilter);
    }

    res.json({ candidates });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ message: "Failed to load candidates." });
  }
};

// Toggle save/unsave for a candidate.
const toggleSavedCandidate = async (req, res) => {
  const employerId = req.user.id;
  const { candidateId } = req.params;
  const { jobId } = req.body;

  try {
    const existing = await SavedCandidate.findOne({ employer: employerId, candidate: candidateId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ saved: false });
    }
    await SavedCandidate.create({ employer: employerId, candidate: candidateId, job: jobId || undefined });
    res.json({ saved: true });
  } catch (error) {
    console.error("Error toggling saved candidate:", error);
    res.status(500).json({ message: "Failed to update saved candidate." });
  }
};

// List this employer's saved candidates.
const getSavedCandidates = async (req, res) => {
  const employerId = req.user.id;
  try {
    const saved = await SavedCandidate.find({ employer: employerId })
      .populate("candidate", "name email profilePic")
      .populate("job", "title")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      candidates: saved
        .filter((s) => s.candidate)
        .map((s) => ({
          candidateId: s.candidate._id,
          name: s.candidate.name,
          email: s.candidate.email,
          profilePic: s.candidate.profilePic,
          savedFromJobTitle: s.job?.title || null,
          savedAt: s.createdAt,
          isSaved: true,
        })),
    });
  } catch (error) {
    console.error("Error fetching saved candidates:", error);
    res.status(500).json({ message: "Failed to load saved candidates." });
  }
};

// List all applications with an active scheduled interview, across this
// employer's jobs — powers the "Interviews" page.
const getScheduledInterviews = async (req, res) => {
  const employerId = req.user.id;
  try {
    const jobs = await Job.find({ employer: employerId }, "_id");
    const jobIds = jobs.map((j) => j._id);

    const interviews = await Application.find({
      job: { $in: jobIds },
      status: "Interview Scheduled",
    })
      .populate("applicant", "name email profilePic")
      .populate("job", "title")
      .sort({ "interview.scheduledAt": 1 })
      .lean();

    res.json({
      interviews: interviews.map((app) => ({
        applicationId: app._id,
        candidate: app.applicant,
        jobTitle: app.job?.title,
        jobId: app.job?._id,
        interview: app.interview,
      })),
    });
  } catch (error) {
    console.error("Error fetching scheduled interviews:", error);
    res.status(500).json({ message: "Failed to load interviews." });
  }
};

// Update the employer's hiring-status ("Actively Hiring" etc.) —
// mirrors updateJobseekerStatus in jobseekerController.js exactly (see
// that function's comment for why this is a separate, focused JSON
// endpoint rather than folded into updateEmployerProfile's multipart
// full-profile-edit flow). Same security posture: req.user.id is the only
// source of truth for whose record this is, every enum is validated
// against utils/profileStatus.js's shared allow-lists.
const updateEmployerHiringStatus = async (req, res) => {
  try {
    const { status, targetRoles, preferredLocations, employmentTypes, visibility } = req.body;

    if (typeof status !== "string" || !EMPLOYER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Please select a valid hiring status." });
    }
    if (visibility !== undefined && !VISIBILITY_OPTIONS.includes(visibility)) {
      return res.status(400).json({ message: "Please select a valid visibility option." });
    }

    const employer = await Employer.findById(req.user.id);
    if (!employer || employer.role !== "employer") {
      return res.status(404).json({ message: "Employer not found" });
    }

    employer.profileStatus = {
      statusType: "EMPLOYER",
      status,
      targetRoles: sanitizeStringList(targetRoles),
      preferredLocations: sanitizeStringList(preferredLocations),
      employmentTypes: sanitizeStringList(employmentTypes),
      visibility: visibility || employer.profileStatus?.visibility || "public",
      updatedAt: new Date(),
    };

    await employer.save();

    res.json({
      message: "Hiring status updated successfully.",
      profileStatus: employer.profileStatus,
    });
  } catch (error) {
    console.error("Error in updateEmployerHiringStatus:", error);
    res.status(500).json({ message: "Unable to update your status. Please try again." });
  }
};

module.exports = {
  getEmployerProfile,
  updateEmployerProfile,
  createJob,
  editJob,
  updateApplication,
  deleteJob,
  getAppliedJobseekers,
  getEmployerJobs,
  getEmployerDashboardStats,
  getAllApplicantsForEmployer,
  getAllApplicantsForEmployerJobs,
  updateNotificationPreferences,
  deactivateAccount,
  getCandidates,
  toggleSavedCandidate,
  getSavedCandidates,
  getScheduledInterviews,
  updateEmployerHiringStatus,
};