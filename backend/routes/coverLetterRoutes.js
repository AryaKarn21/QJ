const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  getMyCoverLetters,
  getCoverLetterById,
  createCoverLetter,
  updateCoverLetter,
  deleteCoverLetter,
} = require("../controllers/coverLetterController");

// Mounted at /api/jobseeker/cover-letters (server.js) — same namespace as
// the rest of the jobseeker-owned resources. Ownership is enforced inside
// each controller function (findOne scoped to req.user.id), same pattern
// as resumeRoutes.js/resumeController.js.
router.get("/", authenticate, getMyCoverLetters);
router.get("/:id", authenticate, getCoverLetterById);
router.post("/", authenticate, createCoverLetter);
router.patch("/:id", authenticate, updateCoverLetter);
router.delete("/:id", authenticate, deleteCoverLetter);

module.exports = router;
