const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { recordAudit } = require("../utils/auditLogger");

// Everything here reads/acts on data that already exists elsewhere in the
// app (User.failedLoginAttempts / lockUntil / isActive, and the
// "auth.login_failed" / "auth.login_blocked_locked" audit events already
// written by userController.loginUser) — this is a superadmin-facing view
// over real signals, not a placeholder.

// Summary counters for the KPI row at the top of the Security page.
const getSecurityOverview = async (req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [lockedAccounts, deactivatedAccounts, adminCount, failedLogins24h] = await Promise.all([
      User.countDocuments({ lockUntil: { $gt: new Date() } }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ role: { $in: ["admin", "superadmin"] } }),
      AuditLog.countDocuments({
        module: "auth",
        success: false,
        createdAt: { $gte: since24h },
      }),
    ]);

    res.json({ lockedAccounts, deactivatedAccounts, adminCount, failedLogins24h });
  } catch (error) {
    console.error("Error fetching security overview:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Accounts currently locked out from repeated failed login attempts.
const getLockedAccounts = async (req, res) => {
  try {
    const users = await User.find({ lockUntil: { $gt: new Date() } })
      .select("name email role failedLoginAttempts lockUntil lastLoginIP")
      .sort({ lockUntil: -1 })
      .limit(200);

    res.json({ accounts: users });
  } catch (error) {
    console.error("Error fetching locked accounts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Clears an account's lockout early. Kept separate from the general
// UserManagement "reactivate" action — this only resets the failed-login
// counter/lock timestamp, it never touches isActive (a deactivated account
// stays deactivated; an admin has to use User Management for that).
const unlockAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name email role lockUntil failedLoginAttempts");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.lockUntil || user.lockUntil <= new Date()) {
      return res.status(400).json({ message: "This account is not currently locked" });
    }

    user.lockUntil = undefined;
    user.failedLoginAttempts = 0;
    await user.save();

    await recordAudit({
      req,
      actor: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role },
      module: "security",
      action: "security.account_unlocked",
      targetType: "User",
      targetId: user._id,
      targetLabel: user.email,
      success: true,
      statusCode: 200,
    });

    res.json({ message: "Account unlocked successfully" });
  } catch (error) {
    console.error("Error unlocking account:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Recent failed-login events, straight from the audit trail — lets a
// superadmin spot a brute-force attempt (many failures, one IP/email)
// without digging through the full Audit Logs page.
const getRecentFailedLogins = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
    const events = await AuditLog.find({ module: "auth", success: false })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ events });
  } catch (error) {
    console.error("Error fetching recent failed logins:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getSecurityOverview,
  getLockedAccounts,
  unlockAccount,
  getRecentFailedLogins,
};