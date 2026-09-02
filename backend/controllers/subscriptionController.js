const crypto = require("crypto");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Payment = require("../models/Payment");
const User = require("../models/User");
const sendNotification = require("../utils/sendNotifications");
const { recordAudit } = require("../utils/auditLogger");
const esewaService = require("../services/payment/esewaService");
const khaltiService = require("../services/payment/khaltiService");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

// ── Plan CRUD (admin) ─────────────────────────────────────────────────────

exports.createPlan = async (req, res) => {
  try {
    const { name, role, description, price, currency, billingCycle, features, isActive } = req.body;
    if (!name || !role || price == null || !billingCycle) {
      return res.status(400).json({ message: "name, role, price and billingCycle are required" });
    }
    const plan = await Plan.create({
      name, role, description, price, currency, billingCycle,
      features: Array.isArray(features) ? features : [],
      isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json(plan);
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).json({ message: "Error creating plan" });
  }
};

exports.getPlans = async (req, res) => {
  try {
    const { role, includeInactive } = req.query;
    const filter = {};
    if (!includeInactive) filter.isActive = true;
    if (role) filter.role = { $in: [role, "both"] };
    const plans = await Plan.find(filter).sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ message: "Error fetching plans" });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json(plan);
  } catch (error) {
    console.error("Error fetching plan:", error);
    res.status(500).json({ message: "Error fetching plan" });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json(plan);
  } catch (error) {
    console.error("Error updating plan:", error);
    res.status(500).json({ message: "Error updating plan" });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const activeCount = await Subscription.countDocuments({ plan: req.params.id, status: "active" });
    if (activeCount > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${activeCount} user(s) are actively subscribed to this plan. Deactivate it instead.`,
      });
    }
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan deleted" });
  } catch (error) {
    console.error("Error deleting plan:", error);
    res.status(500).json({ message: "Error deleting plan" });
  }
};

// ── My subscription ─────────────────────────────────────────────────────

exports.getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id, status: "active" })
      .populate("plan")
      .sort({ createdAt: -1 });
    res.json({ subscription: subscription || null });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ message: "Error fetching subscription" });
  }
};

exports.getMyPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate("plan", "name billingCycle")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(payments);
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ message: "Error fetching payment history" });
  }
};

// ── Checkout ──────────────────────────────────────────────────────────────

exports.initiateCheckout = async (req, res) => {
  try {
    const { planId, gateway } = req.body;
    if (!["esewa", "khalti"].includes(gateway)) {
      return res.status(400).json({ message: "gateway must be 'esewa' or 'khalti'" });
    }
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: "Plan not found or inactive" });
    }
    if (plan.role !== "both" && plan.role !== req.user.role) {
      return res.status(403).json({ message: "This plan is not available for your account type" });
    }

    const referenceId = `QJ-${req.user._id}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const subscription = await Subscription.create({
      user: req.user._id, plan: plan._id, status: "pending", gateway, autoRenew: false,
    });

    const payment = await Payment.create({
      user: req.user._id, subscription: subscription._id, plan: plan._id,
      amount: plan.price, currency: plan.currency, gateway, referenceId, status: "initiated",
    });

    if (gateway === "esewa") {
      const { gatewayUrl, fields } = esewaService.buildFormPayload({
        amount: plan.price,
        referenceId,
        successUrl: `${BACKEND_URL}/api/subscriptions/verify/esewa`,
        failureUrl: `${FRONTEND_URL}/subscription/callback?gateway=esewa&status=failed`,
      });
      return res.status(200).json({ gateway: "esewa", redirectMethod: "form-post", gatewayUrl, fields, referenceId });
    }

    const khaltiResponse = await khaltiService.initiatePayment({
      amountPaisa: Math.round(plan.price * 100),
      referenceId,
      returnUrl: `${FRONTEND_URL}/subscription/callback?gateway=khalti&referenceId=${referenceId}`,
      websiteUrl: FRONTEND_URL,
      purchaseOrderName: `${plan.name} (${plan.billingCycle})`,
      customerInfo: { name: req.user.name || "QuickJobs User", email: req.user.email },
    });

    payment.gatewayTransactionId = khaltiResponse.pidx;
    await payment.save();

    return res.status(200).json({
      gateway: "khalti", redirectMethod: "redirect", paymentUrl: khaltiResponse.payment_url, referenceId,
    });
  } catch (error) {
    console.error("Checkout initiation failed:", error);
    res.status(500).json({ message: "Error initiating checkout" });
  }
};

// Real event → admin notification, matching the same "notify every admin
// (and superadmin)" pattern userController.js/employerController.js use for
// registrations and new job postings. Fire-and-forget on purpose (same as
// every other sendNotification call site) — a notification failure must
// never fail the payment-verification response.
async function notifyAdminsOfPaymentFailure(payment, gateway) {
  try {
    await sendNotification.notifyAllAdmins({
      type: "subscription_payment_failed",
      message: `A ${gateway} payment attempt (ref ${payment.referenceId}) failed to complete.`,
      relatedPayment: payment._id,
      link: "/admin/subscriptions",
    });
  } catch (err) {
    console.error("Failed to notify admins of payment failure:", err);
  }
}

async function activateSubscription(payment, subscription, plan) {
  const startDate = new Date();
  const endDate = new Date(startDate);
  if (plan.billingCycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
  else endDate.setMonth(endDate.getMonth() + 1);

  subscription.status = "active";
  subscription.startDate = startDate;
  subscription.endDate = endDate;
  subscription.lastPayment = payment._id;
  await subscription.save();

  payment.status = "success";
  await payment.save();

  // /subscription (bare) isn't a registered route — SubscriptionPage.tsx
  // is mounted role-scoped at /user/subscription and /employer/subscription
  // (see App.tsx) — so this notification's link needs the subscriber's role.
  const subscriber = await User.findById(subscription.user).select("role").lean();
  const subscriptionLink = subscriber?.role === "employer" ? "/employer/subscription" : "/user/subscription";

  await sendNotification({
    recipient: subscription.user,
    type: "subscription_activated",
    message: `Your "${plan.name}" subscription is now active until ${endDate.toDateString()}.`,
    relatedSubscription: subscription._id,
    relatedPayment: payment._id,
    link: subscriptionLink,
  });

  await recordAudit({
    actor: { id: subscription.user },
    module: "subscription",
    action: "subscription_activated",
    success: true,
    targetId: subscription._id,
    targetType: "Subscription",
    metadata: { planId: plan._id, gateway: payment.gateway, amount: payment.amount },
  });
}

exports.verifyEsewaCallback = async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.redirect(`${FRONTEND_URL}/subscription/callback?gateway=esewa&status=failed`);

    const decoded = esewaService.decodeAndVerifySignature(data);
    if (!decoded || decoded.status !== "COMPLETE") {
      return res.redirect(`${FRONTEND_URL}/subscription/callback?gateway=esewa&status=failed`);
    }

    const payment = await Payment.findOne({ referenceId: decoded.transaction_uuid });
    if (!payment) return res.redirect(`${FRONTEND_URL}/subscription/callback?gateway=esewa&status=failed`);
    if (payment.status === "success") {
      return res.redirect(`${FRONTEND_URL}/subscription/callback?gateway=esewa&status=success`);
    }

    const statusCheck = await esewaService.verifyTransactionStatus({
      referenceId: payment.referenceId, amount: payment.amount,
    });

    if (statusCheck.status !== "COMPLETE") {
      payment.status = "failed";
      payment.gatewayResponse = statusCheck;
      await payment.save();
      notifyAdminsOfPaymentFailure(payment, "eSewa");
      return res.redirect(`${FRONTEND_URL}/subscription/callback?gateway=esewa&status=failed`);
    }

    payment.gatewayTransactionId = statusCheck.ref_id || null;
    payment.gatewayResponse = statusCheck;

    const [subscription, plan] = await Promise.all([
      Subscription.findById(payment.subscription),
      Plan.findById(payment.plan),
    ]);

    await activateSubscription(payment, subscription, plan);

    return res.redirect(`${FRONTEND_URL}/subscription/callback?gateway=esewa&status=success`);
  } catch (error) {
    console.error("eSewa verification failed:", error);
    return res.redirect(`${FRONTEND_URL}/subscription/callback?gateway=esewa&status=failed`);
  }
};

exports.verifyKhaltiCallback = async (req, res) => {
  try {
    const { pidx } = req.body;
    if (!pidx) return res.status(400).json({ message: "pidx is required" });

    const payment = await Payment.findOne({ gatewayTransactionId: pidx });
    if (!payment) return res.status(404).json({ message: "Payment record not found" });
    if (payment.status === "success") return res.json({ status: "success" });

    const lookup = await khaltiService.lookupPayment(pidx);

    if (lookup.status !== "Completed") {
      payment.status = "failed";
      payment.gatewayResponse = lookup;
      await payment.save();
      notifyAdminsOfPaymentFailure(payment, "Khalti");
      return res.status(200).json({ status: "failed", detail: lookup.status });
    }

    payment.gatewayResponse = lookup;

    const [subscription, plan] = await Promise.all([
      Subscription.findById(payment.subscription),
      Plan.findById(payment.plan),
    ]);

    await activateSubscription(payment, subscription, plan);

    return res.json({ status: "success" });
  } catch (error) {
    console.error("Khalti verification failed:", error);
    res.status(500).json({ message: "Error verifying payment" });
  }
};

exports.cancelMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id, status: "active" });
    if (!subscription) return res.status(404).json({ message: "No active subscription found" });
    subscription.status = "cancelled";
    subscription.autoRenew = false;
    await subscription.save();
    res.json({ message: "Subscription cancelled", subscription });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Error cancelling subscription" });
  }
};

exports.adminGetAllSubscriptions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const subscriptions = await Subscription.find(filter)
      .populate("user", "name email role")
      .populate("plan", "name price billingCycle")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Subscription.countDocuments(filter);
    res.json({ subscriptions, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ message: "Error fetching subscriptions" });
  }
};

/**
 * GET /api/subscriptions/admin/:id — admin only. Full subscription detail
 * plus its payment history, for the Subscription Details view.
 */
exports.adminGetSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate("user", "name email role")
      .populate("plan");
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    const payments = await Payment.find({ subscription: subscription._id }).sort({ createdAt: -1 });

    res.json({ subscription, payments });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ message: "Error fetching subscription" });
  }
};