const express = require("express");
const router = express.Router();
const revenueController = require("../controllers/revenueController");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");

// Revenue records are platform financial data — admin/superadmin only.
// (Previously these routes had no auth at all: anyone could read every
// employer's payment history, or create/edit/delete revenue entries.)
router.get("/allemployers", authenticate, authorizeAdmin, revenueController.getEmployerJobs);
router.get("/employer/:employerId/jobs", authenticate, authorizeAdmin, revenueController.getJobsByEmployer);
router.get("/", authenticate, authorizeAdmin, revenueController.getAllRevenue);
router.post("/", authenticate, authorizeAdmin, revenueController.addRevenue);
router.put("/:id", authenticate, authorizeAdmin, revenueController.editRevenue);
router.delete("/:id", authenticate, authorizeAdmin, revenueController.deleteRevenue);

module.exports = router;