import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getSubscriptionPlans,
  getSubscriptionStatus,
  createRazorpayOrder,
  verifyPayment,
  activateTestSubscription,
  cancelSubscription
} from "../controllers/subscriptionController.js";

const router = express.Router();

// Public plan metadata
router.get("/plans", getSubscriptionPlans);

// Authenticated subscription endpoints
router.get("/status", protect, getSubscriptionStatus);
router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify-payment", protect, verifyPayment);
router.post("/test-upgrade", protect, activateTestSubscription);
router.post("/cancel", protect, cancelSubscription);

export default router;
