const mongoose = require("mongoose");

// One entry per past saved state of a page. Snapshots are pushed whenever a
// meaningful edit is saved (see cmsController.js's adminUpdatePage) or
// whenever a restore supersedes the current state — restoring never deletes
// history, it just appends the pre-restore state as one more revision.
const revisionSchema = new mongoose.Schema(
  {
    revNumber: { type: Number, required: true },
    title: { type: String, default: "" },
    content: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published", "unpublished"], default: "draft" },
    version: { type: Number, default: 1 },
    effectiveDate: { type: Date },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// The fixed set of Legal & Policies document types the Super Admin CMS
// supports (see backend/controllers/cmsController.js POLICY_TYPES for the
// human-readable labels). Left open-ended enough (plain string, not a hard
// Mongoose enum) that adding a new policy type later only requires updating
// that one JS array — no migration.
const POLICY_TYPE_VALUES = [
  "privacy-policy",
  "terms-conditions",
  "community-guidelines",
  "job-seeker-rules",
  "job-provider-rules",
  "job-posting-guidelines",
  "prohibited-content",
  "refund-cancellation",
  "cookie-policy",
  "disclaimer",
  "code-of-conduct",
  "resume-builder-terms",
  "assessment-policy",
  "interview-policy",
];

const pageSchema = new mongoose.Schema(
  {
    // Stable identifier the frontend fetches by, e.g. "privacy-policy", "terms-of-service".
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" }, // HTML from the rich text editor
    // Fields below support the generic CMS "Pages" module
    // and Legal & Policies module (draft, published, unpublished)
    status: { type: String, enum: ["draft", "published", "unpublished"], default: "draft" },
    featuredImage: { type: String, default: "" },
    // Short one-line summary shown in the Legal & Policies admin table and
    // (optionally) above the content on the public policy page.
    shortDescription: { type: String, default: "", trim: true, maxlength: 300 },
    // Present on Legal & Policies documents
    policyType: { type: String, enum: POLICY_TYPE_VALUES, default: undefined },
    // Current version number. Every saved edit and every restore bumps
    // this by one; `revisions` holds the history that number superseded.
    version: { type: Number, default: 1 },
    effectiveDate: { type: Date },
    revisions: { type: [revisionSchema], default: [] },
    // Who created and updated the page
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

pageSchema.index({ status: 1, createdAt: -1 });
pageSchema.index({ policyType: 1 });
pageSchema.index({ title: "text" });

module.exports = mongoose.model("Page", pageSchema);
module.exports.POLICY_TYPE_VALUES = POLICY_TYPE_VALUES;