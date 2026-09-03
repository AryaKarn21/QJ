const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const dotenv = require("dotenv");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const connectDB = require("./config/db");
const http = require("http");
const { initSocket } = require("./utils/socket");
const { auditTrail } = require("./utils/auditLogger");
const sanitizeInput = require("./middleware/sanitizeInput");

dotenv.config();

const requiredEnvVars = ["JWT_SECRET", "SESSION_SECRET", "MONGO_URI"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missingEnvVars.join(", ")}. ` +
      `Check your .env file. Refusing to start.`
  );
  process.exit(1);
}

connectDB();
require("./config/passport");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Trusted origins, environment-driven rather than hardcoded so the same
// build can run against local/UAT/production without a code change:
//   CORS_ALLOWED_ORIGINS=https://example.com,https://www.example.com
// FRONTEND_URL is still honored on its own for backward compatibility
// (it's also used elsewhere for redirect URLs). The bare localhost dev
// origins only apply outside production, so a prod deploy that forgets to
// set CORS_ALLOWED_ORIGINS doesn't silently end up trusting localhost.
const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const devOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"];

const allowedOrigins = [
  ...configuredOrigins,
  process.env.FRONTEND_URL,
  ...devOrigins,
].filter(Boolean);

// Vercel mints a brand-new, unique URL for every single deployment
// (`qj-<hash>-aryakarn21s-projects.vercel.app`) in addition to the stable
// production alias (e.g. qj-sigma.vercel.app, already covered by the exact
// allowlist above). Without this, every fresh deploy's own preview URL
// gets CORS-rejected until someone thinks to add it — this trusts the
// whole family of this project's Vercel URLs by pattern instead of one
// fixed string, scoped to this exact project+team so it can't be used to
// front unrelated origins.
const vercelPreviewPattern = /^https:\/\/qj(-[a-z0-9]+)*-aryakarn21s-projects\.vercel\.app$/i;

console.log("CORS: allowing requests from", allowedOrigins.join(", "), "+ Vercel preview deployments matching", vercelPreviewPattern);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
        callback(null, true);
      } else {
        console.warn(
          `CORS: rejected request from origin "${origin}" (not in allowedOrigins)`
        );
        callback(null, false);
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.set("trust proxy", 1);

// Request logging: concise per-request lines in dev, the standard
// Apache-style "combined" format (includes remote addr, referrer, UA) in
// production, where a reverse proxy/log aggregator typically consumes it.
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // express-session's default MemoryStore is explicitly documented as
    // "not designed for a production environment" — it leaks memory
    // (every session sits in the Node process forever) and can't be
    // shared across more than one server instance, which breaks
    // passport's OAuth session handshake as soon as you run behind a
    // load balancer with more than one process/replica. Persisting to
    // the same MongoDB the rest of the app already uses avoids standing
    // up a separate session store (e.g. Redis) just for this.
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 24 * 60 * 60, // seconds; kept in sync with cookie.maxAge below
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(sanitizeInput);
app.use(auditTrail());

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/jobseeker", require("./routes/jobseekerRoutes"));
app.use("/api/employer", require("./routes/employerRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/jobcategories", require("./routes/jobCategoryRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api/advertisements", require("./routes/advertisementRoutes"));
app.use("/api/testimonials", require("./routes/testimonialRoutes"));
app.use("/api/resumes", require("./routes/resumeRoutes"));
app.use("/api/resumes/ai", require("./routes/resumeAiRoutes"));
app.use("/api/community/posts", require("./routes/postRoutes"));
app.use("/api/community/comments", require("./routes/commentRoutes"));
app.use("/api/community/follow", require("./routes/followRoutes"));
app.use("/api/community/connections", require("./routes/connectionRoutes"));
app.use("/api/community/messages", require("./routes/messageRoutes"));
app.use("/api/notification", require("./routes/notificationRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/blogs", require("./routes/blogRoutes"));
app.use("/api/blog-categories", require("./routes/blogCategoryRoutes"));
app.use("/api/cms", require("./routes/cmsRoutes"));
app.use("/api/ai-usage", require("./routes/aiUsageRoutes"));
app.use("/api/revenue", require("./routes/revenueRoutes"));
app.use("/api/community/ai", require("./routes/communityAiRoutes"));
app.use("/api/insights", require("./routes/insightRoutes"));
app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));
app.use("/api/chatbot", require("./routes/chatbotRoutes"));

// Company employee management — nested under /api/companies/:companyId/employees
app.use("/api/companies/:companyId/employees", require("./routes/companyMemberRoutes"));

// Public: get all companies a specific user belongs to
// GET /api/users/:userId/companies
const { getUserCompanies } = require("./controllers/companyMemberController");
app.get("/api/users/:userId/companies", getUserCompanies);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Unmatched API route — without this, an unknown path falls through to
// Express's default HTML 404 page, which is both an inconsistent
// response shape for an API and (in older Express error pages) a minor
// information leak. Placed after every route mount, before the error
// handler.
app.use("/api", (req, res) => {
  res.status(404).json({ message: "Not found." });
});

// Final safety net — catches anything a route handler forgot to try/catch,
// or that Express itself raised (e.g. a malformed JSON body). Logs the
// full error server-side for debugging, but only ever sends a generic
// message to the client: a stack trace in a production HTTP response can
// hand an attacker file paths, package versions, and query fragments.
app.use((err, req, res, next) => {
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: status === 500 ? "Something went wrong. Please try again." : err.message,
  });
});

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Surface otherwise-silent crashes (and let container orchestrators like
// Docker/PM2 restart the process) instead of leaving Node in a corrupted
// state after an unawaited rejected promise slips through a controller.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});