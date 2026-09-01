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
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

homepageContentSchema.statics.SINGLETON_ID = SINGLETON_ID;

module.exports = mongoose.model("HomepageContent", homepageContentSchema);
