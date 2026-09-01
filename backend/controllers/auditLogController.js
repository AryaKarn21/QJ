const AuditLog = require("../models/AuditLog");

// Paginated, filterable audit log listing for the admin "Audit Logs" page.
// Superadmin only (see routes/adminRoutes.js) — this is a record of every
// admin/security-sensitive action taken on the platform, including by
// other admins, so it deliberately isn't visible to regular admins.
const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const { module: moduleName, success, search, actorId, from, to } = req.query;

    const filter = {};
    if (moduleName && moduleName !== "all") filter.module = moduleName;
    if (success === "true") filter.success = true;
    if (success === "false") filter.success = false;
    if (actorId) filter["actor.id"] = actorId;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { action: regex },
        { path: regex },
        { targetLabel: regex },
        { "actor.name": regex },
        { "actor.email": regex },
      ];
    }

    const [logs, total, moduleFacet] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(filter),
      // Distinct module names for the filter dropdown — computed against
      // the full collection (not the current filter) so options don't
      // disappear as the admin narrows their search.
      AuditLog.distinct("module"),
    ]);

    res.json({
      logs,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      modules: moduleFacet.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Quick summary counts for the KPI cards at the top of the page — total
// events, failures, and distinct actors, all scoped to the last 24 hours
// so the page has something more immediately useful than an all-time total.
const getAuditLogStats = async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalLast24h, failuresLast24h, activeActors, totalAllTime] = await Promise.all([
      AuditLog.countDocuments({ createdAt: { $gte: since } }),
      AuditLog.countDocuments({ createdAt: { $gte: since }, success: false }),
      AuditLog.distinct("actor.id", { createdAt: { $gte: since }, "actor.id": { $exists: true } }),
      AuditLog.countDocuments(),
    ]);

    res.json({
      totalLast24h,
      failuresLast24h,
      activeActorsLast24h: activeActors.length,
      totalAllTime,
    });
  } catch (error) {
    console.error("Error fetching audit log stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getAuditLogs, getAuditLogStats };