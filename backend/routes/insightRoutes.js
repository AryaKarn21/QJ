const express = require("express");
const router = express.Router();
const { authenticate, authorizeEmployer, authorizeAdmin } = require("../middleware/authMiddleware");

const { getJobStats, getJobConversionRates, getJobPostComparison, getDashboardStats, getAllJobStatsByDate} = require('../controllers/insightController');
  
  router.get('/job-stats', authenticate, authorizeEmployer,  getJobStats);
  router.get('/dashboard-stats', authenticate, authorizeEmployer,  getDashboardStats);
  router.get('/conversion-rates', authenticate, authorizeEmployer, getJobConversionRates);
  router.get('/job-comparison', authenticate, authorizeEmployer, getJobPostComparison);
  router.get('/all-job-stats', authenticate, authorizeAdmin, getAllJobStatsByDate);
  
  module.exports = router;