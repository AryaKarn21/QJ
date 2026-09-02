const express = require("express");
const router = express.Router();
const { authenticate, authenticateOptional } = require("../middleware/authMiddleware");
const applicationUpload = require("../middleware/applicationUploadMiddleware");
const {
  getJobs,
  getTrendingJobs,
  getRecentJobs,
  getJobCountsByCountry,
  getCountryList,
  applyInJob,
  getJobById,
  getJobViews,
  likeJob,
  dislikeJob,
  saveJob,
  getSavedJobs,
  getAppliedJobs
} = require("../controllers/jobController");

// These three (and "/:id" below) all compute `isSaved` from
// `req.user?.savedJobs` in the controller (see jobController.js) — that
// only ever worked if a request happened to carry a decoded user, which
// nothing here was doing (no auth middleware at all) until this fix.
// `authenticateOptional` attaches `req.user` for a logged-in caller and
// simply continues as anonymous for everyone else — public access is
// unchanged.

// Route to get all jobs
router.get("/", authenticateOptional, getJobs);

// Route to get trending jobs
router.get("/trending", authenticateOptional, getTrendingJobs);

// Route to get recent jobs
router.get("/recent", authenticateOptional, getRecentJobs);


// Get job counts by country
router.get("/counts-by-country", getJobCountsByCountry);

// The single list of countries a job can target — must be registered
// before "/:id" below, or Express would match "meta" as an :id param.
router.get("/meta/countries", getCountryList);

// Get saved jobs for a jobseeker
router.get("/saved-jobs", authenticate, getSavedJobs);

// Get applied jobs for a jobseeker
router.get("/applied-jobs", authenticate, getAppliedJobs);

// Apply to a job
router.post("/apply", authenticate, applicationUpload, applyInJob);

// Like route
router.post("/:id/like", authenticate, likeJob);

//Dislike route
router.post("/:id/dislike", authenticate, dislikeJob);

// Save a job route
router.patch("/:id/save", authenticate, saveJob);

// Route to get a job by ID
router.get("/:id", authenticateOptional, getJobById);

//Route to get job views
router.get("/:id/views", getJobViews);

module.exports = router;