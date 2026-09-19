const express = require('express');
const router = express.Router();
const jobCategoryController = require('../controllers/jobCategoryController');
const iconUpload = require('../middleware/iconUploadMiddleware');
const { authenticate,  authorizeAdmin, authorizeRoles } = require("../middleware/authMiddleware");

// CRUD (admin/system categories)
router.post('/', authenticate, authorizeAdmin, iconUpload, jobCategoryController.createJobCategory);
router.get('/', jobCategoryController.getJobCategories);

// Employer-owned categories — Employer Dashboard → Settings → Job
// Categories. Mounted before the generic "/:id" routes below so
// "/employer/mine" isn't swallowed by the `:id` param match. Icon upload is
// optional here (unlike the admin route, which requires one) — see
// createEmployerJobCategory.
router.get('/employer/mine', authenticate, authorizeRoles('employer'), jobCategoryController.getMyEmployerJobCategories);
router.post('/employer', authenticate, authorizeRoles('employer'), iconUpload, jobCategoryController.createEmployerJobCategory);
router.put('/employer/:id', authenticate, authorizeRoles('employer'), iconUpload, jobCategoryController.updateEmployerJobCategory);
router.patch('/employer/:id/status', authenticate, authorizeRoles('employer'), jobCategoryController.patchEmployerJobCategoryStatus);
router.delete('/employer/:id', authenticate, authorizeRoles('employer'), jobCategoryController.deleteEmployerJobCategory);

// All other static routes MUST be declared before the generic "/:id"
// routes below — Express matches routes in declaration order, and "/:id"
// matches ANY single path segment, so "/trending/all" (and "/:id/trending"
// below it) were being swallowed by "GET /:id" (id="trending") before this
// reorder, permanently 404/500-ing GET /api/jobcategories/trending/all.
router.get('/trending/all', jobCategoryController.getTrendingCategories);

router.get('/:id', jobCategoryController.getJobCategoryById);
router.put('/:id', authenticate, authorizeAdmin, iconUpload, jobCategoryController.updateJobCategory);
router.delete('/:id', authenticate, authorizeAdmin, jobCategoryController.deleteJobCategory);
router.patch('/:id/trending', authenticate, authorizeAdmin, jobCategoryController.patchTrending);

module.exports = router;