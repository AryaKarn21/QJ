// Single source of truth for "which origins do we trust" — shared by the
// Express CORS middleware (server.js) and the Socket.IO server (utils/socket.js).
// Before this existed, socket.js kept its own hardcoded copy that never
// looked at CORS_ALLOWED_ORIGINS or the Vercel-preview pattern, so a domain
// added to one config silently wasn't trusted by the other: REST calls from
// a fresh Vercel preview deploy would work while its WebSocket connection
// got rejected by CORS with no clear error, or vice versa.
//
//   CORS_ALLOWED_ORIGINS=https://example.com,https://www.example.com
//
// FRONTEND_URL is still honored on its own for backward compatibility (it's
// also used elsewhere for redirect URLs). Bare localhost dev origins only
// apply outside production, so a prod deploy that forgets to set
// CORS_ALLOWED_ORIGINS doesn't silently end up trusting localhost.
const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const devOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"];

const allowedOrigins = [...configuredOrigins, process.env.FRONTEND_URL, ...devOrigins].filter(Boolean);

// Vercel mints a brand-new, unique URL for every single deployment
// (`qj-<hash>-aryakarn21s-projects.vercel.app`) in addition to the stable
// production alias (already covered by the exact allowlist above). This
// trusts the whole family of this project's Vercel URLs by pattern instead
// of one fixed string, scoped to this exact project+team so it can't be
// used to front unrelated origins.
const vercelPreviewPattern = /^https:\/\/qj(-[a-z0-9]+)*-aryakarn21s-projects\.vercel\.app$/i;

function isOriginAllowed(origin) {
  // No Origin header (server-to-server requests, curl, some native/webview
  // contexts) — allow, matching the previous behavior of both call sites.
  if (!origin) return true;
  return allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin);
}

module.exports = { allowedOrigins, vercelPreviewPattern, isOriginAllowed };
