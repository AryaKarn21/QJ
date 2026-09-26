const mongoose = require("mongoose");

// Flat key/value sitewide microcopy — footer headings/descriptions, CTA
// text, empty-state messages, About/Community/Resume-Builder page
// headings, contact info, etc. Deliberately simpler than Page.js: these
// are short single strings (labels, one-line descriptions), not long-form
// rich-text content, so no HTML sanitization and no revision history —
// re-typing a short string is an adequate "undo" here, unlike Pages'/
// Homepage's irreplaceable long-form content.
//
// `key` follows a dotted convention matching the spec's own examples,
// e.g. "footer.about.description", "resume.gallery.heading",
// "resume.sections.experience.label".
const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, default: "", trim: true },
    // Grouping label for the admin table (e.g. "Footer", "Resume Builder") —
    // purely organizational, not read by any public-facing code.
    section: { type: String, trim: true, default: "" },
    // Admin-facing hint: what this key controls / where it renders.
    description: { type: String, trim: true, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

siteContentSchema.index({ section: 1 });

module.exports = mongoose.model("SiteContent", siteContentSchema);
