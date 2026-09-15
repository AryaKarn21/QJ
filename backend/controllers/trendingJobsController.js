const Job = require("../models/Job");
const TrendingSettings = require("../models/TrendingSettings");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A trending row's real-world state, derived from status + the scheduling
// window rather than stored — so it can never drift out of sync with the
// underlying Job document (e.g. an employer closing the job after it was
// marked trending).
const computeTrendingState = (job, now) => {
  if (job.status !== "Active") return "unpublished";
  if (job.trendingStartDate && new Date(job.trendingStartDate) > now) return "scheduled";
  if (job.trendingEndDate && new Date(job.trendingEndDate) < now) return "expired";
  return "active";
};

// GET /api/admin/trending-jobs/eligible?search= — jobs a superadmin can add
// to trending. Only ever "Active" (published, not expired/closed/draft/
// pending/rejected) and not already trending, so the picker never offers
// a duplicate or an ineligible job.
exports.searchEligibleJobs = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const filters = { status: "Active", istrending: { $ne: true } };
    if (search.trim()) {
      const re = new RegExp(escapeRegex(search.trim()), "i");
      filters.title = re;
    }
    const jobs = await Job.find(filters)
      .select("title location jobtype status employer")
      .populate("employer", "name companyLogo")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ jobs });
  } catch (error) {
    console.error("Error searching eligible jobs for trending:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/trending-jobs — every currently-trending job (regardless
// of whether it's presently active/scheduled/expired/unpublished), so the
// admin screen can show and manage the full set, not just what the public
// homepage happens to be showing right now.
exports.listTrendingJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ istrending: true })
      .populate("employer", "name companyLogo")
      .sort({ trendingOrder: 1, updatedAt: -1 })
      .lean();
    const now = new Date();
    const withState = jobs.map((job) => ({ ...job, trendingState: computeTrendingState(job, now) }));
    res.json({ jobs: withState });
  } catch (error) {
    console.error("Error listing trending jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/admin/trending-jobs/:jobId — mark a job trending.
exports.addTrendingJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.istrending) {
      return res.status(409).json({ message: "This job is already trending" });
    }

    const { trendingStartDate, trendingEndDate } = req.body;
    let { trendingOrder } = req.body;
    if (trendingOrder === undefined || trendingOrder === null || trendingOrder === "") {
      const last = await Job.findOne({ istrending: true }).sort({ trendingOrder: -1 }).select("trendingOrder").lean();
      trendingOrder = (last?.trendingOrder ?? -1) + 1;
    }

    job.istrending = true;
    job.trendingOrder = trendingOrder;
    job.trendingStartDate = trendingStartDate || null;
    job.trendingEndDate = trendingEndDate || null;
    await job.save();

    res.status(201).json({ message: "Job added to trending", job });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error adding trending job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/admin/trending-jobs/:jobId — update order/schedule on an
// already-trending job.
exports.updateTrendingJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (!job.istrending) {
      return res.status(409).json({ message: "This job is not currently trending" });
    }

    const { trendingOrder, trendingStartDate, trendingEndDate } = req.body;
    if (trendingOrder !== undefined) job.trendingOrder = trendingOrder;
    if (trendingStartDate !== undefined) job.trendingStartDate = trendingStartDate || null;
    if (trendingEndDate !== undefined) job.trendingEndDate = trendingEndDate || null;
    await job.save();

    res.json({ message: "Trending job updated", job });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error updating trending job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/admin/trending-jobs/:jobId — remove from trending entirely.
exports.removeTrendingJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    job.istrending = false;
    job.trendingOrder = 0;
    job.trendingStartDate = null;
    job.trendingEndDate = null;
    await job.save();

    res.json({ message: "Job removed from trending" });
  } catch (error) {
    console.error("Error removing trending job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/admin/trending-jobs/reorder — body: [{ jobId, trendingOrder }]
exports.reorderTrendingJobs = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order) || !order.length) {
      return res.status(400).json({ message: "order must be a non-empty array" });
    }

    const ops = order
      .filter((entry) => entry && entry.jobId)
      .map((entry) => ({
        updateOne: {
          filter: { _id: entry.jobId, istrending: true },
          update: { $set: { trendingOrder: Number(entry.trendingOrder) || 0 } },
        },
      }));
    if (!ops.length) return res.status(400).json({ message: "No valid entries in order" });

    await Job.bulkWrite(ops);
    res.json({ message: "Trending order updated" });
  } catch (error) {
    console.error("Error reordering trending jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/admin/trending-jobs/settings
exports.getTrendingSettings = async (req, res) => {
  try {
    const settings = await TrendingSettings.findById(TrendingSettings.SINGLETON_ID).lean();
    res.json(settings || { maxDisplayCount: 8 });
  } catch (error) {
    console.error("Error fetching trending settings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/admin/trending-jobs/settings — body: { maxDisplayCount }
exports.updateTrendingSettings = async (req, res) => {
  try {
    const { maxDisplayCount } = req.body;
    const count = Number(maxDisplayCount);
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      return res.status(400).json({ message: "maxDisplayCount must be an integer between 1 and 20" });
    }

    const settings = await TrendingSettings.findByIdAndUpdate(
      TrendingSettings.SINGLETON_ID,
      { maxDisplayCount: count, updatedBy: req.user?.id },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (error) {
    console.error("Error updating trending settings:", error);
    res.status(500).json({ message: "Server error" });
  }
};
