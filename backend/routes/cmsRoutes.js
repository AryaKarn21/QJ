const express = require("express");
const router = express.Router();
const cms = require("../controllers/cmsController");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");
const handleCmsImageUpload = require("../middleware/cmsUploadMiddleware");

// --- Blog moderation (admin/superadmin only) ---
router.get("/blogs", authenticate, authorizeAdmin, cms.adminGetAllBlogs);
router.patch("/blogs/:id/publish", authenticate, authorizeAdmin, cms.adminTogglePublishBlog);
router.delete("/blogs/:id", authenticate, authorizeAdmin, cms.adminDeleteBlog);

// --- FAQs (public read, admin write) ---
router.get("/faqs", cms.getFaqs);
router.post("/faqs", authenticate, authorizeAdmin, cms.createFaq);
router.put("/faqs/:id", authenticate, authorizeAdmin, cms.updateFaq);
router.delete("/faqs/:id", authenticate, authorizeAdmin, cms.deleteFaq);

// --- Career Tips (public read, admin write) ---
router.get("/career-tips", cms.getCareerTips);
router.get("/career-tips/:id", cms.getCareerTipById);
router.post("/career-tips", authenticate, authorizeAdmin, cms.createCareerTip);
router.put("/career-tips/:id", authenticate, authorizeAdmin, cms.updateCareerTip);
router.delete("/career-tips/:id", authenticate, authorizeAdmin, cms.deleteCareerTip);

// --- Legal pages (public read, admin write) — fixed-slug legacy routes,
// unchanged. Kept separate from the generic Pages CMS below since they're
// gated by ALLOWED_PAGE_SLUGS, not open to arbitrary admin-created slugs. ---
router.get("/pages/:slug", cms.getPage);
router.put("/pages/:slug", authenticate, authorizeAdmin, cms.upsertPage);

// --- Generic CMS Pages (admin: any slug; public: published only) ---
router.get("/pages", authenticate, authorizeAdmin, cms.adminListPages);
router.post("/pages", authenticate, authorizeAdmin, cms.adminCreatePage);
router.get("/pages/id/:id", authenticate, authorizeAdmin, cms.adminGetPageById);
router.put("/pages/id/:id", authenticate, authorizeAdmin, cms.adminUpdatePage);
router.patch("/pages/id/:id/publish", authenticate, authorizeAdmin, cms.adminTogglePagePublish);
router.delete("/pages/id/:id", authenticate, authorizeAdmin, cms.adminDeletePage);
router.get("/pages/view/:slug", cms.getPublicPage);

// --- Rich-text image uploads (shared by Pages / Career Tips / Legal editors) ---
router.post("/upload-image", authenticate, authorizeAdmin, handleCmsImageUpload, cms.uploadCmsImage);

// --- Homepage Hero + CTA copy (public read, admin write) ---
// Two GET variants on purpose: the public one hides unpublished drafts
// (falls back to isPublished:false), the admin one always returns the
// real saved document so the edit form can resume a draft.
router.get("/homepage/admin", authenticate, authorizeAdmin, cms.getHomepageContentAdmin);
router.get("/homepage", cms.getHomepageContent);
router.put("/homepage", authenticate, authorizeAdmin, cms.upsertHomepageContent);

module.exports = router;