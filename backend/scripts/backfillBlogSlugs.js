// One-off maintenance script: gives every pre-existing Blog document a
// slug, needed because `slug` was added to the schema (sparse+unique)
// after blogs already existed in the database — new blogs get one at
// creation time (blogController.createBlog), this backfills the rest.
//
// Safe to re-run: skips any document that already has a slug.
//
// Usage: node scripts/backfillBlogSlugs.js
require("dotenv").config();
const mongoose = require("mongoose");
const Blog = require("../models/Blog");

const slugify = (text) =>
  (text || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Backfilling blog slugs...");

  const blogs = await Blog.find({ $or: [{ slug: null }, { slug: { $exists: false } }] }).sort({ createdAt: 1 });
  console.log(`${blogs.length} blog(s) missing a slug.`);

  const seen = new Set();
  // Pre-seed with slugs already in use so a backfilled title can't
  // collide with a blog that was created (with a real slug) after this
  // script started but before it reaches an older document.
  (await Blog.distinct("slug", { slug: { $ne: null } })).forEach((s) => seen.add(s));

  let updated = 0;
  for (const blog of blogs) {
    const base = slugify(blog.title);
    let candidate = base;
    let suffix = 2;
    while (seen.has(candidate)) {
      candidate = `${base}-${suffix++}`;
    }
    seen.add(candidate);
    blog.slug = candidate;
    await blog.save();
    updated++;
  }

  console.log(`Done. ${updated} blog(s) updated.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
