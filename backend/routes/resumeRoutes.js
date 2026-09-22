const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const {
  getMyResumes,
  getResumeById,
  createResume,
  updateResume,
  cloneResume,
  deleteResume,
} = require("../controllers/resumeController");

router.get("/", authenticate, getMyResumes);
router.get("/:id", authenticate, getResumeById);
router.post("/", authenticate, createResume);
router.post("/:id/clone", authenticate, cloneResume);
router.patch("/:id", authenticate, updateResume);
router.delete("/:id", authenticate, deleteResume);

module.exports = router;