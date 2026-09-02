const mongoose = require("mongoose");

// Real, admin-managed blog taxonomy (section 4/5) — Blog.category stays
// exactly the free-text field it always was (Blog.js's own comment
// explains why: no second admin-managed taxonomy alongside JobCategory).
// This model doesn't change that; it's the admin-manageable SOURCE for
// picking that string (BlogCreate/BlogEdit's category field becomes a
// dropdown of these names instead of freehand text), and the icon/
// description/active-state a plain string could never carry. A blog's
// `category` continues to just be this category's `name` at the time it
// was picked — no new ref field on Blog, no migration, fully backward
// compatible with every blog that predates this.
const blogCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // URL-safe identifier for /blog/category/:slug.
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, trim: true, default: "" },
    // Root-relative stored path, e.g. "/uploads/icons/uuid.png" — same
    // convention and even the same upload folder as JobCategory.icon.
    icon: { type: String, default: "" },
    // Only active categories are ever shown on the homepage/blog "Explore
    // Categories" section or offered as a choice when creating a blog —
    // same convention as Advertisement.isActive/Testimonial.isActive.
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Case-insensitive uniqueness ("Technology" and "technology" are the same
// category) — same pattern as JobCategory.js.
blogCategorySchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("BlogCategory", blogCategorySchema);
