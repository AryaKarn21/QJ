const express = require("express");
const router = express.Router();
const cms = require("../controllers/cmsController");
const { authenticate, authorizeAdmin, authorizeSuperAdmin } = require("../middleware/authMiddleware");
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

// --- Legal pages (public read, superadmin write) — fixed-slug legacy
// routes, unchanged in shape. Kept separate from the generic Pages CMS
// below since they're gated by ALLOWED_PAGE_SLUGS, not open to arbitrary
// admin-created slugs. Superadmin-only per spec Part 7 (policies/legal
// content). ---
router.get("/pages/:slug", cms.getPage);
router.put("/pages/:slug", authenticate, authorizeSuperAdmin, cms.upsertPage);

// --- Generic CMS Pages (superadmin: any slug; public: published only) ---
router.get("/pages", authenticate, authorizeSuperAdmin, cms.adminListPages);
router.post("/pages", authenticate, authorizeSuperAdmin, cms.adminCreatePage);
router.get("/pages/id/:id", authenticate, authorizeSuperAdmin, cms.adminGetPageById);
router.put("/pages/id/:id", authenticate, authorizeSuperAdmin, cms.adminUpdatePage);
router.patch("/pages/id/:id/publish", authenticate, authorizeSuperAdmin, cms.adminTogglePagePublish);
router.delete("/pages/id/:id", authenticate, authorizeSuperAdmin, cms.adminDeletePage);
// Revision management for CMS pages (shared by generic Pages and Legal & Policies — both are Page documents)
router.get("/pages/id/:id/revisions", authenticate, authorizeSuperAdmin, cms.getPageRevisions);
router.post("/pages/id/:id/revisions/:revNumber/restore", authenticate, authorizeSuperAdmin, cms.restorePageRevision);
router.get("/pages/view/:slug", cms.getPublicPage);

// --- Legal & Policies (superadmin: list/create; public: published-only list for the footer) ---
// Editing an individual policy (get-by-id/update/publish-toggle/delete/
// revisions) reuses the generic Pages routes above — a policy is just a
// Page with `policyType` set, not a separate model/endpoint family.
router.get("/policies/types", authenticate, authorizeSuperAdmin, cms.getPolicyTypes);
router.get("/policies/published", cms.getPublishedPolicies);
router.get("/policies", authenticate, authorizeSuperAdmin, cms.adminListPolicies);
router.post("/policies", authenticate, authorizeSuperAdmin, cms.adminCreatePolicy);

// --- Rich-text image uploads (shared by Pages / Career Tips / Legal editors —
// stays admin-writable since Career Tips does) ---
router.post("/upload-image", authenticate, authorizeAdmin, handleCmsImageUpload, cms.uploadCmsImage);

// --- Homepage Hero + CTA + section headings (public read, superadmin write) ---
// Two GET variants on purpose: the public one hides unpublished drafts
// (falls back to isPublished:false), the admin one always returns the
// real saved document so the edit form can resume a draft.
router.get("/homepage/admin", authenticate, authorizeSuperAdmin, cms.getHomepageContentAdmin);
router.get("/homepage", cms.getHomepageContent);
router.put("/homepage", authenticate, authorizeSuperAdmin, cms.upsertHomepageContent);
router.get("/homepage/revisions", authenticate, authorizeSuperAdmin, cms.getHomepageRevisions);
router.post("/homepage/revisions/:revNumber/restore", authenticate, authorizeSuperAdmin, cms.restoreHomepageRevision);

// --- Generic sitewide key/value content (public: whole map; superadmin: CRUD) ---
router.get("/site-content", cms.getSiteContentMap);
router.get("/site-content/admin", authenticate, authorizeSuperAdmin, cms.adminListSiteContent);
router.put("/site-content/:key", authenticate, authorizeSuperAdmin, cms.adminUpsertSiteContent);
router.delete("/site-content/:key", authenticate, authorizeSuperAdmin, cms.adminDeleteSiteContent);

module.exports = router;
