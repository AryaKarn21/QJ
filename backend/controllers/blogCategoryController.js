const BlogCategory = require("../models/BlogCategory");
const Blog = require("../models/Blog");
const { persistUpload, deleteStoredFile } = require("../services/media.service");
const { isSafeHttpUrl } = require("../utils/urlValidation");

// Same file-or-URL resolution as jobCategoryController.js's
// resolveIconInput — an uploaded file wins if both are somehow present.
async function resolveIconInput(req, folder, ownerId) {
  if (req.file) {
    return persistUpload(req.file, folder, ownerId);
  }
  if (typeof req.body.icon === "string" && req.body.icon.trim()) {
    const url = req.body.icon.trim();
    if (!isSafeHttpUrl(url)) {
      const err = new Error("Please enter a valid http:// or https:// image URL.");
      err.code = "INVALID_IMAGE_URL";
      throw err;
    }
    return url;
  }
  return undefined;
}

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

exports.adminListBlogCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find().sort({ name: 1 }).lean();

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

exports.adminCreateBlogCategory = async (req, res) => {
  const { name, description, isActive } = req.body;
  const trimmedName = (name || "").trim();
  if (!trimmedName) {
    return res.status(400).json({ message: "Category name is required" });
  }

  let icon = "";
  try {
    icon = (await resolveIconInput(req, "blog_category_icons", req.user.id)) || "";
  } catch (uploadError) {
    console.error("[blogCategoryController.adminCreateBlogCategory] icon resolution failed:", uploadError);
    if (uploadError.code === "CLOUD_STORAGE_NOT_CONFIGURED") {
      return res.status(503).json({ message: uploadError.message });
    }
    return res.status(400).json({ message: uploadError.message || "Failed to upload icon. Please try a different image." });
  }

  try {
    const existing = await BlogCategory.findOne({ name: trimmedName }).collation({ locale: "en", strength: 2 });
    if (existing) {
      return res.status(409).json({ message: `A category named "${existing.name}" already exists` });
    }

    const category = await BlogCategory.create({
      name: trimmedName,
      slug: await generateUniqueSlug(trimmedName),
      description: (description || "").trim(),
      icon,
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

      if (trimmedName !== category.name) {
        category.slug = await generateUniqueSlug(trimmedName, category._id);
      }
      category.name = trimmedName;
    }
    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined) category.isActive = isActive === "true" || isActive === true;

    if (req.file || (typeof req.body.icon === "string" && req.body.icon.trim())) {
      const previousIcon = category.icon;
      try {
        const resolved = await resolveIconInput(req, "blog_category_icons", req.user.id);
        if (resolved !== undefined) category.icon = resolved;
      } catch (uploadError) {
        console.error("[blogCategoryController.adminUpdateBlogCategory] icon resolution failed:", uploadError);
        if (uploadError.code === "CLOUD_STORAGE_NOT_CONFIGURED") {
          return res.status(503).json({ message: uploadError.message });
        }
        return res.status(400).json({ message: uploadError.message || "Failed to upload icon. Please try a different image." });
      }
      if (previousIcon) deleteStoredFile(previousIcon);
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

exports.adminDeleteBlogCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    if (category.icon) deleteStoredFile(category.icon);
    res.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting blog category:", error);
    res.status(500).json({ message: "Failed to delete category" });
  }
};

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