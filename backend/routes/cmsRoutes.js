const express = require("express");
const router = express.Router();
const cms = require("../controllers/cmsController");
const {
  authenticate,
  authorizeAdmin,
  authorizeSuperAdmin,
  requirePermission,
} = require("../middleware/authMiddleware");
const handleCmsImageUpload = require("../middleware/cmsUploadMiddleware");

// --- Blog moderation (admin/superadmin or users with blogs permissions) ---
router.get("/blogs", authenticate, requirePermission("blogs.view"), cms.adminGetAllBlogs);
router.patch("/blogs/:id/publish", authenticate, requirePermission("blogs.publish", "blogs.moderate"), cms.adminTogglePublishBlog);
router.delete("/blogs/:id", authenticate, requirePermission("blogs.delete"), cms.adminDeleteBlog);

// --- FAQs (public read, CMS permissions write) ---
router.get("/faqs", cms.getFaqs);
router.post("/faqs", authenticate, requirePermission("cms.create"), cms.createFaq);
router.put("/faqs/:id", authenticate, requirePermission("cms.edit"), cms.updateFaq);
router.delete("/faqs/:id", authenticate, requirePermission("cms.delete"), cms.deleteFaq);

// --- Career Tips (public read, CMS permissions write) ---
router.get("/career-tips", cms.getCareerTips);
router.get("/career-tips/:id", cms.getCareerTipById);
router.post("/career-tips", authenticate, requirePermission("cms.create"), cms.createCareerTip);
router.put("/career-tips/:id", authenticate, requirePermission("cms.edit"), cms.updateCareerTip);
router.delete("/career-tips/:id", authenticate, requirePermission("cms.delete"), cms.deleteCareerTip);

// --- Legal pages (public read, superadmin/policies write) ---
router.get("/pages/:slug", cms.getPage);
router.put("/pages/:slug", authenticate, requirePermission("policies.edit", "cms.edit"), cms.upsertPage);

// --- Generic CMS Pages & Legal Policies (shared Page document structure) ---
router.get("/pages", authenticate, requirePermission("cms.view", "policies.view"), cms.adminListPages);
router.post("/pages", authenticate, requirePermission("cms.create"), cms.adminCreatePage);
router.get("/pages/id/:id", authenticate, requirePermission("cms.view", "policies.view"), cms.adminGetPageById);
router.put("/pages/id/:id", authenticate, requirePermission("cms.edit", "policies.edit"), cms.adminUpdatePage);
router.patch("/pages/id/:id/publish", authenticate, requirePermission("cms.publish", "policies.publish"), cms.adminTogglePagePublish);
router.delete("/pages/id/:id", authenticate, requirePermission("cms.delete", "policies.delete"), cms.adminDeletePage);

// Revision management for CMS pages & policies
router.get("/pages/id/:id/revisions", authenticate, requirePermission("cms.view", "policies.view"), cms.getPageRevisions);
router.post("/pages/id/:id/revisions/:revNumber/restore", authenticate, requirePermission("cms.edit", "policies.restore_versions"), cms.restorePageRevision);
router.get("/pages/view/:slug", cms.getPublicPage);

// --- Legal & Policies ---
router.get("/policies/types", authenticate, requirePermission("policies.view", "cms.view"), cms.getPolicyTypes);
router.get("/policies/published", cms.getPublishedPolicies);
router.get("/policies", authenticate, requirePermission("policies.view"), cms.adminListPolicies);
router.post("/policies", authenticate, requirePermission("policies.create"), cms.adminCreatePolicy);

// --- Rich-text image uploads ---
router.post("/upload-image", authenticate, requirePermission("cms.create", "cms.edit", "policies.create", "policies.edit"), handleCmsImageUpload, cms.uploadCmsImage);

// --- Homepage Hero + CTA + section headings ---
router.get("/homepage/admin", authenticate, requirePermission("cms.view"), cms.getHomepageContentAdmin);
router.get("/homepage", cms.getHomepageContent);
router.put("/homepage", authenticate, requirePermission("cms.edit", "cms.publish"), cms.upsertHomepageContent);
router.get("/homepage/revisions", authenticate, requirePermission("cms.view"), cms.getHomepageRevisions);
router.post("/homepage/revisions/:revNumber/restore", authenticate, requirePermission("cms.edit"), cms.restoreHomepageRevision);

// --- Generic sitewide key/value content ---
router.get("/site-content", cms.getSiteContentMap);
router.get("/site-content/admin", authenticate, requirePermission("cms.view"), cms.adminListSiteContent);
router.put("/site-content/:key", authenticate, requirePermission("cms.edit"), cms.adminUpsertSiteContent);
router.delete("/site-content/:key", authenticate, requirePermission("cms.delete"), cms.adminDeleteSiteContent);

module.exports = router;
