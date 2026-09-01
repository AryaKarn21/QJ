const fs = require("fs");
const path = require("path");
const Advertisement = require("../models/Advertisement");

// Same "delete a previously stored upload file" pattern used by
// jobseekerController.js/employerController.js — storedPath is a full
// root-relative path as saved in DB, e.g. "/uploads/advertisements/x.jpg".
const deleteFile = (storedPath) => {
  if (!storedPath) return;
  const filePath = path.join(__dirname, "..", storedPath);
  fs.unlink(filePath, (err) => {
    if (err) console.error(`Failed to delete file: ${filePath}`, err.message);
  });
};

// A link is either a same-origin relative path ("/jobs", "/community/post/x")
// or a full http(s) URL — never a javascript:/data: scheme, and never
// trusted to render as raw markup anywhere it's used.
const isSafeLink = (url) => {
  if (typeof url !== "string" || !url.trim()) return false;
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const PLACEMENTS = ["homepage", "jobs_page"];

// ── Admin: list/create/update/delete/toggle ────────────────────────────────

/** GET /api/advertisements/admin — admin only. List + search + pagination. */
exports.adminListAdvertisements = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const search = (req.query.search || "").trim();
    const placement = req.query.placement || "";

    const filter = {};
    if (search) filter.title = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (placement && PLACEMENTS.includes(placement)) filter.placement = placement;

    const [ads, total] = await Promise.all([
      Advertisement.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Advertisement.countDocuments(filter),
    ]);

    res.json({ ads, total, page, totalPages: Math.max(Math.ceil(total / limit), 1) });
  } catch (error) {
    console.error("Error listing advertisements:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** GET /api/advertisements/admin/:id — admin only. */
exports.adminGetAdvertisementById = async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id).populate("createdBy", "name email");
    if (!ad) return res.status(404).json({ message: "Advertisement not found" });
    res.json(ad);
  } catch (error) {
    console.error("Error fetching advertisement:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** POST /api/advertisements/admin — admin only. `createdBy` is always the authenticated admin. */
exports.adminCreateAdvertisement = async (req, res) => {
  try {
    const { title, description, linkUrl, placement, isActive, startDate, endDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!PLACEMENTS.includes(placement)) {
      return res.status(400).json({ message: `Placement must be one of: ${PLACEMENTS.join(", ")}` });
    }
    if (!isSafeLink(linkUrl)) {
      return res.status(400).json({ message: "Link must be a relative path (e.g. /jobs) or a full http(s) URL" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "An image is required" });
    }

    const ad = await Advertisement.create({
      title: title.trim(),
      description: (description || "").trim(),
      imageUrl: `/uploads/advertisements/${req.file.filename}`,
      linkUrl: linkUrl.trim(),
      placement,
      isActive: isActive === undefined ? true : isActive === "true" || isActive === true,
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: req.user.id,
    });

    res.status(201).json(ad);
  } catch (error) {
    console.error("Error creating advertisement:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** PUT /api/advertisements/admin/:id — admin only. */
exports.adminUpdateAdvertisement = async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: "Advertisement not found" });

    const { title, description, linkUrl, placement, isActive, startDate, endDate } = req.body;

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: "Title cannot be empty" });
      ad.title = title.trim();
    }
    if (description !== undefined) ad.description = description.trim();
    if (linkUrl !== undefined) {
      if (!isSafeLink(linkUrl)) {
        return res.status(400).json({ message: "Link must be a relative path (e.g. /jobs) or a full http(s) URL" });
      }
      ad.linkUrl = linkUrl.trim();
    }
    if (placement !== undefined) {
      if (!PLACEMENTS.includes(placement)) {
        return res.status(400).json({ message: `Placement must be one of: ${PLACEMENTS.join(", ")}` });
      }
      ad.placement = placement;
    }
    if (isActive !== undefined) ad.isActive = isActive === "true" || isActive === true;
    if (startDate !== undefined) ad.startDate = startDate || null;
    if (endDate !== undefined) ad.endDate = endDate || null;

    if (req.file) {
      if (ad.imageUrl) deleteFile(ad.imageUrl);
      ad.imageUrl = `/uploads/advertisements/${req.file.filename}`;
    }

    await ad.save();
    res.json(ad);
  } catch (error) {
    console.error("Error updating advertisement:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** PATCH /api/advertisements/admin/:id/toggle — admin only. */
exports.adminToggleAdvertisement = async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: "Advertisement not found" });

    ad.isActive = !ad.isActive;
    await ad.save();

    res.json({ message: "Advertisement status updated", isActive: ad.isActive });
  } catch (error) {
    console.error("Error toggling advertisement:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** DELETE /api/advertisements/admin/:id — admin only. */
exports.adminDeleteAdvertisement = async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ message: "Advertisement not found" });
    if (ad.imageUrl) deleteFile(ad.imageUrl);
    res.json({ message: "Advertisement deleted" });
  } catch (error) {
    console.error("Error deleting advertisement:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Public: fetch active ads + real tracking ───────────────────────────────

/**
 * GET /api/advertisements/active?placement=homepage — public. Only ever
 * returns ads that are active AND within their scheduling window (if any).
 */
exports.getActiveAdvertisements = async (req, res) => {
  try {
    const { placement } = req.query;
    if (!PLACEMENTS.includes(placement)) {
      return res.status(400).json({ message: `placement must be one of: ${PLACEMENTS.join(", ")}` });
    }

    const now = new Date();
    const ads = await Advertisement.find({
      placement,
      isActive: true,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    })
      .select("title description imageUrl linkUrl")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json(ads);
  } catch (error) {
    console.error("Error fetching active advertisements:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/advertisements/:id/impression — public, fire-and-forget from
 * the client the moment an ad actually renders. Real counter, incremented
 * once per render — not an estimate.
 */
exports.recordImpression = async (req, res) => {
  try {
    await Advertisement.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } });
    res.status(204).end();
  } catch (error) {
    console.error("Error recording ad impression:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/** POST /api/advertisements/:id/click — public, fired when a visitor clicks the ad. */
exports.recordClick = async (req, res) => {
  try {
    await Advertisement.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    res.status(204).end();
  } catch (error) {
    console.error("Error recording ad click:", error);
    res.status(500).json({ message: "Server error" });
  }
};
