const User = require("../models/User");
const Job = require("../models/Job");
const Revenue = require("../models/Revenue");
const Application = require("../models/Application");
const Post = require("../models/Post");
const Blog = require("../models/Blog");
const Comment = require("../models/Comment");

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Very small, dependency-free device classifier. Good enough to bucket
 * "who's on mobile vs desktop" without pulling in a UA-parsing library —
 * this is a nice-to-have breakdown, not a security-sensitive check.
 */
function classifyDevice(userAgent) {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "Tablet";
  if (/mobile|iphone|android/.test(ua)) return "Mobile";
  return "Desktop";
}

/** Fills in zero-count days so charts don't have gaps for days with no activity. */
function fillDateRange(startDate, days, dataByDate, valueKeys) {
  const result = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    const existing = dataByDate[key] || {};
    const row = { date: key };
    valueKeys.forEach((k) => {
      row[k] = existing[k] || 0;
    });
    result.push(row);
  }
  return result;
}

async function buildUserAnalytics() {
  const days = 90;
  const startDate = new Date(Date.now() - days * DAY_MS);

  const [growthAgg, totalJobseekers, totalEmployers] = await Promise.all([
    User.aggregate([
      { $match: { createdAt: { $gte: startDate }, role: { $in: ["jobseeker", "employer"] } } },
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, role: "$role" },
          count: { $sum: 1 },
        },
      },
    ]),
    User.countDocuments({ role: "jobseeker" }),
    User.countDocuments({ role: "employer" }),
  ]);

  const byDate = {};
  growthAgg.forEach((row) => {
    const { date, role } = row._id;
    byDate[date] = byDate[date] || {};
    byDate[date][role] = row.count;
  });

  const growth = fillDateRange(startDate, days, byDate, ["jobseeker", "employer"]);

  return { totalJobseekers, totalEmployers, growth };
}

async function buildJobAnalytics() {
  const days = 90;
  const startDate = new Date(Date.now() - days * DAY_MS);

  const [growthAgg, statusAgg, categoryAgg, totalJobs] = await Promise.all([
    Job.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Job.aggregate([
      { $group: { _id: "$jobcategory", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Job.countDocuments(),
  ]);

  const byDate = {};
  growthAgg.forEach((row) => {
    byDate[row._id] = { count: row.count };
  });
  const growth = fillDateRange(startDate, days, byDate, ["count"]);

  return {
    totalJobs,
    growth,
    byStatus: statusAgg.map((s) => ({ status: s._id || "Unknown", count: s.count })),
    topCategories: categoryAgg.map((c) => ({ category: c._id || "Uncategorized", count: c.count })),
  };
}

async function buildRevenueAnalytics() {
  const months = 12;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (months - 1));
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const [monthlyAgg, totalAgg, topEmployersAgg] = await Promise.all([
    Revenue.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]),
    Revenue.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    Revenue.aggregate([
      { $group: { _id: "$paidBy", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "employer" } },
      { $unwind: { path: "$employer", preserveNullAndEmptyArrays: true } },
      { $project: { total: 1, name: { $ifNull: ["$employer.name", "Unknown"] } } },
    ]),
  ]);

  // Fill in zero-revenue months so the chart doesn't skip empty months.
  const byMonth = {};
  monthlyAgg.forEach((row) => {
    byMonth[row._id] = row.total;
  });
  const monthlyTrend = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyTrend.push({ month: key, total: byMonth[key] || 0 });
  }

  return {
    totalRevenue: totalAgg[0]?.total || 0,
    monthlyTrend,
    topEmployers: topEmployersAgg.map((e) => ({ name: e.name, total: e.total })),
  };
}

async function buildDeviceAnalytics() {
  // Only pull the one field we need — keeps this cheap even as the user base grows.
  const users = await User.find({ lastLoginUserAgent: { $exists: true, $ne: null } })
    .select("lastLoginUserAgent")
    .lean();

  const counts = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
  users.forEach((u) => {
    counts[classifyDevice(u.lastLoginUserAgent)]++;
  });

  const total = users.length;
  return {
    total,
    breakdown: Object.entries(counts)
      .map(([device, count]) => ({ device, count }))
      .filter((d) => d.count > 0),
  };
}

async function buildApplicationAnalytics() {
  const days = 90;
  const startDate = new Date(Date.now() - days * DAY_MS);

  const [growthAgg, statusAgg, totalApplications] = await Promise.all([
    Application.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Application.countDocuments(),
  ]);

  const byDate = {};
  growthAgg.forEach((row) => {
    byDate[row._id] = { count: row.count };
  });
  const growth = fillDateRange(startDate, days, byDate, ["count"]);

  return {
    totalApplications,
    growth,
    byStatus: statusAgg.map((s) => ({ status: s._id || "pending", count: s.count })),
  };
}

async function buildCommunityAnalytics() {
  const days = 90;
  const startDate = new Date(Date.now() - days * DAY_MS);

  const [growthAgg, totalPosts, totalComments] = await Promise.all([
    Post.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Post.countDocuments(),
    Comment.countDocuments(),
  ]);

  const byDate = {};
  growthAgg.forEach((row) => {
    byDate[row._id] = { count: row.count };
  });
  const growth = fillDateRange(startDate, days, byDate, ["count"]);

  return {
    totalPosts,
    totalComments,
    growth,
  };
}

async function buildBlogAnalytics() {
  const days = 90;
  const startDate = new Date(Date.now() - days * DAY_MS);

  const [growthAgg, totalBlogs, publishedBlogs, draftBlogs] = await Promise.all([
    Blog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Blog.countDocuments(),
    Blog.countDocuments({ isPublished: true }),
    Blog.countDocuments({ isPublished: false }),
  ]);

  const byDate = {};
  growthAgg.forEach((row) => {
    byDate[row._id] = { count: row.count };
  });
  const growth = fillDateRange(startDate, days, byDate, ["count"]);

  return {
    totalBlogs,
    publishedBlogs,
    draftBlogs,
    growth,
  };
}

/**
 * GET /api/admin/analytics
 * Single combined payload for the Analytics Hub — one request, one loading
 * state, seven tabs/sections worth of real data.
 */
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const [users, jobs, revenue, devices, applications, community, blogs] = await Promise.all([
      buildUserAnalytics(),
      buildJobAnalytics(),
      buildRevenueAnalytics(),
      buildDeviceAnalytics(),
      buildApplicationAnalytics(),
      buildCommunityAnalytics(),
      buildBlogAnalytics(),
    ]);

    return res.status(200).json({ users, jobs, revenue, devices, applications, community, blogs });
  } catch (error) {
    console.error("Failed to build analytics overview:", error.message);
    return res.status(500).json({ message: "Failed to load analytics" });
  }
};