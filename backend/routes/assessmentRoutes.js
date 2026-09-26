const express = require("express");
const router = express.Router();
const { authenticate, authorizeEmployer, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createAssessment,
  getAssessmentById,
  listAssessments,
  assignAssessment,
  getAssessmentForCandidate,
  startAttempt,
  submitAssessment,
  getAssessmentResults,
  gradeAttempt,
} = require("../controllers/assessmentController");

// --- Candidate-facing (secure token + authenticated-owner access) ---
// Declared before the /:id routes below since these have literal path
// segments ("access", "attempts") that must never be swallowed by a
// same-depth `/:id/...` pattern.
router.get("/access/:applicationId/:token", authenticate, authorizeRoles("jobseeker"), getAssessmentForCandidate);
router.post("/access/:applicationId/:token/start", authenticate, authorizeRoles("jobseeker"), startAttempt);
router.patch("/attempts/:attemptId/grade", authenticate, authorizeEmployer, gradeAttempt);

// --- Employer-facing assessment management ---
router.get("/", authenticate, authorizeEmployer, listAssessments);
router.post("/", authenticate, authorizeEmployer, createAssessment);
router.get("/:id", authenticate, authorizeEmployer, getAssessmentById);
router.post("/:id/assign", authenticate, authorizeEmployer, assignAssessment);
router.get("/:id/results/:applicationId", authenticate, authorizeEmployer, getAssessmentResults);

// --- Candidate submission ---
router.post("/:id/submit", authenticate, authorizeRoles("jobseeker"), submitAssessment);

module.exports = router;
