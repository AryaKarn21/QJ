const express = require("express");
const router = express.Router();
const { getPublicStats } = require("../controllers/statsController");

// Public — no authentication. Aggregate counts only, see statsController.js.
router.get("/public", getPublicStats);

module.exports = router;
