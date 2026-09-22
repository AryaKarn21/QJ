const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const resumeDocumentUpload = require("../middleware/resumeDocumentUploadMiddleware");
const {
  getMyResumes,
  getResumeById,
  createResume,
  updateResume,
  cloneResume,
  deleteResume,
  uploadResumeDocument,
  deleteResumeDocument,
  toggleResumeDocument,
} = require("../controllers/resumeController");

router.get("/", authenticate, getMyResumes);
router.get("/:id", authenticate, getResumeById);
router.post("/", authenticate, createResume);
router.post("/:id/clone", authenticate, cloneResume);
router.patch("/:id", authenticate, updateResume);
router.delete("/:id", authenticate, deleteResume);

router.post("/:id/documents", authenticate, resumeDocumentUpload, uploadResumeDocument);
router.patch("/:id/documents/:docId", authenticate, toggleResumeDocument);
router.delete("/:id/documents/:docId", authenticate, deleteResumeDocument);

module.exports = router;