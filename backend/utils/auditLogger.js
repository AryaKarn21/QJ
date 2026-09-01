const AuditLog = require("../models/AuditLog");

// Only mutating requests are worth an audit trail entry — GETs (and HEAD/
// OPTIONS) don't change any state, so logging them would just be noise.
const AUDITED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Path prefixes that are either handled with a hand-written recordAudit()
// call elsewhere (auth) or are too high-volume / low-signal to be worth a
// row per request (routine telemetry, chat message bodies). Matched
// against req.originalUrl's path (query string stripped).
const EXCLUDED_PATH_PREFIXES = [
  "/api/users/login", // handled explicitly in userController.loginUser
  "/api/users/register", // handled explicitly in userController.registerUser
  "/api/ai-usage/log-resume-build", // high-volume usage telemetry, not a security/audit event
];

// Request body keys that should never be persisted verbatim.
const REDACT_KEYS = new Set([
  "password",
  "newPassword",
  "oldPassword",
  "currentPassword",
  "confirmPassword",
  "token",
  "otp",
  "otpCode",
]);

const MAX_STRING_LENGTH = 500;

// Deep-ish sanitize: redact sensitive keys, truncate long strings (resume
// text, blog bodies, etc.) so a single request can't bloat the collection.
function sanitize(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 3) return "[truncated]";

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  }

  if (typeof value === "object") {
    // Buffers / file-like objects (shouldn't normally land in req.body,
    // but be defensive) — don't try to serialize raw bytes.
    if (Buffer.isBuffer(value)) return "[binary]";

    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = REDACT_KEYS.has(key) ? "[redacted]" : sanitize(val, depth + 1);
    }
    return out;
  }

  return value;
}

// Best-effort module name from the URL, e.g. "/api/admin/users/:id" -> "admin".
function moduleFromPath(originalUrl) {
  const segments = originalUrl.split("?")[0].split("/").filter(Boolean);
  // segments[0] === "api"
  return segments[1] || "unknown";
}

/**
 * Express middleware, mounted once at the app level (see server.js), that
 * transparently records every mutating request as an AuditLog entry.
 *
 * It hooks res.on('finish') rather than wrapping res.json/send, so it runs
 * strictly after the route has fully handled the request — by then
 * req.user (set by authenticate), req.route (set once Express matches the
 * route), and req.params/req.body are all populated, and the write can
 * never delay or otherwise affect the response already sent to the client.
 */
const auditTrail = () => (req, res, next) => {
  if (!AUDITED_METHODS.has(req.method)) return next();

  const cleanPath = req.originalUrl.split("?")[0];
  if (EXCLUDED_PATH_PREFIXES.some((prefix) => cleanPath.startsWith(prefix))) {
    return next();
  }

  const startedAt = Date.now();

  res.on("finish", () => {
    // Fire-and-forget — a logging failure must never surface to the user
    // or affect the already-completed response.
    try {
      const routePath = req.route?.path;
      const action = routePath
        ? `${req.method} ${req.baseUrl}${routePath}`
        : `${req.method} ${cleanPath}`;

      AuditLog.create({
        actor: req.user
          ? {
              id: req.user._id,
              name: req.user.name,
              email: req.user.email,
              role: req.user.role,
            }
          : undefined,
        module: moduleFromPath(req.originalUrl),
        action,
        method: req.method,
        path: cleanPath,
        params: sanitize(req.params),
        body: sanitize(req.body),
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        durationMs: Date.now() - startedAt,
      }).catch((err) => console.error("Audit log write failed:", err.message));
    } catch (err) {
      console.error("Audit log capture failed:", err.message);
    }
  });

  next();
};

/**
 * Explicit audit entry for events that either happen outside an
 * authenticated request (e.g. a failed login has no req.user) or deserve
 * more meaningful detail than "METHOD /path" — pass whatever is known.
 * Never throws: a failed audit write should never break the caller.
 */
const recordAudit = async ({
  req,
  actor,
  module: moduleName,
  action,
  targetType,
  targetId,
  targetLabel,
  metadata,
  success = true,
  statusCode,
}) => {
  try {
    await AuditLog.create({
      actor,
      module: moduleName,
      action,
      targetType,
      targetId,
      targetLabel,
      method: req?.method,
      path: req?.originalUrl?.split("?")[0],
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
      statusCode,
      success,
      metadata: sanitize(metadata),
    });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
};

module.exports = { auditTrail, recordAudit };