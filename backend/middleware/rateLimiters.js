const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = rateLimit;

// Shared by the follow-system limiters below: key by authenticated user
// when we have one (a logged-in user's own quota, regardless of which
// network/proxy IP they're behind), falling back to a normalized IP for
// anonymous requests. Using `ipKeyGenerator` (rather than raw `req.ip`)
// keeps this correct for IPv6 clients, where a bare `req.ip` key would
// let one user cycle through addresses within the same /56 to dodge the
// limit.
const userOrIpKey = (req) => (req.user ? `u:${req.user._id}` : ipKeyGenerator(req.ip));

// Applies to login attempts. Generous enough for real users who mistype
// a password a couple of times, tight enough to stop brute-force guessing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP generation (forgot-password, resend-otp) — limited to prevent
// email-bombing a target and to slow automated abuse.
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many requests. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verification (verify-otp, reset-password) — a 6-digit OTP only has
// 1,000,000 combinations, so this must be tight to prevent brute-forcing it.
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Follow/unfollow toggling — generous enough for someone quickly building
// out their network, tight enough to blunt a scripted follow/unfollow
// loop, which would otherwise hammer the DB with transactional writes and
// spam "new follower" notifications at the target on every toggle.
const followActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "You're following/unfollowing too quickly. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
});

// Follower/following search, "who to follow" suggestions, and mention
// search — cheap individually but easy to script into a full-directory
// scrape without a limiter.
const followReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
});

// In-app help chatbot — publicly accessible (no login required, so a
// visitor deciding whether to sign up can still get help), which means it
// can't rely on per-user quotas alone. Each call may hit the Gemini API,
// so this is deliberately tighter than the read-only followReadLimiter.
const chatbotLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { message: "You're sending messages too quickly. Please wait a moment and try again." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
});

module.exports = {
  loginLimiter,
  chatbotLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  followActionLimiter,
  followReadLimiter,
};