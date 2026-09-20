const JobCategory = require('../models/JobCategory');
const Job = require('../models/Job');
const { persistUpload, deleteStoredFile } = require('../services/media.service');

// Shared by every icon-upload catch block below. A misconfigured storage
// backend (Cloudinary env vars missing in production — see
// media.service.js's persistUpload) is a server-side operations problem,
// not something the admin/employer did wrong — 503, not 400, so it isn't
// misread as "you uploaded a bad file." Everything else from
// persistUpload (unsupported file type, a real Cloudinary-side failure)
// stays a 400 with the real reason.
function respondUploadError(res, error, logPrefix) {
  console.error(logPrefix, error);
  if (error.code === 'CLOUD_STORAGE_NOT_CONFIGURED') {
    return res.status(503).json({ error: error.message });
  }
  return res.status(400).json({ error: error.message || 'Failed to upload icon. Please try a different image.' });
}

// Create — always an admin/superadmin (system) category. Employer-created
// categories go through createEmployerJobCategory below, which explicitly
// sets scope: 'employer'; this one relies on the schema's scope: 'system'
// default and additionally stamps createdBy with the authenticated admin
// so "who created this" is traceable, same as employer categories already are.
exports.createJobCategory = async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  let icon = '';
  if (req.file) {
    try {
      icon = await persistUpload(req.file, 'job_category_icons', req.user?.id || 'system');
    } catch (uploadError) {
      return respondUploadError(res, uploadError, `[jobCategoryController.createJobCategory] icon upload failed (user=${req.user?.id}):`);
    }
  }

  try {
    const existing = await JobCategory.findOne({ name }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      return res.status(409).json({ error: `A category named "${existing.name}" already exists` });
    }

    const jobCategory = await JobCategory.create({
      name,
      icon,
      isTrending: req.body.isTrending === 'true' || req.body.isTrending === true,
      scope: 'system',
      createdBy: req.user?.id || null,
    });

    res.status(201).json(jobCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error(`[jobCategoryController.createJobCategory] unexpected error (user=${req.user?.id}):`, error);
    res.status(500).json({ error: 'Failed to create category due to a server error. Please try again.' });
  }
};

exports.getJobCategories = async (req, res) => {
  try {
    const filter = req.query.activeOnly === 'true' ? { status: { $ne: 'inactive' } } : {};
    const categories = await JobCategory.find(filter);
    res.json(categories);
  } catch (error) {
    console.error('Error listing job categories:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
};

exports.getJobCategoryById = async (req, res) => {
  try {
    const category = await JobCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Not found' });
    res.json(category);
  } catch (error) {
    console.error('Error fetching job category:', error);
    res.status(500).json({ error: 'Failed to load category' });
  }
};

// Update (supports updating icon if uploaded)
exports.updateJobCategory = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (typeof updateData.name === 'string') {
      updateData.name = updateData.name.trim();
      if (!updateData.name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const existing = await JobCategory.findOne({ name: updateData.name })
        .collation({ locale: 'en', strength: 2 });
      if (existing && String(existing._id) !== req.params.id) {
        return res.status(409).json({ error: `A category named "${existing.name}" already exists` });
      }
    }

    let previousIcon = null;
    if (req.file) {
      const current = await JobCategory.findById(req.params.id).select('icon').lean();
      previousIcon = current?.icon || null;
      try {
        updateData.icon = await persistUpload(req.file, 'job_category_icons', req.user?.id || req.params.id);
      } catch (uploadError) {
        return respondUploadError(res, uploadError, `[jobCategoryController.updateJobCategory] icon upload failed (id=${req.params.id}):`);
      }
    }

    const category = await JobCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) return res.status(404).json({ error: 'Not found' });
    if (previousIcon) deleteStoredFile(previousIcon);
    res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error(`[jobCategoryController.updateJobCategory] unexpected error (id=${req.params.id}):`, error);
    res.status(500).json({ error: 'Failed to update category due to a server error. Please try again.' });
  }
};

exports.deleteJobCategory = async (req, res) => {
  try {
    const category = await JobCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Not found' });

    const jobCount = await Job.countDocuments({ jobcategory: category.name });
    const force = req.query.force === 'true';

    if (jobCount > 0 && !force) {
      return res.status(409).json({
        error: `${jobCount} job${jobCount === 1 ? '' : 's'} still use this category`,
        jobCount,
      });
    }

    await JobCategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully', jobsAffected: jobCount });
  } catch (error) {
    console.error('Error deleting job category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

exports.patchTrending = async (req, res) => {
  try {
    const { isTrending } = req.body;
    if (typeof isTrending !== 'boolean') {
      return res.status(400).json({ error: 'isTrending must be boolean' });
    }

    const category = await JobCategory.findByIdAndUpdate(
      req.params.id,
      { isTrending },
      { new: true }
    );

    if (!category) return res.status(404).json({ error: 'Not found' });
    res.json(category);
  } catch (error) {
    console.error('Error updating trending status:', error);
    res.status(400).json({ error: 'Failed to update trending status' });
  }
};

exports.getMyEmployerJobCategories = async (req, res) => {
  try {
    const categories = await JobCategory.find({ scope: 'employer', createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    console.error('Error listing employer job categories:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
};

exports.createEmployerJobCategory = async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  let icon = '';
  if (req.file) {
    try {
      icon = await persistUpload(req.file, 'job_category_icons', req.user.id);
    } catch (uploadError) {
      return respondUploadError(res, uploadError, `[jobCategoryController.createEmployerJobCategory] icon upload failed (user=${req.user?.id}):`);
    }
  }

  try {
    const existing = await JobCategory.findOne({ name }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      return res.status(409).json({ error: `A category named "${existing.name}" already exists` });
    }

    const category = await JobCategory.create({
      name,
      description: (req.body.description || '').trim(),
      icon,
      scope: 'employer',
      createdBy: req.user.id,
      status: 'active',
    });

    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error(`[jobCategoryController.createEmployerJobCategory] unexpected error (user=${req.user?.id}):`, error);
    res.status(500).json({ error: 'Failed to create category due to a server error. Please try again.' });
  }
};

async function loadOwnedEmployerCategory(req, res) {
  const category = await JobCategory.findById(req.params.id);
  if (!category) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }
  if (category.scope !== 'employer' || String(category.createdBy) !== String(req.user.id)) {
    res.status(403).json({ error: "You don't have permission to manage this category." });
    return null;
  }
  return category;
}

exports.updateEmployerJobCategory = async (req, res) => {
  try {
    const category = await loadOwnedEmployerCategory(req, res);
    if (!category) return;

    if (typeof req.body.name === 'string') {
      const name = req.body.name.trim();
      if (!name) return res.status(400).json({ error: 'Category name is required' });
      const existing = await JobCategory.findOne({ name }).collation({ locale: 'en', strength: 2 });
      if (existing && String(existing._id) !== String(category._id)) {
        return res.status(409).json({ error: `A category named "${existing.name}" already exists` });
      }
      category.name = name;
    }
    if (typeof req.body.description === 'string') {
      category.description = req.body.description.trim();
    }
    if (req.file) {
      const previousIcon = category.icon;
      try {
        category.icon = await persistUpload(req.file, 'job_category_icons', req.user.id);
      } catch (uploadError) {
        return respondUploadError(res, uploadError, `[jobCategoryController.updateEmployerJobCategory] icon upload failed (id=${req.params.id}):`);
      }
      if (previousIcon) deleteStoredFile(previousIcon);
    }

    await category.save();
    res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error(`[jobCategoryController.updateEmployerJobCategory] unexpected error (id=${req.params.id}):`, error);
    res.status(500).json({ error: 'Failed to update category due to a server error. Please try again.' });
  }
};

exports.patchEmployerJobCategoryStatus = async (req, res) => {
  try {
    const category = await loadOwnedEmployerCategory(req, res);
    if (!category) return;

    if (!['active', 'inactive'].includes(req.body.status)) {
      return res.status(400).json({ error: 'status must be "active" or "inactive"' });
    }
    category.status = req.body.status;
    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Error updating employer category status:', error);
    res.status(400).json({ error: 'Failed to update category status' });
  }
};

exports.deleteEmployerJobCategory = async (req, res) => {
  try {
    const category = await loadOwnedEmployerCategory(req, res);
    if (!category) return;

    const jobCount = await Job.countDocuments({ jobcategory: category.name });
    const force = req.query.force === 'true';
    if (jobCount > 0 && !force) {
      return res.status(409).json({
        error: `${jobCount} job${jobCount === 1 ? '' : 's'} still use this category`,
        jobCount,
      });
    }

    await JobCategory.findByIdAndDelete(category._id);
    res.json({ message: 'Deleted successfully', jobsAffected: jobCount });
  } catch (error) {
    console.error('Error deleting employer job category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

exports.getTrendingCategories = async (req, res) => {
  try {
    const trending = await JobCategory.find({ isTrending: true }).lean();

    const counts = await Job.aggregate([
      { $match: { status: "Active" } },
      { $group: { _id: "$jobcategory", count: { $sum: 1 } } },
    ]);
    const countByName = new Map(counts.map((c) => [c._id, c.count]));

    const withCounts = trending.map((cat) => ({
      ...cat,
      jobCount: countByName.get(cat.name) || 0,
    }));

    res.json(withCounts);
  } catch (error) {
    console.error('Error fetching trending job categories:', error);
    res.status(500).json({ error: 'Failed to load trending categories' });
  }
};