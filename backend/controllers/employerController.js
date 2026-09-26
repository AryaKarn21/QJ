// controllers/employerController.js
const Job = require("../models/Job");
const User = require("../models/User");
const Employer = require("../models/Employer");
const Application = require("../models/Application");
const SavedCandidate = require("../models/SavedCandidate");
const CompanyMember = require("../models/CompanyMember");
const NotificationSettings = require("../models/NotificationSettings");
const Follow = require("../models/Follow");
const sendNotification = require("../utils/sendNotifications");
const sendMail = require("../utils/sendMail");
const {
  formatInterviewDateTime,
  formatDuration,
  sendInterviewScheduledEmail,
  sendInterviewRescheduledEmail,
  sendInterviewCancelledEmail,
  sendApplicationStatusEmail,
  sendStatusChangeEmail,
  sendCustomMessageEmail,
  buildInterviewScheduledEmailContent,
  buildInterviewRescheduledEmailContent,
  buildInterviewCancelledEmailContent,
  buildStatusChangeEmailContent,
  buildAssessmentRequestEmailContent,
} = require("../services/interviewEmailService");
const { notifyJobSeekersOfNewJob } = require("../utils/jobNotificationHelper");
const Assessment = require("../models/Assessment");

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const { recordAdminAudit } = require("../utils/auditLogger");
const { SYMBOL_BY_CODE } = require("../data/currencies");
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
const {
  persistUpload,
  deleteStoredFile,
  formatCloudinaryInlineUrl,
  formatCloudinaryDownloadUrl,
  getCloudinaryPrivateDownloadUrl,
} = require("../services/media.service");

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
      // `headline` (base User field) doubles as the company tagline shown
      // on the Company Profile page — reused rather than adding a
      // duplicate field. `mission`/`culture`/`companyLocations`/
      // `companyBenefits` are genuinely new (models/Employer.js).
      headline, mission, culture, companyLocations, companyBenefits,
      socialLinks,
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
    if (headline !== undefined) employer.headline = headline;
    if (mission !== undefined) employer.mission = mission;
    if (culture !== undefined) employer.culture = culture;
    // This endpoint is a multipart/form-data submission (it also carries
    // the logo/cover file uploads below), so array/object fields arrive
    // as strings, not real arrays/objects — same comma-separated-string
    // convention BlogCreate.tsx already uses for tags, and a JSON string
    // for the one nested object (socialLinks), parsed defensively so a
    // malformed value never 500s the whole request.
    if (companyLocations !== undefined) {
      employer.companyLocations = Array.isArray(companyLocations)
        ? companyLocations
        : String(companyLocations).split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (companyBenefits !== undefined) {
      employer.companyBenefits = Array.isArray(companyBenefits)
        ? companyBenefits
        : String(companyBenefits).split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (socialLinks !== undefined) {
      const parsed = typeof socialLinks === "string" ? (() => { try { return JSON.parse(socialLinks); } catch { return null; } })() : socialLinks;
      if (parsed && typeof parsed === "object") {
        // Merge rather than replace so updating just `linkedin` doesn't
        // wipe out `twitter`/`github`/`website` the employer already had.
        const current = employer.socialLinks?.toObject?.() ?? employer.socialLinks ?? {};
        employer.socialLinks = { ...current, ...parsed };
      }
    }

    // Handle companyLogo upload — persistUpload writes to Supabase Storage
    // when configured (services/media.service.js), local disk otherwise;
    // the old logo (either kind) is only deleted after the new one saves.
    // ownerId namespaces the storage path so one company's upload can
    // never land in (or overwrite) another company's folder.
    if (req.files?.companyLogo?.[0]) {
      const oldLogo = employer.companyLogo;
      employer.companyLogo = await persistUpload(req.files.companyLogo[0], "company_logos", employer._id);
      if (oldLogo) deleteStoredFile(oldLogo);
    }

    // Handle coverPhoto upload
    if (req.files?.coverPhoto?.[0]) {
      const oldCover = employer.coverPhoto;
      employer.coverPhoto = await persistUpload(req.files.coverPhoto[0], "cover_photos", employer._id);
      if (oldCover) deleteStoredFile(oldCover);
    } else if (req.body.removeCoverPhoto === "true" || req.body.removeCoverPhoto === true) {
      // Explicit removal — employer was loaded via req.user.id above, so
      // this can only ever act on the authenticated user's own record.
      if (employer.coverPhoto) deleteStoredFile(employer.coverPhoto);
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


// Builds the legacy free-text `salary`/`experience` strings from the new
// structured min/max fields (see models/Job.js) so every existing reader
// of job.salary/job.experience (dashboard cards, admin table, job cards,
// etc.) keeps working even when a job is created/edited through the new
// structured fields instead of an employer typing a free-text string by
// hand. An explicitly-provided `salary`/`experience` string always wins.
const deriveSalaryString = ({ salary, salaryMin, salaryMax, currency, salaryPeriod }) => {
  if (salary) return salary;
  if (salaryMin === undefined && salaryMax === undefined) return salary;
  const cur = currency || "NPR";
  const period = salaryPeriod || "Yearly";
  const min = salaryMin !== undefined && salaryMin !== "" ? Number(salaryMin) : undefined;
  const max = salaryMax !== undefined && salaryMax !== "" ? Number(salaryMax) : undefined;
  if (min === undefined && max === undefined) return salary;
  const range = min !== undefined && max !== undefined && min !== max
    ? `${min.toLocaleString()} - ${max.toLocaleString()}`
    : (min ?? max).toLocaleString();
  // Symbol first (what a jobseeker actually scans for), code kept alongside
  // since a bare "$" is ambiguous across USD/AUD/CAD/SGD/etc.
  const symbol = SYMBOL_BY_CODE[cur] || "";
  return `${cur} ${symbol}${range} / ${period}`;
};

const deriveExperienceString = ({ experience, minExperience, maxExperience }) => {
  if (experience) return experience;
  if (minExperience === undefined && maxExperience === undefined) return experience;
  const min = minExperience !== undefined && minExperience !== "" ? Number(minExperience) : undefined;
  const max = maxExperience !== undefined && maxExperience !== "" ? Number(maxExperience) : undefined;
  if (min === undefined && max === undefined) return experience;
  if (min !== undefined && max !== undefined && min !== max) return `${min}-${max} years`;
  return `${min ?? max}+ years`;
};

// Create Job
const createJob = async (req, res) => {
  const {
    title,
    country,
    location,
    preferredLocations,
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
    // Structured fields (all optional — see models/Job.js).
    department,
    joiningDate,
    hiringProcess,
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

    // Naukri-style: every real submission is reviewed before going live —
    // an employer can never self-approve straight to Active. The one
    // status an employer CAN choose at creation is "Draft" (Phase 4's
    // posting stepper's "Save Draft" action), which never enters the
    // admin queue at all; anything else they send is ignored in favor of
    // "Pending".
    const initialStatus = status === "Draft" ? "Draft" : "Pending";

    // preferredLocations is additive to `location` (see models/Job.js) —
    // derive whichever side of the pair the client didn't send so both
    // stay populated and in sync: an employer picking 3 locations still
    // gets a real `location` (the first one) for every existing read path
    // that only ever knew about a single location; a legacy client sending
    // only `location` still gets a real one-item `preferredLocations`.
    const cleanedPreferredLocations = Array.isArray(preferredLocations)
      ? preferredLocations.map((l) => String(l).trim()).filter(Boolean)
      : [];
    const resolvedLocation = cleanedPreferredLocations[0] || location;
    const resolvedPreferredLocations =
      cleanedPreferredLocations.length > 0 ? cleanedPreferredLocations : location ? [location] : [];

    const job = new Job({
      title,
      country,
      location: resolvedLocation,
      preferredLocations: resolvedPreferredLocations,
      jobtype,
      salary: deriveSalaryString({ salary, salaryMin, salaryMax, currency, salaryPeriod }),
      experience: deriveExperienceString({ experience, minExperience, maxExperience }),
      jobcategory,
      level,
      deadline,
      openings,
      istrending: istrending || false,
      status: initialStatus,
      description,
      department,
      joiningDate,
      hiringProcess,
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
      employer: employerId,
    });

    await job.save();

    // A draft was never submitted — admins have nothing to review yet,
    // so don't page them until it's actually published (editJob's
    // Draft -> Pending transition below sends this same notification).
    if (initialStatus !== "Draft") {
      await sendNotification.notifyAllAdmins({
        type: "job_post",
        message: `Employer "${employer.name}" posted a new job: "${title}"`,
        relatedJob: job._id,
        link: "/admin/jobs",
      });
    }

    // Notify relevant jobseekers (in-app and via email) when a job is posted
    if (initialStatus !== "Draft") {
      notifyJobSeekersOfNewJob({ job, employer }).catch((notifErr) =>
        console.error("Error notifying jobseekers of new job:", notifErr)
      );
    }

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

    const isOwner = job.employer && job.employer.toString() === employerId;
    const isSuperAdmin = ["admin", "superadmin"].includes(req.user.role);
    if (!isOwner && !isSuperAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this job" });
    }

    const previousStatus = job.status;

    // If the deadline is being changed, it must not be set into the past —
    // same rule as job creation, so an edit can't silently create an
    // already-expired listing. Checked only when a real value is sent —
    // a Draft (Phase 4) can legitimately clear/leave this blank, and the
    // schema's own requiredUnlessDraft validator is what catches a blank
    // deadline on a non-draft save, with its own clear message.
    if (req.body.deadline) {
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
  "preferredLocations",
  "jobtype",
  "salary",
  "experience",
  "jobcategory",
  "level",
  "deadline",
  "openings",
  "istrending",
  "description",
  // Structured fields (all optional — see models/Job.js).
  "department",
  "joiningDate",
  "hiringProcess",
  "workMode",
  "minExperience",
  "maxExperience",
  "salaryMin",
  "salaryMax",
  "salaryPeriod",
  "currency",
  "overview",
  "responsibilities",
  "requirements",
  "requiredSkills",
  "preferredSkills",
  "education",
  "benefits",
  "perks",
  "workingHours",
  "companyOverride",
];

updatableFields.forEach((field) => {
  if (req.body[field] !== undefined) {
    job[field] = req.body[field];
  }
});

// Keep the legacy single `location` field in sync with the first selected
// preferred location — same reasoning as createJob's derivation above.
if (Array.isArray(req.body.preferredLocations) && req.body.preferredLocations.length > 0) {
  job.location = req.body.preferredLocations[0];
}

// Keep the legacy `salary`/`experience` strings in sync when the
// structured fields changed but no explicit string was sent — same
// derivation createJob uses, so a job edited only through the structured
// fields doesn't leave stale text in job.salary/job.experience.
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

// Status is restricted: an employer can pause/close/reopen a job only
// AFTER it has been approved at least once. They can never self-approve
// (Pending -> Active) or reverse an admin rejection. Two Draft-only
// (Phase 4) exceptions on top of that existing rule: a draft can be
// re-saved as "Draft" (still editing) or "Pending" (Publish — submitted
// for admin review, same as a brand-new job).
let publishedFromDraft = false;
if (req.body.status !== undefined) {
  if (isSuperAdmin) {
    job.status = req.body.status;
  } else {
    const alreadyApproved = job.status === "Active" || job.status === "Inactive";
    const isDraft = job.status === "Draft";
    const requested = req.body.status;
    if (alreadyApproved && ["Active", "Inactive", "Closed"].includes(requested)) {
      job.status = requested;
    } else if (isDraft && requested === "Draft") {
      // no-op — still a draft
    } else if (isDraft && requested === "Pending") {
      job.status = "Pending";
      publishedFromDraft = true;
    } else {
      return res.status(403).json({ message: "Only an admin can approve or reject a job." });
    }
  }
}
    await job.save();

    if (isSuperAdmin && !isOwner) {
      await recordAdminAudit({
        user: req.user,
        action: `Super Admin edited Job Listing #${job._id}`,
        contentType: "Job",
        contentId: job._id,
        details: { title: job.title },
      });
    }

    // A draft being published (Draft -> Pending) needs the same admin
    // notification createJob sends for a brand-new submission — nothing
    // paged them when it was first saved as a draft.
    if (publishedFromDraft) {
      const employer = await User.findById(employerId);
      await sendNotification.notifyAllAdmins({
        type: "job_post",
        message: `Employer "${employer.name}" posted a new job: "${job.title}"`,
        relatedJob: job._id,
        link: "/admin/jobs",
      });
    }

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
  const { status, interview, customMessage, cancellationReason } = req.body;
  const employerId = req.user.id;

  // "Assessment Assigned" deliberately excluded — that status is only ever
  // set by assessmentController.js's assignAssessment (it requires an
  // actual assessment to be picked/created, not a bare status flip).
  const allowedStatuses = ["Pending", "Reviewed", "Shortlisted", "Accepted", "Rejected", "Interview Scheduled"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  if (status === "Interview Scheduled") {
    if (!interview?.scheduledAt) {
      return res.status(400).json({ message: "Please provide an interview date/time." });
    }
    const scheduledDate = new Date(interview.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ message: "Please provide a valid interview date/time." });
    }
  }

  try {
    // Find the application with nested job employer and applicant
    const application = await Application.findById(applicationId)
      .populate({
        path: "job",
        populate: { path: "employer", select: "name companyLogo email" },
      })
      .populate("applicant");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Check if the employer owns the job related to the application
    const jobEmployerId =
      application.job?.employer?._id?.toString() ||
      application.job?.employer?.toString();

    if (jobEmployerId !== employerId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this application" });
    }

    const previousStatus = application.status;
    const wasAlreadyScheduled =
      previousStatus === "Interview Scheduled" &&
      Boolean(application.interview?.scheduledAt);
    const wasCancelled =
      previousStatus === "Interview Scheduled" &&
      status !== "Interview Scheduled";

    const previousScheduledAt = application.interview?.scheduledAt;

    const companyName =
      application.job?.companyOverride?.name?.trim() ||
      application.job?.employer?.name?.trim() ||
      "QuickJobs Employer";

    const candidate = application.applicant;
    const candidateEmail = candidate?.email?.trim();
    const isCandidateActive = candidate && candidate.isActive !== false;

    // Update status
    application.status = status;
    if (status !== previousStatus) {
      application.statusHistory.push({ status, changedBy: req.user.id });
    }

    let emailResult = { sent: null, recipient: candidateEmail || "" };

    if (status === "Interview Scheduled") {
      application.interview = {
        scheduledAt: new Date(interview.scheduledAt),
        duration: interview.duration ? parseInt(interview.duration, 10) || 30 : 30,
        mode: interview.mode || "Video Call",
        type: interview.type || undefined,
        timezone: interview.timezone || "Asia/Kathmandu",
        meetingLink: interview.meetingLink ? interview.meetingLink.trim() : "",
        location: interview.location ? interview.location.trim() : "",
        notes: interview.notes ? interview.notes.trim() : "",
        interviewer: interview.interviewer ? interview.interviewer.trim() : "",
        status: wasAlreadyScheduled ? "RESCHEDULED" : "SCHEDULED",
        emailStatus: "pending",
        emailSentAt: undefined,
        emailError: "",
        // Reschedule re-arms both reminders relative to the new time.
        reminder24hSentAt: undefined,
        reminder1hSentAt: undefined,
      };

      // In-App Notification
      const { date, time } = formatInterviewDateTime(application.interview.scheduledAt);
      const notifType = wasAlreadyScheduled ? "interview_rescheduled" : "interview_scheduled";
      const notifMsg = wasAlreadyScheduled
        ? `Your interview for "${application.job.title}" at ${companyName} has been rescheduled to ${date} at ${time}.`
        : `Your interview for "${application.job.title}" at ${companyName} has been scheduled for ${date} at ${time}.`;

      if (candidate?._id) {
        await sendNotification({
          recipient: candidate._id,
          type: notifType,
          message: notifMsg,
          relatedJob: application.job._id,
          relatedApplication: application._id,
          link: "/user/applications",
        });
      }

      // Candidate email validation & sending
      if (!candidateEmail || !isCandidateActive) {
        const errorReason = !candidateEmail
          ? "Candidate email address not found"
          : "Candidate account is inactive";
        console.error(
          `[InterviewEmail]\nRecipient: ${candidateEmail || "MISSING"}\nApplication: ${application._id}\nStatus: failed\nError: ${errorReason}`
        );
        application.interview.emailStatus = "failed";
        application.interview.emailError = errorReason;
        emailResult = {
          sent: false,
          recipient: candidateEmail || "",
          message: "Interview scheduled, but candidate email was not found or is inactive.",
        };
      } else {
        const emailFn = wasAlreadyScheduled
          ? sendInterviewRescheduledEmail
          : sendInterviewScheduledEmail;

        const mailRes = await emailFn({
          recipient: candidateEmail,
          candidateName: candidate.name || "Candidate",
          companyName,
          jobTitle: application.job.title,
          scheduledAt: application.interview.scheduledAt,
          previousScheduledAt,
          duration: application.interview.duration,
          mode: application.interview.mode,
          type: application.interview.type,
          timezone: application.interview.timezone,
          interviewer: application.interview.interviewer || interview.interviewer || "",
          meetingLink: application.interview.meetingLink,
          location: application.interview.location,
          notes: application.interview.notes,
          customMessage: customMessage || "",
          applicationId: application._id,
        });

        if (mailRes.success) {
          application.interview.emailStatus = "sent";
          application.interview.emailSentAt = new Date();
          application.interview.emailError = "";
          emailResult = {
            sent: true,
            recipient: candidateEmail,
          };
        } else {
          application.interview.emailStatus = "failed";
          application.interview.emailError = mailRes.error || "Email delivery failed";
          emailResult = {
            sent: false,
            recipient: candidateEmail,
            message: "Interview scheduled, but confirmation email could not be delivered.",
          };
        }
      }
    } else {
      // In-App Notification for non-interview status changes
      if (candidate?._id) {
        const notifMsg =
          status === "Shortlisted"
            ? `Your application for "${application.job.title}" has been shortlisted.`
            : `Your application for "${application.job.title}" has been ${status.toLowerCase()}.`;
        await sendNotification({
          recipient: candidate._id,
          type: "application_update",
          message: notifMsg,
          relatedJob: application.job._id,
          relatedApplication: application._id,
          link: "/user/applications",
        });
      }

      // Handle interview cancellation if status changed away from Interview Scheduled
      if (wasCancelled && candidateEmail && isCandidateActive) {
        if (application.interview) {
          application.interview.status = "CANCELLED";
          application.interview.reminder24hSentAt = undefined;
          application.interview.reminder1hSentAt = undefined;
        }

        const cancelRes = await sendInterviewCancelledEmail({
          recipient: candidateEmail,
          candidateName: candidate.name || "Candidate",
          companyName,
          jobTitle: application.job.title,
          scheduledAt: previousScheduledAt,
          reason:
            cancellationReason ||
            (status === "Rejected"
              ? "Application not moving forward at this time"
              : `Application status updated to ${status}`),
          customMessage: customMessage || "",
          applicationId: application._id,
        });

        emailResult = {
          sent: cancelRes.success,
          recipient: candidateEmail,
          event: "cancelled",
        };
      } else if (["Shortlisted", "Accepted", "Rejected", "Reviewed"].includes(status) && candidateEmail && isCandidateActive) {
        const statusRes = await sendStatusChangeEmail({
          recipient: candidateEmail,
          candidateName: candidate.name || "Candidate",
          companyName,
          jobTitle: application.job.title,
          status,
          customMessage: customMessage || "",
          applicationId: application._id,
        });

        if (statusRes.success) {
          emailResult = { sent: true, recipient: candidateEmail };
        } else {
          console.error("Failed to send application status email:", statusRes.error);
          emailResult = { sent: false, recipient: candidateEmail, message: statusRes.error };
        }
      }
    }

    await application.save();

    res.json({
      success: true,
      message: "Application status updated successfully",
      emailSent: emailResult.sent, // backward compatibility
      email: emailResult,
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

// Resend interview email for an application with an active scheduled interview
const resendInterviewEmail = async (req, res) => {
  const { applicationId } = req.params;
  const employerId = req.user.id;

  try {
    const application = await Application.findById(applicationId)
      .populate({
        path: "job",
        populate: { path: "employer", select: "name companyLogo email" },
      })
      .populate("applicant");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const jobEmployerId =
      application.job?.employer?._id?.toString() ||
      application.job?.employer?.toString();

    if (jobEmployerId !== employerId) {
      return res.status(403).json({ message: "Not authorized to manage this application" });
    }

    if (application.status !== "Interview Scheduled" || !application.interview?.scheduledAt) {
      return res.status(400).json({ message: "No active interview scheduled for this application" });
    }

    const candidate = application.applicant;
    const candidateEmail = candidate?.email?.trim();
    if (!candidateEmail || candidate.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "Candidate does not have a valid active email address",
        email: { sent: false, recipient: candidateEmail || "" },
      });
    }

    const companyName =
      application.job?.companyOverride?.name?.trim() ||
      application.job?.employer?.name?.trim() ||
      "QuickJobs Employer";

    const mailRes = await sendInterviewScheduledEmail({
      recipient: candidateEmail,
      candidateName: candidate.name || "Candidate",
      companyName,
      jobTitle: application.job.title,
      scheduledAt: application.interview.scheduledAt,
      duration: application.interview.duration || 30,
      mode: application.interview.mode || "Video Call",
      meetingLink: application.interview.meetingLink || "",
      location: application.interview.location || "",
      notes: application.interview.notes || "",
      applicationId: application._id,
    });

    if (mailRes.success) {
      application.interview.emailStatus = "sent";
      application.interview.emailSentAt = new Date();
      application.interview.emailError = "";
      await application.save();

      return res.json({
        success: true,
        message: `Interview email sent successfully to ${candidateEmail}`,
        email: { sent: true, recipient: candidateEmail },
      });
    } else {
      application.interview.emailStatus = "failed";
      application.interview.emailError = mailRes.error || "Email delivery failed";
      await application.save();

      return res.status(502).json({
        success: false,
        message: "Failed to send interview email. Please check server SMTP configuration.",
        email: { sent: false, recipient: candidateEmail, error: mailRes.error },
      });
    }
  } catch (error) {
    console.error("Error resending interview email:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// PATCH /api/employer/applications/:applicationId/interview-outcome —
// mark a past interview COMPLETED or NO_SHOW. Internal record only, no
// candidate email (spec section 20).
// ============================================================
const updateInterviewOutcome = async (req, res) => {
  const { applicationId } = req.params;
  const { outcome } = req.body;
  const employerId = req.user.id;

  if (!["COMPLETED", "NO_SHOW"].includes(outcome)) {
    return res.status(400).json({ message: "outcome must be COMPLETED or NO_SHOW" });
  }

  try {
    const application = await Application.findById(applicationId).populate({
      path: "job",
      select: "employer title",
    });
    if (!application) return res.status(404).json({ message: "Application not found" });

    const jobEmployerId = application.job?.employer?.toString();
    if (jobEmployerId !== employerId) {
      return res.status(403).json({ message: "Not authorized to update this application" });
    }
    if (!application.interview?.scheduledAt) {
      return res.status(400).json({ message: "No interview scheduled for this application" });
    }

    application.interview.status = outcome;
    application.statusHistory.push({
      status: application.status,
      changedBy: employerId,
      note: `Interview marked as ${outcome === "NO_SHOW" ? "no-show" : "completed"}`,
    });
    await application.save();

    res.json({ message: "Interview outcome updated", interview: application.interview });
  } catch (error) {
    console.error("Error updating interview outcome:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// POST /api/employer/applications/:applicationId/email-preview — renders
// the exact subject/text/html a real action would send, WITHOUT saving
// anything or sending mail. Single choke point every EmailPreviewModal
// call site uses, so no template ever drifts out of sync between preview
// and the real send path (both call the same buildXContent functions).
// ============================================================
const previewApplicationEmail = async (req, res) => {
  const { applicationId } = req.params;
  const { action, customMessage, cancellationReason, status, interview, assessmentId, deadline } = req.body;
  const employerId = req.user.id;

  try {
    const application = await Application.findById(applicationId)
      .populate({ path: "job", populate: { path: "employer", select: "name" } })
      .populate("applicant", "name email");
    if (!application) return res.status(404).json({ message: "Application not found" });

    const jobEmployerId = application.job?.employer?._id?.toString() || application.job?.employer?.toString();
    if (jobEmployerId !== employerId) {
      return res.status(403).json({ message: "Not authorized to preview email for this application" });
    }

    const companyName =
      application.job?.companyOverride?.name?.trim() ||
      application.job?.employer?.name?.trim() ||
      "QuickJobs Employer";
    const candidateName = application.applicant?.name || "Candidate";
    const candidateEmail = application.applicant?.email || "";
    const jobTitle = application.job?.title || "Position";

    let content;
    switch (action) {
      case "schedule_interview":
      case "reschedule_interview": {
        if (!interview?.scheduledAt) {
          return res.status(400).json({ message: "An interview date/time is required to preview this email." });
        }
        const builder = action === "reschedule_interview" ? buildInterviewRescheduledEmailContent : buildInterviewScheduledEmailContent;
        content = builder({
          candidateName,
          companyName,
          jobTitle,
          scheduledAt: interview.scheduledAt,
          duration: interview.duration || 30,
          mode: interview.mode || "Video Call",
          type: interview.type,
          interviewer: interview.interviewer || "",
          timezone: interview.timezone || "Asia/Kathmandu",
          meetingLink: interview.meetingLink || "",
          location: interview.location || "",
          notes: interview.notes || "",
          customMessage: customMessage || "",
        });
        break;
      }
      case "cancel_interview": {
        content = buildInterviewCancelledEmailContent({
          candidateName,
          companyName,
          jobTitle,
          scheduledAt: application.interview?.scheduledAt || null,
          reason: cancellationReason || "",
          customMessage: customMessage || "",
        });
        break;
      }
      case "status_change": {
        if (!status) return res.status(400).json({ message: "A status is required to preview this email." });
        content = buildStatusChangeEmailContent({
          candidateName,
          companyName,
          jobTitle,
          status,
          customMessage: customMessage || "",
          applicationId: application._id,
        });
        break;
      }
      case "assign_assessment": {
        if (!assessmentId) return res.status(400).json({ message: "assessmentId is required to preview this email." });
        const assessment = await Assessment.findById(assessmentId).select("title duration employer deadline");
        if (!assessment) return res.status(404).json({ message: "Assessment not found" });
        if (String(assessment.employer) !== employerId) {
          return res.status(403).json({ message: "Not authorized to preview this assessment's email" });
        }
        const effectiveDeadline = deadline ? new Date(deadline) : assessment.deadline;
        content = buildAssessmentRequestEmailContent({
          candidateName,
          companyName,
          jobTitle,
          assessmentTitle: assessment.title || "Technical Assessment",
          duration: formatDuration(assessment.duration),
          assessmentLink: `${FRONTEND_URL}/assessment/${application._id}/<generated-on-send>`,
          assessmentDeadline: effectiveDeadline ? new Date(effectiveDeadline).toDateString() : "",
          customMessage: customMessage || "",
        });
        break;
      }
      default:
        return res.status(400).json({ message: "Unknown preview action" });
    }

    res.json({ to: candidateEmail, ...content });
  } catch (error) {
    console.error("Error building email preview:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// POST /api/employer/applications/:applicationId/message — the
// standalone "[Send Message]" action (spec section 22): a one-off
// employer note attached to this application. Distinct from, and does
// not replace, the full Conversation/Message system's "Message
// Candidate" entry point already in Applicants.tsx — this is a
// lighter, one-way note tied to a specific application, matching the
// Notification model's own "job_provider_message" comment.
// ============================================================
const sendCustomMessageToCandidate = async (req, res) => {
  const { applicationId } = req.params;
  const { message } = req.body;
  const employerId = req.user.id;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: "Message text is required" });
  }

  try {
    const application = await Application.findById(applicationId)
      .populate({ path: "job", populate: { path: "employer", select: "name" } })
      .populate("applicant", "name email isActive");
    if (!application) return res.status(404).json({ message: "Application not found" });

    const jobEmployerId = application.job?.employer?._id?.toString() || application.job?.employer?.toString();
    if (jobEmployerId !== employerId) {
      return res.status(403).json({ message: "Not authorized to message this candidate" });
    }

    const candidate = application.applicant;
    const companyName =
      application.job?.companyOverride?.name?.trim() ||
      application.job?.employer?.name?.trim() ||
      "QuickJobs Employer";

    if (candidate?._id) {
      await sendNotification({
        recipient: candidate._id,
        type: "job_provider_message",
        message: message.trim().slice(0, 300),
        relatedJob: application.job._id,
        relatedApplication: application._id,
        link: "/user/applications",
      });
    }

    let emailResult = { success: false };
    if (candidate?.email && candidate.isActive !== false) {
      emailResult = await sendCustomMessageEmail({
        recipient: candidate.email,
        candidateName: candidate.name || "Candidate",
        companyName,
        message: message.trim(),
        applicationId: application._id,
      });
    }

    res.json({ message: "Message sent", emailSent: emailResult.success });
  } catch (error) {
    console.error("Error sending custom message to candidate:", error);
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

    // Check if the employer or super admin is authorized to delete this job
    const isOwner = job.employer && job.employer.toString() === employerId;
    const isSuperAdmin = ["admin", "superadmin"].includes(req.user.role);
    if (!isOwner && !isSuperAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this job" });
    }

    // Use deleteOne method to delete the job
    await Job.deleteOne({ _id: jobId });
    try {
      if (typeof Application.deleteMany === "function") {
        await Application.deleteMany({ job: jobId });
      }
    } catch (err) {
      console.error("Failed to delete applications for job:", err);
    }

    if (isSuperAdmin && !isOwner) {
      await recordAdminAudit({
        user: req.user,
        action: `Super Admin deleted Job Listing #${job._id}`,
        contentType: "Job",
        contentId: job._id,
        details: { title: job.title },
      });
    }

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
  .populate("applicant", "name email profilePic skills qualifications experiences")
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

// Get All Applicants for Employer Jobs — powers the Applications module
// (frontend/.../employer/dashboard/Applicants.tsx). Flat, filterable,
// paginated list (not grouped by job — the old grouped shape had exactly
// one consumer, which now wants a flat table/card list instead).
//
// Query params (all optional): page, limit, search (matches applicant name
// OR job title), status, jobId, dateFrom, dateTo (both inclusive, compared
// against Application.createdAt).
const getAllApplicantsForEmployer = async (req, res) => {
  const employerId = req.user.id;

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const skip = (page - 1) * limit;
  const { search, status, jobId, dateFrom, dateTo } = req.query;

  try {
    const jobs = await Job.find({ employer: employerId }).select("_id title");
    const jobIds = jobs.map((job) => job._id);

    // No jobs posted yet is a normal empty state, not an error — matches
    // getEmployerJobs's own "always 200" convention.
    if (jobIds.length === 0) {
      return res.json({
        applications: [],
        currentPage: page,
        totalPages: 0,
        totalApplications: 0,
        perPage: limit,
        statusCounts: { Pending: 0, Reviewed: 0, "Interview Scheduled": 0, Accepted: 0, Rejected: 0 },
      });
    }

    const scopedJobIds = jobId ? jobIds.filter((id) => id.toString() === jobId) : jobIds;

    const filter = { job: { $in: scopedJobIds } };
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        // Inclusive of the whole end day.
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      const [matchingJobIds, matchingApplicantIds] = await Promise.all([
        Job.find({ _id: { $in: scopedJobIds }, title: regex }).distinct("_id"),
        User.find({ role: "jobseeker", name: regex }).distinct("_id"),
      ]);
      filter.$or = [{ job: { $in: matchingJobIds } }, { applicant: { $in: matchingApplicantIds } }];
    }

    const [applications, totalApplications, statusCountsRaw] = await Promise.all([
      Application.find(filter)
        .populate("applicant", "name email profilePic skills qualifications experiences headline bio socialLinks projects certifications")
        .populate("job", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments(filter),
      // Status counts always reflect every application across the
      // employer's jobs (job/search/date filters excluded), so the summary
      // strip stays a stable "overview," not something that jumps around
      // as the employer types into the search box.
      Application.aggregate([
        { $match: { job: { $in: jobIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = { Pending: 0, Reviewed: 0, "Interview Scheduled": 0, Accepted: 0, Rejected: 0 };
    statusCountsRaw.forEach(({ _id, count }) => {
      if (_id in statusCounts) statusCounts[_id] = count;
    });

    res.json({
      applications: applications.map((app) => ({
        applicationId: app._id,
        applicant: app.applicant,
        job: app.job,
        coverLetter: app.coverLetter,
        resume: app.resume,
        howDidYouHear: app.howDidYouHear,
        status: app.status,
        interview: app.interview,
        appliedAt: app.createdAt,
      })),
      currentPage: page,
      totalPages: Math.ceil(totalApplications / limit),
      totalApplications,
      perPage: limit,
      statusCounts,
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

// Authorized resume download / view endpoint for employers
const getApplicationResume = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const employerId = req.user.id;

    const application = await Application.findById(applicationId).populate("job applicant");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const isOwnerEmployer = application.job && application.job.employer.toString() === employerId;
    const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";
    if (!isOwnerEmployer && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to access this resume" });
    }

    const resume = application.resume;
    if (!resume || typeof resume !== "string" || !resume.trim()) {
      return res.status(404).json({ message: "No resume attached to this application." });
    }

    const normalized = resume.replace(/\\/g, "/");
    const isObsoleteLocal =
      !normalized.startsWith("http://") &&
      !normalized.startsWith("https://") &&
      (process.env.NODE_ENV === "production" ||
        normalized.includes("/opt/render/") ||
        normalized.startsWith("backend/uploads/") ||
        normalized.includes("/backend/uploads/"));

    if (isObsoleteLocal) {
      return res.status(404).json({
        message: "Resume unavailable — please ask the applicant to upload again",
        unavailable: true,
      });
    }

    const isDownload = req.query.download === "true";
    const applicantName = application.applicant?.name || "applicant";
    const filename = `${applicantName.replace(/[^a-zA-Z0-9]/g, "_")}_resume.pdf`;

    let deliveryUrl = resume;
    if (resume.startsWith("https://res.cloudinary.com/")) {
      deliveryUrl = getCloudinaryPrivateDownloadUrl(resume, isDownload ? filename : undefined);
    }

    // Stream remote file (e.g. from signed Cloudinary URL) with correct PDF MIME type
    if (deliveryUrl.startsWith("http://") || deliveryUrl.startsWith("https://")) {
      try {
        const upstreamRes = await fetch(deliveryUrl);
        if (upstreamRes.ok) {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `${isDownload ? "attachment" : "inline"}; filename="${filename}"`
          );
          const arrayBuf = await upstreamRes.arrayBuffer();
          return res.send(Buffer.from(arrayBuf));
        } else {
          console.error(`Upstream returned ${upstreamRes.status} for resume URL: ${deliveryUrl}`);
        }
      } catch (fetchErr) {
        console.error("Failed to stream resume from upstream:", fetchErr);
      }
    } else {
      const localFilePath = path.join(__dirname, "..", deliveryUrl);
      if (fs.existsSync(localFilePath)) {
        if (isDownload) {
          return res.download(localFilePath, filename);
        }
        return res.sendFile(localFilePath);
      }
    }

    return res.redirect(deliveryUrl);
  } catch (err) {
    console.error("Error getting application resume:", err);
    res.status(500).json({ message: "Server error" });
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
  getApplicationResume,
  resendInterviewEmail,
  updateInterviewOutcome,
  previewApplicationEmail,
  sendCustomMessageToCandidate,
};