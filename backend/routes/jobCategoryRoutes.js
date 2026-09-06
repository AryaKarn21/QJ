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

router.get('/:id', jobCategoryController.getJobCategoryById);
router.put('/:id', authenticate, authorizeAdmin, iconUpload, jobCategoryController.updateJobCategory);
router.delete('/:id', authenticate, authorizeAdmin, jobCategoryController.deleteJobCategory);

// Extra Routes
router.patch('/:id/trending', authenticate, authorizeAdmin, jobCategoryController.patchTrending);
router.get('/trending/all', jobCategoryController.getTrendingCategories);

module.exports = router;