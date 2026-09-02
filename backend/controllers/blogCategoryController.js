const fs = require("fs");
const path = require("path");
const BlogCategory = require("../models/BlogCategory");
const Blog = require("../models/Blog");

// Same "delete a previously stored upload file" pattern used by
// jobCategoryController.js/advertisementController.js.
const deleteFile = (storedPath) => {
  if (!storedPath) return;
  const filePath = path.join(__dirname, "..", storedPath);
  fs.unlink(filePath, (err) => {
    if (err) console.error(`Failed to delete file: ${filePath}`, err.message);
  });
};

// Turns a name into a URL-safe slug — same shape as blogController.js's
// own slugify (kept separate rather than shared; every controller in this
// codebase that needs one has its own small copy, see cmsController.js).
const slugify = (text) =>
  (text || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "category";

const generateUniqueSlug = async (name, excludeId) => {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (
    await BlogCategory.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
  ) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
};

// ── Admin: list/create/update/delete/toggle ────────────────────────────────

/** GET /api/blog-categories/admin — admin only. */
exports.adminListBlogCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find().sort({ name: 1 }).lean();

    // Real per-category blog counts, computed in one aggregation rather
    // than N queries — never a fabricated/estimated number.
    const counts = await Blog.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id, c.count]));

    res.json(categories.map((c) => ({ ...c, blogCount: countMap.get(c.name) || 0 })));
  } catch (error) {
    console.error("Error listing blog categories:", error);
    res.status(500).json({ message: "Failed to load categories" });
  }
};

/** POST /api/blog-categories/admin — admin only. */
exports.adminCreateBlogCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const trimmedName = (name || "").trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existing = await BlogCategory.findOne({ name: trimmedName }).collation({ locale: "en", strength: 2 });
    if (existing) {
      return res.status(409).json({ message: `A category named "${existing.name}" already exists` });
    }

    const category = await BlogCategory.create({
      name: trimmedName,
      slug: await generateUniqueSlug(trimmedName),
      description: (description || "").trim(),
      icon: req.file ? `/uploads/icons/${req.file.filename}` : "",
      isActive: isActive === undefined ? true : isActive === "true" || isActive === true,
      createdBy: req.user.id,
    });

    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A category with this name already exists" });
    }
    console.error("Error creating blog category:", error);
    res.status(500).json({ message: "Failed to create category" });
  }
};

/** PUT /api/blog-categories/admin/:id — admin only. */
exports.adminUpdateBlogCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const { name, description, isActive } = req.body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) return res.status(400).json({ message: "Category name cannot be empty" });

      const existing = await BlogCategory.findOne({ name: trimmedName }).collation({ locale: "en", strength: 2 });
      if (existing && String(existing._id) !== req.params.id) {
        return res.status(409).json({ message: `A category named "${existing.name}" already exists` });
      }

      // Renaming does NOT retag existing blogs (Blog.category is a plain
      // string snapshot, same as every other free-text field in this
      // app) — the slug is regenerated so /blog/category/:slug keeps
      // matching the new name, but old blogs keep their original
      // category text until someone re-saves them with the new name.
      if (trimmedName !== category.name) {
        category.slug = await generateUniqueSlug(trimmedName, category._id);
      }
      category.name = trimmedName;
    }
    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined) category.isActive = isActive === "true" || isActive === true;

    if (req.file) {
      if (category.icon) deleteFile(category.icon);
      category.icon = `/uploads/icons/${req.file.filename}`;
    }

    await category.save();
    res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A category with this name already exists" });
    }
    console.error("Error updating blog category:", error);
    res.status(500).json({ message: "Failed to update category" });
  }
};

/** DELETE /api/blog-categories/admin/:id — admin only. */
exports.adminDeleteBlogCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    if (category.icon) deleteFile(category.icon);
    // Blogs already tagged with this category name keep that text — same
    // "orphaned label, not a broken reference" behavior JobCategory
    // deletion already has for jobs (see jobCategoryController.js).
    res.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting blog category:", error);
    res.status(500).json({ message: "Failed to delete category" });
  }
};

// ── Public ───────────────────────────────────────────────────────────────

/**
 * GET /api/blog-categories/active — public. Only ever returns active
 * categories, each with a REAL published-blog count (never shown as
 * available to browse if it would just be an empty page) — used by the
 * homepage/blog page's "Explore Categories" section.
 */
exports.getActiveBlogCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find({ isActive: true }).sort({ name: 1 }).lean();

    const counts = await Blog.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id, c.count]));

    res.json(
      categories.map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        blogCount: countMap.get(c.name) || 0,
      }))
    );
  } catch (error) {
    console.error("Error fetching active blog categories:", error);
    res.status(500).json({ message: "Failed to load categories" });
  }
};

/**
 * GET /api/blog-categories/slug/:slug — public. Looks up one active
 * category by its slug for the /blog/category/:slug page's header (title
 * + description) — the blog list itself is fetched separately via the
 * existing GET /api/blogs?category=<name>, no new blog endpoint needed.
 */
exports.getBlogCategoryBySlug = async (req, res) => {
  try {
    const category = await BlogCategory.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    console.error("Error fetching blog category by slug:", error);
    res.status(500).json({ message: "Failed to load category" });
  }
};
