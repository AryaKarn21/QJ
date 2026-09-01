const Job = require("../models/Job");
const User = require("../models/User");
const Application = require("../models/Application");

// GET /api/stats/public — real, aggregate, non-sensitive platform counts for
// the landing page's trust bar (Active Jobs / Companies / Job Seekers /
// Success Rate). No auth required: every number here is a count, never a
// list of actual records, so nothing personally identifiable is exposed.
exports.getPublicStats = async (req, res) => {
  try {
    const [activeJobs, companies, jobseekers, totalApplications, acceptedApplications] = await Promise.all([
      Job.countDocuments({ status: "Active" }),
      User.countDocuments({ role: "employer", isVerified: true }),
      User.countDocuments({ role: "jobseeker" }),
      Application.countDocuments({}),
      Application.countDocuments({ status: "Accepted" }),
    ]);

    // Real, computed from actual application outcomes — 0 (not a made-up
    // fallback number) until there's enough data to say otherwise.
    const successRate = totalApplications > 0
      ? Math.round((acceptedApplications / totalApplications) * 100)
      : 0;

    res.json({ activeJobs, companies, jobseekers, successRate });
  } catch (error) {
    console.error("Error fetching public stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
