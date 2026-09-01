const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const applicationUpload = require("../middleware/applicationUploadMiddleware");
const {
  getJobs,
  getTrendingJobs,
  getRecentJobs,
  getJobCountsByCountry,
  applyInJob,
  getJobById,
  getJobViews,
  likeJob,
  dislikeJob,
  saveJob,
  getSavedJobs,
  getAppliedJobs
} = require("../controllers/jobController");

// Route to get all jobs
router.get("/", getJobs);

// Route to get trending jobs
router.get("/trending", getTrendingJobs);

// Route to get recent jobs
router.get("/recent", getRecentJobs);


// Get job counts by country
router.get("/counts-by-country", getJobCountsByCountry);

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
router.get("/:id", getJobById);

//Route to get job views
router.get("/:id/views", getJobViews);

module.exports = router;