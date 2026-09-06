const JobCategory = require('../models/JobCategory');
const Job = require('../models/Job');

// Create
exports.createJobCategory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Icon file is required' });
    }

    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existing = await JobCategory.findOne({ name }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      return res.status(409).json({ error: `A category named "${existing.name}" already exists` });
    }

    const jobCategory = await JobCategory.create({
      name,
      icon: req.file.filename, // store uploaded filename
      isTrending: req.body.isTrending || false,
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

// Read All
// `?activeOnly=true` filters out inactive categories — used by the public
// consumers (the "Post a Job" category dropdown, the shared
// frontend/src/api/jobCategoryApi.ts wrapper) so an employer's deactivated
// category, or one an admin has turned off, stops appearing as selectable
// without needing a second endpoint. The admin management panel calls this
// route with no query param at all (unchanged), so it keeps seeing every
// category regardless of status — nothing about its existing behavior
// changes. `{status: {$ne: 'inactive'}}` (not `{status: 'active'}`) so
// categories created before this field existed, which have no `status` in
// the stored document, still show up.
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

// Read One
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

    if (req.file) {
      updateData.icon = req.file.filename;
    }

    const category = await JobCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) return res.status(404).json({ error: 'Not found' });
    res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    console.error('Error updating job category:', error);
    res.status(400).json({ error: 'Failed to update category' });
  }
};

// Delete
// Jobs store the category as a plain name string rather than a reference,
// so deleting a category doesn't cascade — but it does leave live job
// posts pointing at a category that no longer exists in the admin list.
// Block the delete (unless explicitly forced) and tell the admin how many
// jobs are affected, instead of silently orphaning them.
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

// Patch isTrending
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

// ─────────────────────────────────────────────────────────────────────────
// Employer-owned categories (Employer Dashboard → Settings → Job Categories)
// Same collection as the admin/system categories above — extended with
// scope/createdBy/status rather than a second model, so the public list
// and the "Post a Job" dropdown never need to merge two sources. Ownership
// is enforced here (createdBy must match the requesting employer), the way
// getAppliedJobseekers checks `job.employer` elsewhere in this codebase.
// ─────────────────────────────────────────────────────────────────────────

// List only the categories THIS employer created (including their own
// inactive ones) — for the management page. The public list only ever
// shows the active ones, so an employer needs this separate "mine" view to
// see/reactivate something they turned off.
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

    // Global uniqueness (shared with admin-created categories) — this is
    // exactly what stops an employer from creating a duplicate "Marketing"
    // that already exists as a system category or another employer's.
    const existing = await JobCategory.findOne({ name }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      return res.status(409).json({ error: `A category named "${existing.name}" already exists` });
    }

    const category = await JobCategory.create({
      name,
      description: (req.body.description || '').trim(),
      icon: req.file ? req.file.filename : '',
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

// Shared ownership guard for update/delete/status-toggle below — 404 if the
// category doesn't exist at all, 403 if it exists but isn't this
// employer's own (never leaks whether a system/other-employer category by
// that id exists via a different status code).
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
      category.icon = req.file.filename;
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

    // Same "don't orphan live jobs" guard as the admin delete path.
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

// Get Trending
exports.getTrendingCategories = async (req, res) => {
  try {
    const trending = await JobCategory.find({ isTrending: true }).lean();

    // Real per-category active-job counts for the landing page's category
    // cards — additive `jobCount` field, existing shape/consumers
    // untouched. `Job.jobcategory` stores the category name as plain text
    // (not a ref), so this matches on name rather than an id.
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