const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");
const Jobseeker = require("../models/Jobseeker");
const TrendingSettings = require("../models/TrendingSettings");
const sendNotification = require("../utils/sendNotifications");
const { COUNTRIES } = require("../data/countries");
const { CURRENCIES, CURRENCY_BY_COUNTRY } = require("../data/currencies");
const { persistUpload } = require("../services/media.service");
const {
  UPDATABLE_JOB_FIELDS,
  deriveSalaryString,
  deriveExperienceString,
} = require("../utils/jobHelpers");
const { recordAdminAudit } = require("../utils/auditLogger");

// GET /api/jobs/meta/countries — public. The single list the job-posting
// form's Country <select> reads (see postjobs.tsx) — the same array
// models/Job.js validates `country` against, so the form can never offer
// a value the backend would then reject, and adding a country only ever
// means editing data/countries.js once.
const getCountryList = (req, res) => {
  res.json(COUNTRIES);
};

// GET /api/jobs/meta/currencies — public. Feeds the Post a Job form's
// searchable currency selector (see postjobs.tsx) and the country->currency
// default it suggests when an employer picks a job location.
const getCurrencyList = (req, res) => {
  res.json({ currencies: CURRENCIES, countryDefaults: CURRENCY_BY_COUNTRY });
};

// List views (getJobs/getTrendingJobs/getRecentJobs below) only ever show
// a name+logo on a job card, so they deliberately keep populating just
// "name companyLogo" — no change there. The single Job Detail view is the
// one place that needs the employer's full company profile "auto-attached"
// (section 6/7): every public-safe Employer field the About-the-Company
// section can show, without a second query. Kept as one shared list so
// getJobById and applyInJob's confirmation email/notification stay in
// sync with what Employer.js actually has.
// `telephone` is deliberately excluded — it's account contact info, not
// something the "About the Company" section on a public job page asked
// for, and exposing it here would newly let anyone viewing any job page
// harvest an employer's phone number. `email` stays because getJobById
// already exposed it before this change (pre-existing behavior, likely
// for "contact the employer" — left as-is, not this phase's call to
// remove; flagged for the security-pass phase to reconsider).
const COMPANY_PROFILE_FIELDS =
  "name email companyLogo coverPhoto headline description industryType " +
  "companySize establishedDate address website socialLinks " +
  "mission culture companyLocations companyBenefits verificationStatus";

// Server-side sort for GET /api/jobs — used to be done client-side AFTER
// pagination (jobListing.tsx sorted only the current page's ~9 jobs by
// `parseInt(job.salary)`, which is a free-text string like "NPR 40,000 -
// 60,000 / Yearly" or "$1000, negotiable" that parseInt can't meaningfully
// parse, so "Salary" sort silently did nothing, and "Newest"/"Oldest" only
// ever reordered one page at a time instead of the whole result set).
// Sorts on the structured salaryMin/salaryMax (Phase 1) instead, at the
// DB level, before pagination — a job without a structured salary simply
// sorts as if it had none, rather than crashing or landing randomly.
const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  salaryHigh: { salaryMax: -1, salaryMin: -1, createdAt: -1 },
  salaryLow: { salaryMin: 1, salaryMax: 1, createdAt: -1 },
  // "Relevance" only really means something alongside a search term; with
  // no ranking model to score matches, newest-first is the most useful
  // stand-in — never a fabricated relevance score.
  relevance: { createdAt: -1 },
};

// Get All Jobs
const getJobs = async (req, res) => {
    const {
      page = 1, limit = 6, location, jobtype, level, status, search, employer,
      workMode, minSalary, maxSalary, skills, datePosted, sortBy,
      company, industry, education, minExperience, maxExperience, jobcategory,
    } = req.query;
  const userId = req.user?._id;

  try {
    const limitNum = parseInt(limit);
    const skip = (page - 1) * limitNum;

    const filters = {};
    const andConditions = [];
    if (location) { filters.location = { $regex: location, $options: "i" }; }
    if (jobtype) filters.jobtype = jobtype;
    // Powers the homepage's "Explore Jobs by Field" section — an exact(ish)
    // category match, distinct from `search` below which fuzzy-matches
    // across title/description/location too and would pull in unrelated
    // jobs that merely mention the category name.
    if (jobcategory) {
      filters.jobcategory = { $regex: `^${jobcategory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
    }
        if (level) filters.level = level;
    if (employer) filters.employer = employer; // powers the Company page's Jobs tab
    filters.status = status || "Active"; // public listings only ever show approved jobs
    if (workMode) filters.workMode = workMode;
    if (minSalary) {
      // A job might only have salaryMin, only salaryMax, or both — match
      // if EITHER structured field clears the bar, so a job posted as
      // "up to $80k" (salaryMax only) isn't wrongly excluded from a
      // "$50k+" search just because salaryMin was never filled in.
      const min = Number(minSalary);
      if (!Number.isNaN(min)) {
        andConditions.push({ $or: [{ salaryMin: { $gte: min } }, { salaryMax: { $gte: min } }] });
      }
    }
    if (maxSalary) {
      // Symmetric to minSalary: a job qualifies for "up to $Xk" if either
      // structured field is at or under the cap.
      const max = Number(maxSalary);
      if (!Number.isNaN(max)) {
        andConditions.push({ $or: [{ salaryMax: { $lte: max } }, { salaryMin: { $lte: max } }] });
      }
    }
    if (minExperience || maxExperience) {
      // Naukri-style range-overlap: the jobseeker's given [minExperience,
      // maxExperience] window must overlap the job's own required
      // [job.minExperience, job.maxExperience] window. A job that hasn't
      // set these structured fields yet (pre-Phase-1 postings, or an
      // employer who only filled in the free-text `experience` field)
      // isn't excluded outright — only jobs that DO have the field are
      // actually checked against it, same "don't punish missing
      // structured data" approach minSalary/maxSalary already use.
      if (minExperience) {
        const min = Number(minExperience);
        if (!Number.isNaN(min)) {
          andConditions.push({ $or: [{ maxExperience: { $exists: false } }, { maxExperience: { $gte: min } }] });
        }
      }
      if (maxExperience) {
        const max = Number(maxExperience);
        if (!Number.isNaN(max)) {
          andConditions.push({ $or: [{ minExperience: { $exists: false } }, { minExperience: { $lte: max } }] });
        }
      }
    }
    if (skills) {
      const skillList = String(skills).split(",").map((s) => s.trim()).filter(Boolean);
      if (skillList.length) {
        filters.requiredSkills = {
          $in: skillList.map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
        };
      }
    }
    if (education) {
      filters.education = { $regex: education.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }
    if (datePosted) {
      const days = { "24h": 1, "7d": 7, "30d": 30 }[datePosted];
      if (days) filters.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }
    // `company`/`industry` live on the Employer, not the Job — resolve to
    // a set of employer ids first, same two-step approach as any search
    // across a reference this schema doesn't denormalize. An empty match
    // set still needs a real "no results" answer, not "ignore the filter"
    // — the impossible `_id: null` keeps that honest instead of silently
    // returning every job with no company filter applied.
    if ((company || industry) && !employer) {
      const employerQuery = {};
      if (company) employerQuery.name = { $regex: company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      if (industry) employerQuery.industryType = { $regex: industry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      const matchingEmployers = await User.find({ role: "employer", ...employerQuery }).select("_id").lean();
      filters.employer = { $in: matchingEmployers.length ? matchingEmployers.map((e) => e._id) : [null] };
    }
    if (andConditions.length) filters.$and = andConditions;
    if (search) {
      const keywords = search.trim().split(/\s+/).map(word => word.toLowerCase());
      filters.$or = [
  { title: { $in: keywords.map(word => new RegExp(word, 'i')) } },
  { jobcategory: { $in: keywords.map(word => new RegExp(word, 'i')) } },
  { description: { $in: keywords.map(word => new RegExp(word, 'i')) } },
  { location: { $in: keywords.map(word => new RegExp(word, 'i')) } },
];
    }

    const jobs = await Job.find(filters)
      .populate("employer", "name companyLogo")
      .sort(SORT_OPTIONS[sortBy] || SORT_OPTIONS.newest)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const jobsWithCounts = jobs.map(job => {
      const isSaved = req.user?.savedJobs?.includes(job._id.toString());
      return {
        ...job,
        likeCount: job.likes?.length || 0,
        dislikeCount: job.dislikes?.length || 0,
        isSaved: !!isSaved,
      };
    });

    const total = await Job.countDocuments(filters);

    res.json({ jobs: jobsWithCounts, total });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get the super-admin-curated trending jobs — filtered to jobs that are
// actually published (status "Active") and, if scheduled, currently inside
// their trending window; ordered by the admin's chosen trendingOrder, and
// capped at TrendingSettings.maxDisplayCount (default 8 if no settings
// document exists yet). This is what keeps expired/scheduled/unpublished/
// deleted jobs from ever leaking onto the public homepage regardless of
// what the admin panel has stored.
const getTrendingJobs = async (req, res) => {
  try {
    const now = new Date();
    const settings = await TrendingSettings.findById(TrendingSettings.SINGLETON_ID).lean();
    const limit = settings?.maxDisplayCount || 8;

    const trendingJobs = await Job.find({
      istrending: true,
      status: "Active",
      $and: [
        { $or: [{ trendingStartDate: null }, { trendingStartDate: { $lte: now } }] },
        { $or: [{ trendingEndDate: null }, { trendingEndDate: { $gte: now } }] },
      ],
    })
      .sort({ trendingOrder: 1, updatedAt: -1 })
      .limit(limit)
      .populate("employer", "name companyLogo")
      .lean();

    const trendingJobsWithCounts = trendingJobs.map(job => {
      const isSaved = req.user?.savedJobs?.includes(job._id.toString());
      return {
        ...job,
        likeCount: job.likes?.length || 0,
        dislikeCount: job.dislikes?.length || 0,
        isSaved: !!isSaved,
      };
    });

    res.json({ jobs: trendingJobsWithCounts });
  } catch (error) {
    console.error("Error fetching trending jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── FIX: Get recent 6 jobs ────────────────────────────────────────────────────
// Previously this filtered { istrending: false } which excluded any job where
// the istrending field was not explicitly set to false (e.g. newly posted jobs).
// Now it returns the 6 most recently posted Active jobs regardless of trending.
const getRecentJobs = async (req, res) => {
  try {
    const recentJobs = await Job.find({ status: "Active" })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("employer", "name companyLogo")
      .lean();

    const recentJobsWithCounts = recentJobs.map(job => {
      const isSaved = req.user?.savedJobs?.includes(job._id.toString());
      return {
        ...job,
        likeCount: job.likes?.length || 0,
        dislikeCount: job.dislikes?.length || 0,
        isSaved: !!isSaved,
      };
    });

    res.json({ jobs: recentJobsWithCounts });
  } catch (error) {
    console.error("Error fetching recent jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get job by ID
const getJobById = async (req, res) => {
  const { id } = req.params;
  const viewerIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

  try {
    const job = await Job.findById(id)
      .populate("employer", COMPANY_PROFILE_FIELDS);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Allow one view per IP per day
    const hasViewedToday = job.views.some((view) =>
      view.ip === viewerIp &&
      new Date(view.date).toDateString() === new Date().toDateString()
    );

    if (!hasViewedToday) {
      job.views.push({ ip: viewerIp, date: new Date() });
      await job.save();
    }

    const jobData = job.toObject();
    jobData.likeCount = job.likes?.length || 0;
    jobData.dislikeCount = job.dislikes?.length || 0;
    jobData.viewCount = job.views?.length || 0;
    // Same isSaved computation getJobs/getTrendingJobs/getRecentJobs
    // already do — needs authenticateOptional on this route (see
    // jobRoutes.js) to ever have a req.user to check.
    jobData.isSaved = !!req.user?.savedJobs?.includes(job._id.toString());
    // Powers "Already Applied" on the Job Detail page (Phase 5) instead
    // of only finding out after submitting — applyInJob already rejects a
    // second application server-side (see below), this just surfaces that
    // same fact up front.
    jobData.isApplied = req.user
      ? !!(await Application.exists({ job: job._id, applicant: req.user._id }))
      : false;

    res.json(jobData);
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get job counts by country
const getJobCountsByCountry = async (req, res) => {
  try {
    const jobCounts = await Job.aggregate([
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 0 } }
      },
      {
        $project: {
          _id: 0,
          country: '$_id',
          jobCount: '$count'
        }
      },
      {
        $sort: { jobCount: -1 }
      }
    ]);

    res.json(jobCounts);
  } catch (error) {
    console.error('Error getting job counts by country:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get job views per unique ip
const getJobViews = async (req, res) => {
  const { id } = req.params;

  try {
    const job = await Job.findById(id).select("views");

    if (!job) return res.status(404).json({ message: "Job not found" });

    let updated = false;

    job.views.forEach((view) => {
      if (!(view.date instanceof Date) || isNaN(new Date(view.date))) {
        view.date = new Date();
        updated = true;
      }
    });

    if (updated) {
      await job.save();
    }

    const uniqueIPs = [...new Map(job.views.map(v => [v.ip, v])).values()];

    res.json({
      uniqueViewCount: uniqueIPs.length,
      uniqueViews: uniqueIPs,
    });
  } catch (err) {
    console.error("Error getting job views:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Apply in Job
const applyInJob = async (req, res) => {
  const { jobId, howDidYouHear, coverLetter } = req.body;
  const jobseekerId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: "Resume file is required." });
  }

  try {
    const user = await User.findById(jobseekerId);
    if (!user || user.role !== "jobseeker") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const job = await Job.findById(jobId).populate("employer");
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.deadline && new Date(job.deadline) < new Date()) {
      return res
        .status(400)
        .json({ message: "The application deadline for this job has passed." });
    }

    const alreadyApplied = await Application.findOne({
      job: jobId,
      applicant: jobseekerId,
    });

    if (alreadyApplied) {
      return res
        .status(400)
        .json({ message: "You have already applied for this job" });
    }

    // Same storage path as every other upload in this app (profile pics,
    // resumes, company logos) — Cloudinary when configured, local disk
    // fallback in dev — so the saved value is always a fetchable URL, never
    // the server's own filesystem path (see applicationUploadMiddleware.js).
    const resumePath = await persistUpload(req.file, "resumes", jobseekerId);

    const application = new Application({
      job: jobId,
      applicant: jobseekerId,
      howDidYouHear,
      coverLetter,
      resume: resumePath,
    });

    await application.save();

    await Job.findByIdAndUpdate(jobId, {
      $addToSet: { jobseekers: jobseekerId },
    });

    if (job.employer && job.employer._id) {
      await sendNotification({
        recipient: job.employer._id,
        type: "job_application",
        message: `${user.name} applied to your job: ${job.title}`,
        relatedJob: job._id,
        relatedApplication: application._id,
        link: `/employer/jobs/${job._id}/applicants`,
      });
    }

    res.status(201).json({ message: "Application submitted successfully" });
  } catch (error) {
    if (error.code === "CLOUD_STORAGE_NOT_CONFIGURED") {
      // Not the applicant's fault, and not a generic server bug — file
      // storage is genuinely unavailable right now. 503 (with the same
      // safe, secret-free message persistUpload already produced) so the
      // frontend/support can tell this apart from a real failure.
      console.error("Apply error: resume storage not configured", error);
      return res.status(503).json({ message: error.message });
    }
    console.error("Apply error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Like a job
const likeJob = async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== "jobseeker") {
      return res.status(403).json({ message: "Only jobseekers can like a job." });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    job.dislikes = job.dislikes.filter(uid => uid.toString() !== userId.toString());

    if (job.likes.includes(userId)) {
      job.likes = job.likes.filter(uid => uid.toString() !== userId.toString());
    } else {
      job.likes.push(userId);
    }

    await job.save();
    res.json({ message: "Like updated", likes: job.likes.length, dislikes: job.dislikes.length });
  } catch (error) {
    console.error("Error liking job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Dislike a job
const dislikeJob = async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== "jobseeker") {
      return res.status(403).json({ message: "Only jobseekers can dislike a job." });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    job.likes = job.likes.filter(uid => uid.toString() !== userId.toString());

    if (job.dislikes.includes(userId)) {
      job.dislikes = job.dislikes.filter(uid => uid.toString() !== userId.toString());
    } else {
      job.dislikes.push(userId);
    }

    await job.save();
    res.json({ message: "Dislike updated", dislikes: job.dislikes.length, likes: job.likes.length });
  } catch (error) {
    console.error("Error disliking job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Save/Unsave job
const saveJob = async (req, res) => {
  const userId = req.user._id;
  const jobId = req.params.id;

  try {
    const jobExists = await Job.exists({ _id: jobId });
    if (!jobExists) {
      return res.status(404).json({ message: "Job not found" });
    }

    const jobseeker = await Jobseeker.findById(userId);
    if (!jobseeker) {
      return res.status(403).json({ message: "Unauthorized or not a jobseeker" });
    }

    const isSaved = jobseeker.savedJobs.includes(jobId);

    if (isSaved) {
      jobseeker.savedJobs.pull(jobId);
    } else {
      jobseeker.savedJobs.addToSet(jobId);
    }

    await jobseeker.save();

    res.status(200).json({
      message: isSaved ? "Job unsaved" : "Job saved",
      saved: !isSaved,
    });
  } catch (error) {
    console.error("Error in toggleSaveJob:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get saved jobs
const getSavedJobs = async (req, res) => {
  const jobseekerId = req.user._id;

  try {
    const jobseeker = await Jobseeker.findById(jobseekerId).lean();

    if (!jobseeker || !jobseeker.savedJobs || jobseeker.savedJobs.length === 0) {
      return res.status(200).json([]);
    }

    const savedJobs = await Job.find({ _id: { $in: jobseeker.savedJobs } })
      .populate("employer", "name email companyLogo")
      .sort({ createdAt: -1 });

    res.status(200).json(savedJobs);
  } catch (error) {
    console.error("Error fetching saved jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get applied jobs
const getAppliedJobs = async (req, res) => {
  const jobseekerId = req.user._id || req.user.id;

  try {
    const applications = await Application.find({ applicant: jobseekerId })
      .populate({
        path: "job",
        populate: { path: "employer", select: "name email companyLogo" },
      })
      .select("job status createdAt interview")
      .sort({ createdAt: -1 });

    const validApplications = applications.filter((app) => app && app.job);

    const appliedJobs = validApplications.map((app) => {
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

    res.status(200).json(appliedJobs);
  } catch (error) {
    console.error("Error fetching applied jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a Job (Job Listing Owner OR Super Admin/Admin)
const updateJob = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id || req.user.id;
  const isSuperAdmin = ["admin", "superadmin"].includes(req.user.role);

  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const isOwner = job.employer && String(job.employer) === String(userId);
    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ message: "Not authorized to edit this job" });
    }

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

    UPDATABLE_JOB_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });

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

    if (req.body.status !== undefined) {
      const requested = req.body.status;
      if (isSuperAdmin) {
        job.status = requested;
      } else {
        const alreadyApproved = job.status === "Active" || job.status === "Inactive";
        const isDraft = job.status === "Draft";
        if (alreadyApproved && ["Active", "Inactive", "Closed"].includes(requested)) {
          job.status = requested;
        } else if (isDraft && requested === "Draft") {
          // keep draft
        } else if (isDraft && requested === "Pending") {
          job.status = "Pending";
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

    res.json({ message: "Job updated successfully", job });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Delete a Job (Job Listing Owner OR Super Admin/Admin)
const deleteJob = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id || req.user.id;
  const isSuperAdmin = ["admin", "superadmin"].includes(req.user.role);

  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const isOwner = job.employer && String(job.employer) === String(userId);
    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this job" });
    }

    await Job.findByIdAndDelete(id);
    try {
      if (typeof Application.deleteMany === "function") {
        await Application.deleteMany({ job: id });
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

// Update Job Status (Activate / Deactivate)
const updateJobStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user._id || req.user.id;
  const isSuperAdmin = ["admin", "superadmin"].includes(req.user.role);

  if (!["Active", "Inactive", "Closed", "Pending", "Rejected", "Draft"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const isOwner = job.employer && String(job.employer) === String(userId);
    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ message: "Not authorized to update job status" });
    }

    if (!isSuperAdmin) {
      const alreadyApproved = job.status === "Active" || job.status === "Inactive";
      if (!alreadyApproved && (status === "Active" || status === "Rejected")) {
        return res.status(403).json({ message: "Only an admin can approve or reject a job." });
      }
    }

    job.status = status;
    await job.save();

    if (isSuperAdmin && !isOwner) {
      await recordAdminAudit({
        user: req.user,
        action: `Super Admin ${status === "Active" ? "activated" : "deactivated"} Job Listing #${job._id}`,
        contentType: "Job",
        contentId: job._id,
        details: { title: job.title, newStatus: status },
      });
    }

    res.json({ message: `Job status updated to ${status}`, job });
  } catch (error) {
    console.error("Error updating job status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getJobs,
  getTrendingJobs,
  getJobCountsByCountry,
  getCountryList,
  getCurrencyList,
  getRecentJobs,
  getJobById,
  getJobViews,
  applyInJob,
  likeJob,
  dislikeJob,
  saveJob,
  getSavedJobs,
  getAppliedJobs,
  updateJob,
  deleteJob,
  updateJobStatus,
};