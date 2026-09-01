// A `-password`-only blocklist select (still used in a few places before
// this fix) leaks every OTHER sensitive field on the base User schema —
// `otpCode`, `otpExpires`, `failedLoginAttempts`, `lockUntil`,
// `lastLoginIP`, `lastLoginUserAgent` — to whichever client made the
// request, since a blocklist only ever excludes what it explicitly names.
// This is the one shared allowlist-of-exclusions every controller that
// returns a User/Jobseeker/Employer/Recruiter/Mentor document (own profile
// or another user's, e.g. admin moderation) should use instead, so a new
// sensitive field added to User.js in the future is excluded everywhere by
// default rather than leaked everywhere by default.
//
// Note: this is still a blocklist, not the stricter allowlist
// followController.js's PUBLIC_PROFILE_FIELDS uses for truly public-facing
// responses (other users' profiles) — these call sites return a user's OWN
// account data (or an admin's own moderation view of a full account), so a
// blocklist of "never send these specific fields" is the right shape here;
// PUBLIC_PROFILE_FIELDS's allowlist is the right shape there.
const SAFE_USER_FIELDS = "-password -otpCode -otpExpires -lockUntil -failedLoginAttempts -lastLoginIP -lastLoginUserAgent";

module.exports = { SAFE_USER_FIELDS };
