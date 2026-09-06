const express = require("express");
const router = express.Router();
const { authenticate, authorizeEmployer, authorizeRoles } = require("../middleware/authMiddleware");
const userUpload = require('../middleware/userUploadMiddleware');
const {
  getEmployerProfile, updateEmployerProfile, createJob, editJob,
  updateApplication, deleteJob, getAppliedJobseekers, getEmployerJobs,
  getEmployerDashboardStats, getAllApplicantsForEmployer,
  getAllApplicantsForEmployerJobs, updateNotificationPreferences,
  deactivateAccount, getCandidates, toggleSavedCandidate,
  getSavedCandidates, getScheduledInterviews, updateEmployerHiringStatus,
} = require("../controllers/employerController");

// Search companies — searchEmployers was missing from controller so we
// inline a simple search here directly using the Employer model.
const Employer = require("../models/Employer");
const searchEmployers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ employers: [] });
    const results = await Employer.find({
      name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
      isActive: { $ne: false },
    })
      .select("_id name companyLogo industryType")
      .limit(10)
      .lean();
    // The frontend (companySearchApi.ts) reads `res.data.employers` — this
    // previously returned a bare array, so `.employers` was always
    // `undefined` and the company picker dropdown silently never showed
    // any results (root cause of jobseeker experience entries never
    // getting linked to a real company account via `companyId`).
    res.json({ employers: results });
  } catch (err) {
    console.error("searchEmployers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

router.get("/search-companies", authenticate, searchEmployers);
router.get("/profile", authenticate, authorizeRoles("employer"), getEmployerProfile);
router.put("/profile", authenticate, authorizeRoles("employer"), userUpload, updateEmployerProfile);

// Update hiring status ("Actively Hiring" etc.) — focused JSON endpoint,
// separate from the multipart full-profile PUT above (see
// employerController.js's updateEmployerHiringStatus for why).
router.put("/profile/status", authenticate, authorizeRoles("employer"), updateEmployerHiringStatus);
// Mutating/consequential actions stay gated by `authorizeEmployer` (requires
// admin-verified KYC, isVerified===true) — creating/editing/deleting a job
// or acting on someone's application is a real-world consequence worth
// requiring verification for.
router.post("/jobs", authenticate, authorizeEmployer, createJob);
router.put("/jobs/:jobId", authenticate, authorizeEmployer, editJob);
router.patch("/jobs/:jobId", authenticate, authorizeEmployer, editJob);
router.patch("/applications/:applicationId/status", authenticate, authorizeEmployer, updateApplication);
router.delete("/jobs/:jobId", authenticate, authorizeEmployer, deleteJob);

// Read-only views of an employer's OWN data — previously gated by the same
// verification-required `authorizeEmployer` as the mutating routes above,
// which meant a brand-new, not-yet-KYC-verified employer got a 403 loading
// their own dashboard stats / job list (while /profile, /candidates and
// /interviews — same kind of own-data read — worked fine, since those
// already used the weaker `authorizeRoles("employer")`). Viewing your own
// account isn't a consequential action; verification shouldn't gate it.
// Switched to `authorizeRoles("employer")` to match its sibling read routes
// and stop that inconsistent 403.
router.get("/jobs/:jobId/jobseekers", authenticate, authorizeRoles("employer"), getAppliedJobseekers);
router.get("/my-jobs", authenticate, authorizeRoles("employer"), getEmployerJobs);
router.get("/dashboard-stats", authenticate, authorizeRoles("employer"), getEmployerDashboardStats);
router.get("/my-jobs/applications", authenticate, authorizeRoles("employer"), getAllApplicantsForEmployer);
router.get("/my-jobs/applicants", authenticate, authorizeRoles("employer"), getAllApplicantsForEmployerJobs);
router.patch("/notification-preferences", authenticate, authorizeRoles("employer"), updateNotificationPreferences);
router.post("/deactivate", authenticate, authorizeRoles("employer"), deactivateAccount);
router.get("/candidates", authenticate, authorizeRoles("employer"), getCandidates);
router.post("/candidates/:candidateId/save", authenticate, authorizeRoles("employer"), toggleSavedCandidate);
router.get("/candidates/saved", authenticate, authorizeRoles("employer"), getSavedCandidates);
router.get("/interviews", authenticate, authorizeRoles("employer"), getScheduledInterviews);

module.exports = router;