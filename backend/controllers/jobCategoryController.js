const JobCategory = require('../models/JobCategory');
const Job = require('../models/Job');
const { persistUpload, deleteStoredFile } = require('../services/media.service');

// Create
exports.createJobCategory = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existing = await JobCategory.findOne({ name }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      return res.status(409).json({ error: `A category named "${existing.name}" already exists` });
    }

    const icon = req.file ? await persistUpload(req.file, 'job_category_icons', req.user?.id || 'system') : '';

    const jobCategory = await JobCategory.create({
      name,
      icon,
      isTrending: req.body.isTrending === 'true' || req.body.isTrending === true,
    });

    res.status(201).json(jobCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    console.error('Error creating job category:', error);
    res.status(400).json({ error: 'Failed to create category' });
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
      updateData.icon = await persistUpload(req.file, 'job_category_icons', req.user?.id || req.params.id);
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
    console.error('Error updating job category:', error);
    res.status(400).json({ error: 'Failed to update category' });
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
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existing = await JobCategory.findOne({ name }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      return res.status(409).json({ error: `A category named "${existing.name}" already exists` });
    }

    const category = await JobCategory.create({
      name,
      description: (req.body.description || '').trim(),
      icon: req.file ? await persistUpload(req.file, 'job_category_icons', req.user.id) : '',
      scope: 'employer',
      createdBy: req.user.id,
      status: 'active',
    });

    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    console.error('Error creating employer job category:', error);
    res.status(400).json({ error: 'Failed to create category' });
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
      category.icon = await persistUpload(req.file, 'job_category_icons', req.user.id);
      if (previousIcon) deleteStoredFile(previousIcon);
    }

    await category.save();
    res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    console.error('Error updating employer job category:', error);
    res.status(400).json({ error: 'Failed to update category' });
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