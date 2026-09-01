const mongoose = require("mongoose");

// A general-purpose audit trail. Two things write to this collection:
//
//  1. utils/auditLogger.js's `auditTrail` middleware — mounted once on
//     the app in server.js, it automatically records every state-changing
//     (POST/PUT/PATCH/DELETE) request across the whole API.
//  2. utils/auditLogger.js's `recordAudit` helper — called explicitly from
//     a handful of security-sensitive spots (login success/failure,
//     account lockout) that need richer, hand-written detail than the
//     generic "method + path" entry the middleware produces.
//
// Kept schemaless-ish (Mixed fields) on purpose: the whole point of an
// audit log is to tolerate whatever shape each endpoint's request/response
// happens to have, without needing a migration every time a new admin
// action is added.
const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action. Absent for unauthenticated requests
    // (e.g. a failed login, a public ticket submission).
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      email: String,
      role: String,
    },

    // Coarse grouping used for filtering, e.g. "admin", "auth", "employer",
    // "community". Derived from the request's URL prefix.
    module: { type: String, index: true },

    // Human-readable action identifier. Either an explicit dotted name
    // ("auth.login_failed") from recordAudit, or an auto-generated
    // "METHOD /path/pattern" from the auditTrail middleware.
    action: { type: String, required: true, index: true },

    // What was acted on, when known.
    targetType: { type: String },
    targetId: { type: mongoose.Schema.Types.Mixed },
    targetLabel: { type: String },

    // Raw request context — enough to reconstruct what happened without
    // needing to cross-reference server logs.
    method: String,
    path: String,
    params: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,

    // Outcome.
    statusCode: Number,
    success: { type: Boolean, default: true, index: true },

    // Request fingerprint.
    ip: String,
    userAgent: String,
    durationMs: Number,
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);