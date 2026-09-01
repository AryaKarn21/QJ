const Blog = require("../models/Blog");
const Faq = require("../models/Faq");
const CareerTip = require("../models/CareerTip");
const Page = require("../models/Page");
const HomepageContent = require("../models/HomepageContent");
const { sanitizeRichText } = require("../utils/sanitizeHtml");

// Same "escape regex special chars before using in a RegExp" helper other
// search-by-title endpoints in this codebase use (e.g.
// followController.js's escapeRegex) — kept local since cmsController.js
// doesn't otherwise import from followController.js.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------------------------
// Blogs — admin moderation (bypasses the author-only checks in
// blogController.js, which are correct for regular users but too strict
// for an admin who needs to moderate anyone's post).
// ---------------------------------------------------------------------------

/** GET /api/cms/blogs — every blog, published or not, for moderation. */
exports.adminGetAllBlogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const search = (req.query.search || "").trim();

    const filter = search ? { title: new RegExp(search, "i") } : {};

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate("author", "name email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Blog.countDocuments(filter),
    ]);

    res.json({ blogs, total, page, totalPages: Math.max(Math.ceil(total / limit), 1) });
  } catch (error) {
    console.error("Error fetching blogs for moderation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** PATCH /api/cms/blogs/:id/publish — admin can publish/unpublish ANY blog. */
exports.adminTogglePublishBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.isPublished = !blog.isPublished;
    await blog.save();

    res.json({ message: "Blog visibility updated", isPublished: blog.isPublished });
  } catch (error) {
    console.error("Error toggling blog publish state:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** DELETE /api/cms/blogs/:id — admin can delete ANY blog (moderation). */
exports.adminDeleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    res.json({ message: "Blog deleted" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

/** GET /api/cms/faqs — public, only active ones, ordered. */
exports.getFaqs = async (req, res) => {
  try {
    const filter = req.query.all === "true" ? {} : { isActive: true };
    const faqs = await Faq.find(filter).sort({ order: 1, createdAt: 1 });
    res.json(faqs);
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createFaq = async (req, res) => {
  try {
    const faq = await Faq.create(req.body);
    res.status(201).json(faq);
  } catch (error) {
    console.error("Error creating FAQ:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!faq) return res.status(404).json({ message: "FAQ not found" });
    res.json(faq);
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    const faq = await Faq.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ message: "FAQ not found" });
    res.json({ message: "FAQ deleted" });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// Career Tips
// ---------------------------------------------------------------------------

exports.getCareerTips = async (req, res) => {
  try {
    const filter = req.query.all === "true" ? {} : { isActive: true };
    const tips = await CareerTip.find(filter).sort({ order: 1, createdAt: -1 });
    res.json(tips);
  } catch (error) {
    console.error("Error fetching career tips:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** GET /api/cms/career-tips/:id — public detail page. Same visibility rule as the list (isActive only). */
exports.getCareerTipById = async (req, res) => {
  try {
    const tip = await CareerTip.findOne({ _id: req.params.id, isActive: true });
    if (!tip) return res.status(404).json({ message: "Career tip not found" });
    res.json(tip);
  } catch (error) {
    console.error("Error fetching career tip:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createCareerTip = async (req, res) => {
  try {
    // Career tip content is authored via the same ReactQuill editor as the
    // generic CMS Pages module (now including embedded images), so it
    // needs the same HTML sanitization pass — this previously wrote
    // req.body.content straight to the DB unsanitized.
    const payload = { ...req.body, createdBy: req.user?.id };
    if (payload.content !== undefined) payload.content = sanitizeRichText(payload.content);
    const tip = await CareerTip.create(payload);
    res.status(201).json(tip);
  } catch (error) {
    console.error("Error creating career tip:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateCareerTip = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.content !== undefined) payload.content = sanitizeRichText(payload.content);
    const tip = await CareerTip.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!tip) return res.status(404).json({ message: "Career tip not found" });
    res.json(tip);
  } catch (error) {
    console.error("Error updating career tip:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteCareerTip = async (req, res) => {
  try {
    const tip = await CareerTip.findByIdAndDelete(req.params.id);
    if (!tip) return res.status(404).json({ message: "Career tip not found" });
    res.json({ message: "Career tip deleted" });
  } catch (error) {
    console.error("Error deleting career tip:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// Legal / static Pages (Privacy Policy, Terms of Service)
// ---------------------------------------------------------------------------

const ALLOWED_PAGE_SLUGS = ["privacy-policy", "terms-of-service", "community-guidelines"];

/** GET /api/cms/pages/:slug — public. Returns an empty draft if not yet created. */
exports.getPage = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!ALLOWED_PAGE_SLUGS.includes(slug)) {
      return res.status(400).json({ message: "Unknown page slug" });
    }

    const page = await Page.findOne({ slug });
    if (!page) {
      return res.json({ slug, title: "", content: "", isDraftPlaceholder: true });
    }
    res.json(page);
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** PUT /api/cms/pages/:slug — admin only, upserts (creates on first save). */
exports.upsertPage = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!ALLOWED_PAGE_SLUGS.includes(slug)) {
      return res.status(400).json({ message: "Unknown page slug" });
    }

    const { title, content } = req.body;
    const page = await Page.findOneAndUpdate(
      { slug },
      { slug, title, content: sanitizeRichText(content), updatedBy: req.user?.id },
      { new: true, upsert: true }
    );
    res.json(page);
  } catch (error) {
    console.error("Error saving page:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// Generic CMS Pages — arbitrary admin-authored pages (About Us, landing
// pages, etc.), distinct from the three fixed legal-page slugs above but
// sharing the same underlying Page model/collection (no duplicate schema).
// The legacy getPage/upsertPage endpoints above are untouched and keep
// serving privacy-policy/terms-of-service/community-guidelines exactly as
// before; these are additive routes for everything else.
// ---------------------------------------------------------------------------

const slugifyPageTitle = (text) =>
  (text || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "page";

const generateUniquePageSlug = async (title, excludeId) => {
  const base = slugifyPageTitle(title);
  let candidate = base;
  let suffix = 2;
  while (
    await Page.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
  ) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
};

/**
 * POST /api/cms/upload-image — admin only. Shared by every rich-text field
 * in the CMS hub (Pages, Career Tips, Legal pages) for the toolbar's
 * "attachment" (image) button. Stores the file via cmsUploadMiddleware.js
 * and returns its public URL for the frontend to insert into the Quill
 * editor as an <img> — the actual HTML written to the DB is still run
 * through sanitizeRichText on save, same as any other content.
 */
exports.uploadCmsImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    res.status(201).json({ url: `/uploads/cms/${req.file.filename}` });
  } catch (error) {
    console.error("Error uploading CMS image:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** GET /api/cms/pages — admin only. List + search + pagination. */
exports.adminListPages = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const search = (req.query.search || "").trim();

    const filter = search ? { title: new RegExp(escapeRegex(search), "i") } : {};

    const [pages, total] = await Promise.all([
      Page.find(filter)
        .populate("author", "name email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Page.countDocuments(filter),
    ]);

    res.json({ pages, total, page, totalPages: Math.max(Math.ceil(total / limit), 1) });
  } catch (error) {
    console.error("Error listing pages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** GET /api/cms/pages/id/:id — admin only. Full document for the edit form / preview, regardless of status. */
exports.adminGetPageById = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id).populate("author", "name email role");
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** POST /api/cms/pages — admin only. `author` is always the authenticated admin, never trusted from the body. */
exports.adminCreatePage = async (req, res) => {
  try {
    const { title, content, featuredImage, status } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const slug = await generateUniquePageSlug(title);
    const page = await Page.create({
      slug,
      title: title.trim(),
      content: sanitizeRichText(content),
      featuredImage: featuredImage || "",
      status: status === "draft" ? "draft" : "published",
      author: req.user.id,
      updatedBy: req.user.id,
    });
    res.status(201).json(page);
  } catch (error) {
    console.error("Error creating page:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** PUT /api/cms/pages/id/:id — admin only. */
exports.adminUpdatePage = async (req, res) => {
  try {
    const { title, content, featuredImage, status } = req.body;
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found" });

    if (title && title.trim() && title !== page.title) {
      page.title = title.trim();
      page.slug = await generateUniquePageSlug(title, page._id);
    }
    if (content !== undefined) page.content = sanitizeRichText(content);
    if (featuredImage !== undefined) page.featuredImage = featuredImage;
    if (status !== undefined) page.status = status === "draft" ? "draft" : "published";
    page.updatedBy = req.user.id;

    await page.save();
    res.json(page);
  } catch (error) {
    console.error("Error updating page:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** PATCH /api/cms/pages/id/:id/publish — admin only. Toggles draft/published. */
exports.adminTogglePagePublish = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found" });

    page.status = page.status === "published" ? "draft" : "published";
    page.updatedBy = req.user.id;
    await page.save();

    res.json({ message: "Page status updated", status: page.status });
  } catch (error) {
    console.error("Error toggling page status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** DELETE /api/cms/pages/id/:id — admin only. */
exports.adminDeletePage = async (req, res) => {
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json({ message: "Page deleted" });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/cms/pages/view/:slug — public. Only ever returns a published
 * page; a draft (or nonexistent slug) is a 404, not a 403, so a draft's
 * existence isn't leaked to a visitor guessing slugs.
 */
exports.getPublicPage = async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug, status: "published" });
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  } catch (error) {
    console.error("Error fetching public page:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// Homepage — admin-editable Hero + closing-CTA copy only. See
// models/HomepageContent.js for exactly what is (and isn't) covered and why.
// ---------------------------------------------------------------------------

/**
 * GET /api/cms/homepage — public. Returns isPublished:false (no hero/cta
 * fields) if nothing has been published yet, same "safe default" shape
 * getPage() uses for legal pages — callers should treat that as "use your
 * own hardcoded copy," never as an error.
 */
exports.getHomepageContent = async (req, res) => {
  try {
    const doc = await HomepageContent.findById(HomepageContent.SINGLETON_ID).lean();
    if (!doc || !doc.isPublished) {
      return res.json({ isPublished: false });
    }
    res.json(doc);
  } catch (error) {
    console.error("Error fetching homepage content:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/cms/homepage/admin — admin only. Unlike the public endpoint
 * above, always returns the real saved document (published or not) — the
 * admin form needs to resume editing a draft, or see what's live after
 * unpublishing, not the public "safe default" fallback shape.
 */
exports.getHomepageContentAdmin = async (req, res) => {
  try {
    const doc = await HomepageContent.findById(HomepageContent.SINGLETON_ID).lean();
    res.json(doc || { isPublished: false, hero: {}, cta: {} });
  } catch (error) {
    console.error("Error fetching homepage content (admin):", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/cms/homepage — admin only, upserts the one singleton document.
 * Accepts { isPublished, hero, cta } — an admin can save a draft with
 * isPublished:false to preview internally (via the admin form) before it
 * ever reaches the public endpoint's response.
 */
exports.upsertHomepageContent = async (req, res) => {
  try {
    const { isPublished, hero, cta } = req.body;
    const doc = await HomepageContent.findByIdAndUpdate(
      HomepageContent.SINGLETON_ID,
      { isPublished: !!isPublished, hero, cta, updatedBy: req.user?.id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(doc);
  } catch (error) {
    console.error("Error saving homepage content:", error);
    res.status(500).json({ message: "Server error" });
  }
};