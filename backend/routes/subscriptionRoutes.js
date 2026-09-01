const express = require("express");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");
const sub = require("../controllers/subscriptionController");

router.get("/plans", sub.getPlans);
router.get("/plans/:id", sub.getPlanById);
router.post("/plans", authenticate, authorizeAdmin, sub.createPlan);
router.put("/plans/:id", authenticate, authorizeAdmin, sub.updatePlan);
router.delete("/plans/:id", authenticate, authorizeAdmin, sub.deletePlan);

router.get("/me", authenticate, sub.getMySubscription);
router.get("/me/payments", authenticate, sub.getMyPaymentHistory);
router.post("/checkout", authenticate, sub.initiateCheckout);
router.post("/cancel", authenticate, sub.cancelMySubscription);

router.get("/verify/esewa", sub.verifyEsewaCallback);
router.post("/verify/khalti", authenticate, sub.verifyKhaltiCallback);

router.get("/admin/all", authenticate, authorizeAdmin, sub.adminGetAllSubscriptions);
router.get("/admin/:id", authenticate, authorizeAdmin, sub.adminGetSubscriptionById);

module.exports = router;