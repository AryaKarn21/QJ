const express = require("express");
const router = express.Router();
const advertisementUpload = require("../middleware/advertisementUploadMiddleware");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");
const {
  adminListAdvertisements,
  adminGetAdvertisementById,
  adminCreateAdvertisement,
  adminUpdateAdvertisement,
  adminToggleAdvertisement,
  adminDeleteAdvertisement,
  getActiveAdvertisements,
  recordImpression,
  recordClick,
} = require("../controllers/advertisementController");

// --- Public (no auth) — real ads only, never draft/inactive ones ---
router.get("/active", getActiveAdvertisements);
router.post("/:id/impression", recordImpression);
router.post("/:id/click", recordClick);

// --- Admin/superadmin only ---
router.get("/admin", authenticate, authorizeAdmin, adminListAdvertisements);
router.post("/admin", authenticate, authorizeAdmin, advertisementUpload, adminCreateAdvertisement);
router.get("/admin/:id", authenticate, authorizeAdmin, adminGetAdvertisementById);
router.put("/admin/:id", authenticate, authorizeAdmin, advertisementUpload, adminUpdateAdvertisement);
router.patch("/admin/:id/toggle", authenticate, authorizeAdmin, adminToggleAdvertisement);
router.delete("/admin/:id", authenticate, authorizeAdmin, adminDeleteAdvertisement);

module.exports = router;
