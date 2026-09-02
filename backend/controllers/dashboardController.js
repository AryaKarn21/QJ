/**
 * dashboardController.js
 * 
 * DROP-IN ADDITION to the existing adminController.js.
 * Add these two new exports to backend/controllers/adminController.js,
 * or extract to a separate file and mount at:
 *   router.get("/dashboard-stats", authenticate, authorizeAdmin, getDashboardStats);
 *   router.get("/activity-feed",   authenticate, authorizeAdmin, getActivityFeed);
 * 
 * Reuses existing models — no schema changes needed.
 */

const Job = require("../models/Job");
const User = require("../models/User");
const Application = require("../models/Application");
const Revenue = require("../models/Revenue");

// ── Helpers ──────────────────────────────────────

/** Count documents in a model between two dates */
const countBetween = (Model, query, start, end) =>
  Model.countDocuments({ ...query, createdAt: { $gte: start, $lte: end } });

/** Build a 30-day time series: [{label: "Jun 1", value: N}, ...] */
const buildDailySeries = async (Model, matchQuery = {}) => {
  const now = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    return d;
  });

  const results = await Promise.all(
    days.map(async (d) => {
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end   = new Date(d); end.setHours(23, 59, 59, 999);
      const count = await Model.countDocuments({
        ...matchQuery,
        createdAt: { $gte: start, $lte: end }
      });
      return {
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: count,
      };
    })
  );
  return results;
};

/** Revenue sum between two dates */
const sumRevenueBetween = async (start, end) => {
  const result = await Revenue.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result[0]?.total ?? 0;
};

/** MoM delta percentage */
const calcDelta = (current, previous) => {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// ── GET /api/admin/dashboard-stats ───────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    // Period boundaries
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const todayStart     = new Date(now); todayStart.setHours(0, 0, 0, 0);

    // ── KPI totals ────────────────────────────────
    const [
      totalJobseekers, totalEmployers, totalJobs, totalApplications,
      newJobseekers_thisMonth, newJobseekers_lastMonth,
      newEmployers_thisMonth,  newEmployers_lastMonth,
      newJobs_thisMonth,       newJobs_lastMonth,
      newApps_thisMonth,       newApps_lastMonth,
      revenue_thisMonth,       revenue_lastMonth,
      todayLogins,
      pendingEmployers,
      pendingJobs,
    ] = await Promise.all([
      User.countDocuments({ role: "jobseeker" }),
      User.countDocuments({ role: "employer" }),
      Job.countDocuments(),
      Application.countDocuments(),

      countBetween(User, { role: "jobseeker" }, thisMonthStart, now),
      countBetween(User, { role: "jobseeker" }, lastMonthStart, lastMonthEnd),
      countBetween(User, { role: "employer" }, thisMonthStart, now),
      countBetween(User, { role: "employer" }, lastMonthStart, lastMonthEnd),
      countBetween(Job, {}, thisMonthStart, now),
      countBetween(Job, {}, lastMonthStart, lastMonthEnd),
      countBetween(Application, {}, thisMonthStart, now),
      countBetween(Application, {}, lastMonthStart, lastMonthEnd),

      sumRevenueBetween(thisMonthStart, now),
      sumRevenueBetween(lastMonthStart, lastMonthEnd),

      // Today's logins (reuse existing lastLogin field)
      User.countDocuments({ lastLogin: { $gte: todayStart } }),
      // Unverified employers awaiting approval
      User.countDocuments({ role: "employer", isVerified: false }),
      // Jobs with non-active status (adapt to your Job.status values)
      Job.countDocuments({ status: { $in: ["pending", "draft"] } }),
    ]);

    // ── Growth series (30d) — run in parallel ─────
    const [userSeries, jobSeries, appSeries] = await Promise.all([
      buildDailySeries(User, { role: { $in: ["jobseeker", "employer"] } }),
      buildDailySeries(Job),
      buildDailySeries(Application),
    ]);

    // Revenue 30-day series
    const revenueSeries = await (async () => {
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i)); return d;
      });
      const points = await Promise.all(days.map(async (d) => {
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end   = new Date(d); end.setHours(23, 59, 59, 999);
        const val   = await sumRevenueBetween(start, end);
        return {
          label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: val,
        };
      }));
      return points;
    })();

    res.json({
      kpis: {
        totalJobseekers,
        totalEmployers,
        totalJobs,
        totalApplications,
        todayLogins,
        revenueThisMonth: revenue_thisMonth,
        deltas: {
          jobseekers:   calcDelta(newJobseekers_thisMonth, newJobseekers_lastMonth),
          employers:    calcDelta(newEmployers_thisMonth,  newEmployers_lastMonth),
          jobs:         calcDelta(newJobs_thisMonth,       newJobs_lastMonth),
          applications: calcDelta(newApps_thisMonth,       newApps_lastMonth),
          revenue:      calcDelta(revenue_thisMonth,       revenue_lastMonth),
        },
      },
      pendingApprovals: {
        employersAwaitingVerification: pendingEmployers,
        jobsPendingReview: pendingJobs,
      },
      series: {
        users:       userSeries,
        jobs:        jobSeries,
        applications: appSeries,
        revenue:     revenueSeries,
      },
    });
  } catch (err) {
    console.error("getDashboardStats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/admin/activity-feed ─────────────────
// Returns last 20 meaningful events (new users, new jobs, recent applications)
exports.getActivityFeed = async (req, res) => {
  try {
    const [recentUsers, recentJobs, recentApps] = await Promise.all([
      User.find({ role: { $in: ["jobseeker", "employer"] } })
        .sort({ createdAt: -1 })
        .limit(6)
        .select("name email role createdAt isVerified"),
      // Excludes "Draft" (Phase 4) — an employer saving/editing a draft
      // isn't a real "new job posted" event worth surfacing to admins.
      Job.find({ status: { $ne: "Draft" } })
        .sort({ createdAt: -1 })
        .limit(7)
        .populate("employer", "name")
        .select("title status createdAt employer istrending"),
      Application.find()
        .sort({ createdAt: -1 })
        .limit(7)
        .populate("applicant", "name email")
        .populate("job", "title")
        .select("status createdAt applicant job"),
    ]);

    // Merge into unified feed
    const events = [
      ...recentUsers.map(u => ({
        id: u._id,
        type: "user_joined",
        title: u.name || u.email,
        subtitle: u.role === "employer" ? "New employer registered" : "New job seeker joined",
        badge: u.role,
        badgeTone: u.role === "employer" ? "info" : "success",
        ts: u.createdAt,
        needsAction: u.role === "employer" && !u.isVerified,
      })),
      ...recentJobs.map(j => ({
        id: j._id,
        type: "job_posted",
        title: j.title,
        subtitle: `Posted by ${j.employer?.name || "Unknown"}`,
        badge: j.status,
        badgeTone: j.status === "active" ? "success" : j.status === "pending" ? "warning" : "neutral",
        ts: j.createdAt,
        needsAction: j.status === "pending",
      })),
      ...recentApps.map(a => ({
        id: a._id,
        type: "application_submitted",
        title: a.applicant?.name || "Applicant",
        subtitle: `Applied to ${a.job?.title || "a job"}`,
        badge: a.status,
        badgeTone: a.status === "Accepted" ? "success" : a.status === "Rejected" ? "danger" : "neutral",
        ts: a.createdAt,
        needsAction: false,
      })),
    ]
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 20);

    res.json({ events });
  } catch (err) {
    console.error("getActivityFeed:", err);
    res.status(500).json({ message: "Server error" });
  }
};