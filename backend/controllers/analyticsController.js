const User = require("../models/User");
const Job = require("../models/Job");
const Revenue = require("../models/Revenue");
const Application = require("../models/Application");
const Post = require("../models/Post");
const Blog = require("../models/Blog");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const EmailLog = require("../models/EmailLog");
const Assessment = require("../models/Assessment");
const AssessmentAttempt = require("../models/AssessmentAttempt");

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

async function buildNotificationAnalytics() {
  const days = 90;
  const startDate = new Date(Date.now() - days * DAY_MS);

  const [growthAgg, typeAgg, totalNotifications, unreadCount] = await Promise.all([
    Notification.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Notification.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Notification.countDocuments(),
    Notification.countDocuments({ isRead: false }),
  ]);

  const byDate = {};
  growthAgg.forEach((row) => {
    byDate[row._id] = { count: row.count };
  });
  const growth = fillDateRange(startDate, days, byDate, ["count"]);

  return {
    totalNotifications,
    unreadCount,
    growth,
    byType: typeAgg.map((t) => ({ type: t._id, count: t.count })),
  };
}

async function buildEmailAnalytics() {
  const days = 90;
  const startDate = new Date(Date.now() - days * DAY_MS);

  const [growthAgg, statusAgg, typeAgg, totalEmails] = await Promise.all([
    EmailLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    EmailLog.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    EmailLog.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    EmailLog.countDocuments(),
  ]);

  const byDate = {};
  growthAgg.forEach((row) => {
    byDate[row._id] = { count: row.count };
  });
  const growth = fillDateRange(startDate, days, byDate, ["count"]);

  const byStatus = statusAgg.map((s) => ({ status: s._id, count: s.count }));
  const failedCount = byStatus.find((s) => s.status === "failed")?.count || 0;
  const failureRate = totalEmails > 0 ? ((failedCount / totalEmails) * 100).toFixed(2) : "0";

  return {
    totalEmails,
    byStatus,
    byType: typeAgg.map((t) => ({ type: t._id, count: t.count })),
    failureRate: `${failureRate}%`,
    growth,
  };
}

async function buildAssessmentAnalytics() {
  const days = 90;
  const startDate = new Date(Date.now() - days * DAY_MS);

  const [growthAgg, statusAgg, scoreAgg, totalAssessments, totalAttempts] = await Promise.all([
    AssessmentAttempt.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    AssessmentAttempt.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    AssessmentAttempt.aggregate([
      { $match: { status: "evaluated" } },
      {
        $group: {
          _id: null,
          avgScorePercent: { $avg: { $cond: [{ $gt: ["$maxScore", 0] }, { $multiply: [{ $divide: ["$score", "$maxScore"] }, 100] }, 0] } },
          passCount: { $sum: { $cond: ["$passed", 1, 0] } },
          evaluatedCount: { $sum: 1 },
        },
      },
    ]),
    Assessment.countDocuments(),
    AssessmentAttempt.countDocuments(),
  ]);

  const byDate = {};
  growthAgg.forEach((row) => {
    byDate[row._id] = { count: row.count };
  });
  const growth = fillDateRange(startDate, days, byDate, ["count"]);

  const scoreStats = scoreAgg[0];
  const passRate = scoreStats?.evaluatedCount > 0 ? ((scoreStats.passCount / scoreStats.evaluatedCount) * 100).toFixed(2) : "0";

  return {
    totalAssessments,
    totalAttempts,
    avgScorePercent: scoreStats ? Math.round(scoreStats.avgScorePercent) : 0,
    passRate: `${passRate}%`,
    byStatus: statusAgg.map((s) => ({ status: s._id, count: s.count })),
    growth,
  };
}

async function buildInterviewAnalytics() {
  const days = 90;
  const startDate = new Date(Date.now() - days * DAY_MS);

  const [growthAgg, statusAgg, typeAgg, totalInterviews, avgDurationAgg] = await Promise.all([
    Application.aggregate([
      { $match: { "interview.scheduledAt": { $exists: true, $ne: null }, createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { "interview.scheduledAt": { $exists: true, $ne: null } } },
      { $group: { _id: "$interview.status", count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { "interview.type": { $exists: true, $ne: null } } },
      { $group: { _id: "$interview.type", count: { $sum: 1 } } },
    ]),
    Application.countDocuments({ "interview.scheduledAt": { $exists: true, $ne: null } }),
    Application.aggregate([
      { $match: { "interview.scheduledAt": { $exists: true, $ne: null } } },
      { $group: { _id: null, avgDuration: { $avg: "$interview.duration" } } },
    ]),
  ]);

  const byDate = {};
  growthAgg.forEach((row) => {
    byDate[row._id] = { count: row.count };
  });
  const growth = fillDateRange(startDate, days, byDate, ["count"]);

  return {
    totalInterviews,
    avgDuration: Math.round(avgDurationAgg[0]?.avgDuration || 0),
    byStatus: statusAgg.map((s) => ({ status: s._id || "SCHEDULED", count: s.count })),
    byType: typeAgg.map((t) => ({ type: t._id, count: t.count })),
    growth,
  };
}

/**
 * GET /api/admin/analytics
 * Single combined payload for the Analytics Hub — one request, one loading
 * state, all tabs/sections worth of real data.
 */
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const [
      users, jobs, revenue, devices, applications, community, blogs,
      notifications, emails, assessments, interviews,
    ] = await Promise.all([
      buildUserAnalytics(),
      buildJobAnalytics(),
      buildRevenueAnalytics(),
      buildDeviceAnalytics(),
      buildApplicationAnalytics(),
      buildCommunityAnalytics(),
      buildBlogAnalytics(),
      buildNotificationAnalytics(),
      buildEmailAnalytics(),
      buildAssessmentAnalytics(),
      buildInterviewAnalytics(),
    ]);

    return res.status(200).json({
      users, jobs, revenue, devices, applications, community, blogs,
      notifications, emails, assessments, interviews,
    });
  } catch (error) {
    console.error("Failed to build analytics overview:", error.message);
    return res.status(500).json({ message: "Failed to load analytics" });
  }
};