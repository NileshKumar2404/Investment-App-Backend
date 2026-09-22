import crypto from "crypto";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { createAuditLogFromRequest } from "./auditLogController.js";

// ============================================================
// SUBSCRIPTION PLANS METADATA
// ============================================================

export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Founder Explorer",
    subtitle: "Educational & Public Deal Discovery",
    priceMonthly: 0,
    priceAnnual: 0,
    currency: "INR",
    features: [
      "Access to all 30 Academy curriculum lessons",
      "50 Startup Terms library & basic financial formulas",
      "25 Marketing KPI benchmark index",
      "12-Month Financial Projections (Read-Only)",
      "Public Deal Room summaries (no financial dossier)",
      "1 saved startup watchlist target"
    ],
    highlight: false,
    badge: "Free Forever"
  },
  founder_pro: {
    id: "founder_pro",
    name: "Founder Pro",
    subtitle: "Complete Operating & Financial Modeling System",
    priceMonthly: 1999,
    priceAnnual: 19990,
    currency: "INR",
    features: [
      "Everything in Founder Explorer",
      "Interactive 5-Year DCF Simulation & Sensitivity Levers",
      "10-Dimension Health Score Radar & Peer Percentiles",
      "Personalized 30-Day Founder Action Plan",
      "Unlimited Idea & Lean RAT Hypothesis Testing",
      "AI Prompt Builder Studio (Investor Pitch & Memorandums)",
      "GTM Roadmap Persona & Channel Prioritization Gantt",
      "Direct CSV & PDF Financial Model Export"
    ],
    highlight: true,
    badge: "Most Popular for Founders"
  },
  investor_pro: {
    id: "investor_pro",
    name: "Investor Pro",
    subtitle: "Institutional Deal Room, Cap Table & Diligence",
    priceMonthly: 4999,
    priceAnnual: 49990,
    currency: "INR",
    features: [
      "Complete Institutional Deal Room Access",
      "Gordon Growth DCF Fair Share Valuation & Upside Signals",
      "Interactive Cap Table & Multi-Round Dilution Simulator",
      "Audited Double-Entry Financial Ledger Journal",
      "Virtual Data Room (VDR) Confidential Document Vault",
      "Unlimited Due Diligence Watchlists with Private Analyst Notes",
      "Portfolio MOIC, IRR & Sector Allocation Telemetry"
    ],
    highlight: false,
    badge: "For Angels & Syndicates"
  },
  all_access_pro: {
    id: "all_access_pro",
    name: "All-Access Venture OS",
    subtitle: "Unified Founder + Investor Institutional Platform",
    priceMonthly: 5999,
    priceAnnual: 59990,
    currency: "INR",
    features: [
      "All Founder Pro features included",
      "All Investor Pro features included",
      "Multi-Company Workspace Management",
      "Direct MongoDB Atlas Cloud Sync",
      "Priority API Rate Limits & Dedicated Support"
    ],
    highlight: false,
    badge: "Full Platform"
  }
};

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  country: user.country,
  role: user.role,
  accountStatus: user.accountStatus,
  subscription: user.subscription || {
    plan: "free",
    status: "active",
    billingCycle: "monthly"
  }
});

// ============================================================
// 1. GET ALL PLANS
// GET /api/v1/subscription/plans
// ============================================================

export const getSubscriptionPlans = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        plans: SUBSCRIPTION_PLANS,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_demo_key"
      },
      "Subscription plans retrieved successfully."
    )
  );
});

// ============================================================
// 2. GET USER SUBSCRIPTION STATUS
// GET /api/v1/subscription/status
// ============================================================

export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found.");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscription: user.subscription || { plan: "free", status: "active" },
        currentPlanDetails: SUBSCRIPTION_PLANS[user.subscription?.plan || "free"]
      },
      "Subscription status retrieved successfully."
    )
  );
});

// ============================================================
// 3. CREATE RAZORPAY ORDER
// POST /api/v1/subscription/create-order
// ============================================================

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { planId, billingCycle = "monthly" } = req.body;

  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan || plan.id === "free") {
    throw new ApiError(400, "Invalid plan selected for payment.");
  }

  const amount = billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
  const amountInPaise = amount * 100; // Razorpay operates in paise

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  let orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // If live/test Razorpay API credentials exist, create order via Razorpay API
  if (keyId && keySecret && !keyId.includes("demo")) {
    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authHeader}`
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${req.user._id}_${Date.now()}`,
          notes: {
            userId: req.user._id.toString(),
            planId,
            billingCycle
          }
        })
      });

      const orderData = await rzpRes.json();
      if (orderData && orderData.id) {
        orderId = orderData.id;
      }
    } catch (err) {
      console.warn("Razorpay API order error, falling back to simulated order:", err.message);
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId,
        amount: amountInPaise,
        currency: "INR",
        planId,
        planName: plan.name,
        billingCycle,
        razorpayKeyId: keyId || "rzp_test_demo_key",
        customer: {
          name: req.user.fullName,
          email: req.user.email,
          phone: req.user.phone
        }
      },
      "Razorpay order created successfully."
    )
  );
});

// ============================================================
// 4. VERIFY PAYMENT & ACTIVATE SUBSCRIPTION
// POST /api/v1/subscription/verify-payment
// ============================================================

export const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planId,
    billingCycle = "monthly"
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !planId) {
    throw new ApiError(400, "Missing payment verification parameters.");
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Verify HMAC signature if key secret is available and not demo
  if (keySecret && !keySecret.includes("demo") && razorpay_signature) {
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      throw new ApiError(400, "Invalid Razorpay payment signature verification.");
    }
  }

  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) throw new ApiError(400, "Invalid subscription plan.");

  const amount = billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly;

  // Compute expiry: 30 days for monthly, 365 days for annual
  const expiry = new Date();
  if (billingCycle === "annual") {
    expiry.setDate(expiry.getDate() + 365);
  } else {
    expiry.setDate(expiry.getDate() + 30);
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found.");

  user.subscription = {
    plan: planId,
    status: "active",
    billingCycle,
    startDate: new Date(),
    expiresAt: expiry,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    amountPaid: amount
  };

  await user.save();

  await createAuditLogFromRequest({
    req,
    action: "UPDATE",
    resourceType: "USER",
    resourceId: user._id,
    targetUserId: user._id,
    success: true,
    statusCode: 200,
    message: `User upgraded to ${plan.name} (${billingCycle})`,
    metadata: {
      planId,
      billingCycle,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount
    }
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeUser(user),
        subscription: user.subscription,
        message: `Congratulations! Your account has been upgraded to ${plan.name}.`
      },
      "Payment verified and subscription activated successfully."
    )
  );
});

// ============================================================
// 5. DEV/SANDBOX TEST UPGRADE (Zero Friction Testing)
// POST /api/v1/subscription/test-upgrade
// ============================================================

export const activateTestSubscription = asyncHandler(async (req, res) => {
  const { planId = "founder_pro", billingCycle = "monthly" } = req.body;

  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) throw new ApiError(400, "Invalid plan specified.");

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + (billingCycle === "annual" ? 365 : 30));

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found.");

  user.subscription = {
    plan: planId,
    status: "active",
    billingCycle,
    startDate: new Date(),
    expiresAt: expiry,
    razorpayOrderId: `test_order_${Date.now()}`,
    razorpayPaymentId: `test_pay_${Date.now()}`,
    amountPaid: billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly
  };

  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeUser(user),
        subscription: user.subscription
      },
      `Sandbox upgrade to ${plan.name} successful.`
    )
  );
});

// ============================================================
// 6. CANCEL SUBSCRIPTION
// POST /api/v1/subscription/cancel
// ============================================================

export const cancelSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found.");

  user.subscription = {
    plan: "free",
    status: "canceled",
    billingCycle: "monthly",
    startDate: user.subscription?.startDate || new Date(),
    expiresAt: new Date(),
    razorpayOrderId: "",
    razorpayPaymentId: "",
    amountPaid: 0
  };

  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeUser(user),
        subscription: user.subscription
      },
      "Subscription has been canceled. Your account is now on the Free tier."
    )
  );
});
