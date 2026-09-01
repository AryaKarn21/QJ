const mongoose = require("mongoose");

const options = { discriminatorKey: "role", timestamps: true };

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  googleId: { type: String, sparse: true },
  role: {
    type: String,
    // "recruiter" and "mentor" added for the Community Feed module — a
    // recruiter posts on behalf of an employer/company, a mentor shares
    // career guidance content. Both are otherwise-ordinary users; nothing
    // about existing jobseeker/employer/admin/superadmin logic changes.
    enum: ["jobseeker", "employer", "recruiter", "mentor", "admin", "superadmin"],
    default: "jobseeker",
  },
  // Generic avatar/headline fields so the Community module has a single
  // place to read a display picture and short bio-line for ANY role
  // (jobseeker/recruiter/mentor use profilePic on their own discriminator
  // schemas already; this pair lives on the base schema for roles that
  // don't otherwise have one — e.g. admin — and as a fallback).
  headline: { type: String, trim: true, maxlength: 160 },
  // Longer free-text bio for the Community profile page — kept separate
  // from `headline` (short one-liner shown on cards) since the two serve
  // different layout slots (card subtitle vs. full profile "About").
  bio: { type: String, trim: true, maxlength: 600, default: "" },
  socialLinks: {
    linkedin: { type: String, trim: true, default: "" },
    twitter: { type: String, trim: true, default: "" },
    github: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
  },
  isVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  otpCode: { type: String },
  otpExpires: { type: Date },
  authMethod: {
    type: String,
    enum: ["email", "google", "both"],
    default: "email"
  },
  lastLogin: { type: Date },
  lastLoginIP: { type: String },
  lastLoginUserAgent: { type: String },
  // Notification preferences — surfaced on the Settings page. Kept generic
  // (not employer-only) so any role can read/update its own copy.
  notificationPreferences: {
    allNotifications: { type: Boolean, default: true },
    newApplications: { type: Boolean, default: true },
  },
  // Soft account deactivation ("Danger Zone" on Settings). We never
  // hard-delete on this action — isActive:false + deactivatedAt is enough
  // to lock the account out everywhere (login + existing tokens) while
  // preserving data for support/audit/reactivation.
  isActive: { type: Boolean, default: true },
  deactivatedAt: { type: Date },
  // Denormalized Follow counters (Community module). Kept in sync inside
  // followController.toggleFollow (atomically, in the same transaction as
  // the Follow document write) so profile headers can read a follower/
  // following count in O(1) instead of running a `Follow.countDocuments`
  // collection scan on every profile view — the query pattern that
  // actually needs to scale as the network grows. Never trust these as
  // the sole source of truth for reconciliation; `Follow` documents are
  // canonical. Run scripts/backfillFollowCounts.js after restoring a
  // backup or if drift is ever suspected.
  followersCount: { type: Number, default: 0, min: 0 },
  followingCount: { type: Number, default: 0, min: 0 },
  // Account lockout after repeated failed login attempts
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date }
}, options);

// True while the account is currently locked out
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Add method to find or create user from Google profile
userSchema.statics.findOrCreate = async function (profile) {
  let user = await this.findOne({ googleId: profile.id });

  if (!user) {
    // Check if user with this email already exists
    user = await this.findOne({ email: profile.emails[0].value });

    if (!user) {
      // Create new user
      user = new this({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        emailVerified: true,
        isVerified: false,
        authMethod: 'google'
      });
      await user.save();
    } else if (user.authMethod === 'email') {
      // Link Google account to existing email user
      user.googleId = profile.id;
      user.authMethod = 'both';
      user.emailVerified = true;
      user.isVerified = false;
      await user.save();
    }
  }

  return user;
};

const User = mongoose.model("User", userSchema);
module.exports = User;