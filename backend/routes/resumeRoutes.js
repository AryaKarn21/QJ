const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  getMyResumes,
  getResumeById,
  createResume,
  updateResume,
  deleteResume,
} = require("../controllers/resumeController");

router.get("/", authenticate, getMyResumes);
router.get("/:id", authenticate, getResumeById);
router.post("/", authenticate, createResume);
router.patch("/:id", authenticate, updateResume);
router.delete("/:id", authenticate, deleteResume);

module.exports = router;