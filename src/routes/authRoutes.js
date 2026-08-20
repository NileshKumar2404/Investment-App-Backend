import express from "express";

import {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  logoutAllDevices,
  getSessions,
  revokeSession,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/refresh", refreshToken);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

// ============================================================
// AUTHENTICATED ROUTES
// ============================================================

router.get("/me", protect, getMe);

router.post("/logout", protect, logoutUser);

router.post("/logout-all", protect, logoutAllDevices);

router.post("/change-password", protect, changePassword);

// ============================================================
// SESSION MANAGEMENT
// ============================================================

router.get("/sessions", protect, getSessions);

router.delete("/sessions/:sessionId", protect, revokeSession);

export default router;
