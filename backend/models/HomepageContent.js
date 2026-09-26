const mongoose = require("mongoose");

// Admin-editable copy for the two genuinely-hardcoded homepage sections —
// Hero and the closing CTA banner. Deliberately NOT the same shape as
// Page.js (a single opaque HTML blob): Hero/CallToAction render each field
// with its own layout, so this needs distinct typed fields the frontend
// can drop into the existing components — CMS controls the words, not the
// component structure (see PROJECT_AUDIT.md's Homepage CMS scoping note).
//
// Explicitly NOT covering: the "Why Choose Us" feature grid (Stats.tsx) —
// each card's icon + internal route is coupled to its text, so a
// text-only CMS field there would be a half-measure; Featured Jobs/Career
// Tips/Community Highlights — already real, dynamic data from their own
// APIs, nothing to CMS-ify; a numeric "10,000+ jobs" stats strip — doesn't
// exist on the homepage today, and if built later it should be computed
// from real counts, not admin-typed numbers (same "no fake numbers" rule
// applied everywhere else in this app).
//
// Singleton by design — a fixed, well-known _id instead of a generated
// ObjectId, so "the homepage content" is always exactly one document,
// looked up directly by id rather than by a query that could return more
// than one if something went wrong.
const SINGLETON_ID = "homepage";

// One entry per past saved state of the homepage doc — mirrors Page.js's
// revisionSchema (restore-never-deletes-history), adapted to homepage's
// shape. hero/cta/sections are stored as loose snapshots (not re-declared
// as live-validated sub-schemas) since revisions are read-only history,
// never re-saved as-is.
const homepageRevisionSchema = new mongoose.Schema(
  {
    revNumber: { type: Number, required: true },
    version: { type: Number, default: 1 },
    isPublished: { type: Boolean, default: false },
    hero: { type: Object, default: {} },
    cta: { type: Object, default: {} },
    sections: { type: Array, default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const homepageContentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: SINGLETON_ID },
    // While false, the public endpoint returns isPublished:false and the
    // frontend falls back to its existing hardcoded copy — the same
    // "isDraftPlaceholder" idea cmsController.js already uses for legal
    // pages, so a half-finished edit never accidentally goes live.
    isPublished: { type: Boolean, default: false },
    hero: {
      badgeText: { type: String, trim: true, default: "" },
      headline: { type: String, trim: true, default: "" },
      // The gradient-highlighted portion of the headline, e.g. "Quick Jobs"
      // in "Welcome to Quick Jobs" — kept separate so the frontend can
      // keep styling it distinctly without parsing HTML out of a string.
      headlineAccent: { type: String, trim: true, default: "" },
      subheadline: { type: String, trim: true, default: "" },
      primaryCtaText: { type: String, trim: true, default: "" },
      primaryCtaLink: { type: String, trim: true, default: "" },
      secondaryCtaText: { type: String, trim: true, default: "" },
      secondaryCtaLink: { type: String, trim: true, default: "" },
      searchPlaceholder: { type: String, trim: true, default: "" },
      // Order is the display order — reordering is just editing this array.
      popularSearches: [{ type: String, trim: true }],
    },
    cta: {
      badgeText: { type: String, trim: true, default: "" },
      heading: { type: String, trim: true, default: "" },
      headingAccent: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      primaryCtaText: { type: String, trim: true, default: "" },
      primaryCtaLink: { type: String, trim: true, default: "" },
      secondaryCtaText: { type: String, trim: true, default: "" },
      secondaryCtaLink: { type: String, trim: true, default: "" },
    },
    // Homepage section headings (Featured Jobs, Recommended Jobs, Popular
    // Categories, Explore by Field, Trending Jobs, Why Choose QuickJobs,
    // Blog Categories) — each keyed by a fixed `key` the frontend section
    // component matches against, following the same DEFAULTS-merge pattern
    // hero/cta already use.
    sections: [
      {
        key: {
          type: String,
          required: true,
          trim: true,
        },
        badgeText: { type: String, trim: true, default: "" },
        heading: { type: String, trim: true, default: "" },
        highlightedText: { type: String, trim: true, default: "" },
        description: { type: String, trim: true, default: "" },
        buttonText: { type: String, trim: true, default: "" },
        buttonLink: { type: String, trim: true, default: "" },
        isActive: { type: Boolean, default: true },
      },
    ],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Version history — same "restore snapshots current state first, never
    // deletes history" contract as Page.js. See cmsController.js's
    // snapshotHomepageRevision/getHomepageRevisions/restoreHomepageRevision.
    version: { type: Number, default: 1 },
    revisions: { type: [homepageRevisionSchema], default: [] },
  },
  { timestamps: true }
);

homepageContentSchema.statics.SINGLETON_ID = SINGLETON_ID;

module.exports = mongoose.model("HomepageContent", homepageContentSchema);
