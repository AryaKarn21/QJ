const mongoose = require('mongoose');

const jobCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Still required for admin-created (system) categories — enforced in
    // createJobCategory's controller logic, not here — but relaxed at the
    // schema level so employer-created categories (icon is optional per
    // spec) can validate without one.
    icon: {
      type: String,
      default: "",
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // Lets an employer deactivate a category they created (e.g. no longer
    // hiring for that role) without deleting it outright — deleting is
    // still blocked separately when jobs reference it. System categories
    // stay 'active' unless an admin explicitly changes this.
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    // Distinguishes admin-seeded categories from employer-created ones
    // WITHOUT a second collection — the public list (getJobCategories)
    // merges both scopes into one dropdown so a job posting form never has
    // to fetch/merge two separate sources.
    scope: {
      type: String,
      enum: ["system", "employer"],
      default: "system",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Case-insensitive uniqueness ("Software" and "software" are the same
// category) so the admin can't accidentally create near-duplicate
// categories that fragment job listings.
jobCategorySchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('JobCategory', jobCategorySchema);