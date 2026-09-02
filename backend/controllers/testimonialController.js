const fs = require("fs");
const path = require("path");
const Testimonial = require("../models/Testimonial");

// Same "delete a previously stored upload file" pattern used by
// advertisementController.js — storedPath is a full root-relative path as
// saved in DB, e.g. "/uploads/testimonials/x.jpg".
const deleteFile = (storedPath) => {
  if (!storedPath) return;
  const filePath = path.join(__dirname, "..", storedPath);
  fs.unlink(filePath, (err) => {
    if (err) console.error(`Failed to delete file: ${filePath}`, err.message);
  });
};

// ── Admin: list/create/update/delete/toggle ────────────────────────────────

/** GET /api/testimonials/admin — admin only. List + search + pagination. */
exports.adminListTestimonials = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const search = (req.query.search || "").trim();

    const filter = {};
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: re }, { company: re }, { quote: re }];
    }

    const [testimonials, total] = await Promise.all([
      Testimonial.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Testimonial.countDocuments(filter),
    ]);

    res.json({ testimonials, total, page, totalPages: Math.max(Math.ceil(total / limit), 1) });
  } catch (error) {
    console.error("Error listing testimonials:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** GET /api/testimonials/admin/:id — admin only. */
exports.adminGetTestimonialById = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id).populate("createdBy", "name email");
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found" });
    res.json(testimonial);
  } catch (error) {
    console.error("Error fetching testimonial:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** POST /api/testimonials/admin — admin only. `createdBy` is always the authenticated admin. */
exports.adminCreateTestimonial = async (req, res) => {
  try {
    const { name, role, company, quote, rating, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!quote || !quote.trim()) {
      return res.status(400).json({ message: "Quote is required" });
    }

    const parsedRating = rating === undefined || rating === "" ? 5 : Number(rating);
    if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const testimonial = await Testimonial.create({
      name: name.trim(),
      role: (role || "").trim(),
      company: (company || "").trim(),
      quote: quote.trim(),
      avatarUrl: req.file ? `/uploads/testimonials/${req.file.filename}` : "",
      rating: parsedRating,
      isActive: isActive === undefined ? true : isActive === "true" || isActive === true,
      createdBy: req.user.id,
    });

    res.status(201).json(testimonial);
  } catch (error) {
    console.error("Error creating testimonial:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** PUT /api/testimonials/admin/:id — admin only. */
exports.adminUpdateTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found" });

    const { name, role, company, quote, rating, isActive } = req.body;

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: "Name cannot be empty" });
      testimonial.name = name.trim();
    }
    if (role !== undefined) testimonial.role = role.trim();
    if (company !== undefined) testimonial.company = company.trim();
    if (quote !== undefined) {
      if (!quote.trim()) return res.status(400).json({ message: "Quote cannot be empty" });
      testimonial.quote = quote.trim();
    }
    if (rating !== undefined) {
      const parsedRating = Number(rating);
      if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      testimonial.rating = parsedRating;
    }
    if (isActive !== undefined) testimonial.isActive = isActive === "true" || isActive === true;

    if (req.file) {
      if (testimonial.avatarUrl) deleteFile(testimonial.avatarUrl);
      testimonial.avatarUrl = `/uploads/testimonials/${req.file.filename}`;
    }

    await testimonial.save();
    res.json(testimonial);
  } catch (error) {
    console.error("Error updating testimonial:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** PATCH /api/testimonials/admin/:id/toggle — admin only. */
exports.adminToggleTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found" });

    testimonial.isActive = !testimonial.isActive;
    await testimonial.save();

    res.json({ message: "Testimonial status updated", isActive: testimonial.isActive });
  } catch (error) {
    console.error("Error toggling testimonial:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** DELETE /api/testimonials/admin/:id — admin only. */
exports.adminDeleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found" });
    if (testimonial.avatarUrl) deleteFile(testimonial.avatarUrl);
    res.json({ message: "Testimonial deleted" });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Public ───────────────────────────────────────────────────────────────

/**
 * GET /api/testimonials/active — public. Only ever returns published
 * testimonials, newest first. Renders nothing on the frontend (not
 * placeholder quotes) if this comes back empty — same "no data yet"
 * convention as GET /api/advertisements/active.
 */
exports.getActiveTestimonials = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 9, 1), 20);
    const testimonials = await Testimonial.find({ isActive: true })
      .select("name role company quote avatarUrl rating")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(testimonials);
  } catch (error) {
    console.error("Error fetching active testimonials:", error);
    res.status(500).json({ message: "Server error" });
  }
};
