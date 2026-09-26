const EmailLog = require("../models/EmailLog");
const { retryFailedEmail } = require("../utils/sendMail");

// ============================================================
// GET /api/admin/email-logs — paginated, filterable list. Same
// filter-building style as employerController.getAllApplicantsForEmployer.
// Query params (all optional): page, limit, status, type, search (matches
// recipientEmail), dateFrom, dateTo.
// ============================================================
const getEmailLogs = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const { status, type, search, dateFrom, dateTo } = req.query;

  try {
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.recipientEmail = new RegExp(escaped, "i");
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [logs, totalLogs] = await Promise.all([
      EmailLog.find(filter)
        .select("-textBody -htmlBody")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      currentPage: page,
      totalPages: Math.ceil(totalLogs / limit),
      totalLogs,
      perPage: limit,
    });
  } catch (error) {
    console.error("Error fetching email logs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// GET /api/admin/email-logs/:id — full row, including text/html body, for
// a detail Drawer view.
// ============================================================
const getEmailLogById = async (req, res) => {
  try {
    const log = await EmailLog.findById(req.params.id).lean();
    if (!log) return res.status(404).json({ message: "Email log not found" });
    res.json(log);
  } catch (error) {
    console.error("Error fetching email log:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// POST /api/admin/email-logs/:id/retry — superadmin-only (mirrors the
// existing /announcement precedent for high-blast-radius actions). Calls
// the already-built retryFailedEmail from utils/sendMail.js.
// ============================================================
const retryEmailLog = async (req, res) => {
  try {
    const info = await retryFailedEmail(req.params.id);
    res.json({ success: true, info });
  } catch (error) {
    const status = error.code === "EMAIL_LOG_NOT_FOUND" ? 404 : error.code === "EMAIL_NOT_FAILED" ? 409 : 500;
    res.status(status).json({ message: error.message });
  }
};

module.exports = { getEmailLogs, getEmailLogById, retryEmailLog };
