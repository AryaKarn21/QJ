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
exports.getJobCategories = async (req, res) => {
  try {
    const categories = await JobCategory.find();
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