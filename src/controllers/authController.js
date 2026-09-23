import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";
import Session from "../models/session.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

import { createAuditLogFromRequest } from "./auditLogController.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "investment_os_super_secret_jwt_key_2026";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";

const REFRESH_TOKEN_EXPIRES_DAYS = Number(
  process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30,
);

// ============================================================
// TOKEN HELPERS
// ============================================================

const generateAccessToken = (userId, sessionId) => {
  return jwt.sign(
    {
      id: userId.toString(),
      sessionId: sessionId.toString(),
      type: "access",
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const getRefreshTokenExpiry = () => {
  const expiry = new Date();

  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  return expiry;
};

// ============================================================
// USER RESPONSE SANITIZER
// ============================================================

const sanitizeUser = (user) => ({
  id: user._id,

  fullName: user.fullName,

  email: user.email,

  phone: user.phone,

  country: user.country,

  city: user.city,

  timezone: user.timezone,

  language: user.language,

  currency: user.currency,

  occupation: user.occupation,

  company: user.company,

  position: user.position,

  role: user.role,

  accountStatus: user.accountStatus,

  verified: user.verified,

  loginCount: user.loginCount,

  lastLogin: user.lastLogin,

  avatarUrl: user.avatarUrl,

  createdAt: user.createdAt,

  updatedAt: user.updatedAt,

  subscription: user.subscription || {
    plan: "free",
    status: "active",
    billingCycle: "monthly"
  },

  onboarding: user.onboarding || {
    completed: false,
    investmentKnowledge: "",
    experienceYears: "",
    primaryObjective: "",
    assignedWorkspace: user.role || "founder",
    assignedTab: "overview",
    routingReason: "",
  },
});

// ============================================================
// CREATE SESSION
// ============================================================

const createSession = async ({ user, req }) => {
  const refreshToken = generateRefreshToken();

  const session = await Session.create({
    userId: user._id,

    refreshTokenHash: hashToken(refreshToken),

    expiresAt: getRefreshTokenExpiry(),

    deviceId: req.headers["x-device-id"] || "",

    deviceName: req.headers["x-device-name"] || "Unknown Device",

    ipAddress: req.ip || req.headers["x-forwarded-for"] || "",

    userAgent: req.headers["user-agent"] || "",

    lastUsedAt: new Date(),
  });

  const accessToken = generateAccessToken(user._id, session._id);

  return {
    accessToken,
    refreshToken,
    session,
  };
};

// ============================================================
// REGISTER
// POST /api/v1/auth/register
// ============================================================

export const registerUser = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, country, language, currency, role } =
    req.body;

  // --------------------------------------------------------
  // VALIDATION
  // --------------------------------------------------------

  if (!email || !password || !fullName) {
    throw new ApiError(400, "Please provide email, password and full name.");
  }

  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  // --------------------------------------------------------
  // CHECK EXISTING USER
  // --------------------------------------------------------

  const userExists = await User.findOne({
    email: normalizedEmail,
  });

  if (userExists) {
    throw new ApiError(409, "User with this email already exists.");
  }

  // --------------------------------------------------------
  // CREATE USER
  // --------------------------------------------------------

  /**
   * Public registration supports founder, investor,
   * analyst, and advisor roles. Admin and Super Admin
   * must never be self-assigned.
   */
  const allowedRoles = ["founder", "investor", "analyst", "advisor"];
  const assignedRole = role && allowedRoles.includes(role.toLowerCase()) ? role.toLowerCase() : "founder";

  const user = await User.create({
    email: normalizedEmail,

    password,

    fullName: fullName.trim(),

    phone: phone || "-",

    country: country || "India",

    language: language || "English",

    currency: currency || "INR",

    role: assignedRole,

    accountStatus: "Active",

    verified: false,

    loginCount: 0,

    lastLogin: new Date(),
  });

  // --------------------------------------------------------
  // CREATE SESSION
  // --------------------------------------------------------

  const { accessToken, refreshToken, session } = await createSession({
    user,
    req,
  });

  await createAuditLogFromRequest({
    req,
    action: "REGISTER",
    resourceType: "USER",
    resourceId: user._id,
    targetUserId: user._id,
    success: true,
    statusCode: 201,
    message: "User registered successfully",
    metadata: {
      email: user.email,
      role: user.role,
    },
  });

  // --------------------------------------------------------
  // RESPONSE
  // --------------------------------------------------------

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        accessToken,

        token: accessToken,

        refreshToken,

        sessionId: session._id,

        user: sanitizeUser(user),
      },
      "User registered successfully.",
    ),
  );
});

// ============================================================
// LOGIN
// POST /api/v1/auth/login
// ============================================================

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // --------------------------------------------------------
  // VALIDATION
  // --------------------------------------------------------

  if (!email || !password) {
    throw new ApiError(400, "Please provide email and password.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  // --------------------------------------------------------
  // FIND USER
  // --------------------------------------------------------

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  // --------------------------------------------------------
  // VERIFY PASSWORD
  // --------------------------------------------------------

  const passwordMatches = await user.matchPassword(password);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password.");
  }

  // --------------------------------------------------------
  // ACCOUNT STATUS
  // --------------------------------------------------------

  if (user.accountStatus !== "Active") {
    throw new ApiError(
      403,
      "Your account is inactive. Please contact an administrator.",
    );
  }

  // --------------------------------------------------------
  // UPDATE LOGIN INFORMATION
  // --------------------------------------------------------

  user.loginCount = (user.loginCount || 0) + 1;

  user.lastLogin = new Date();

  await user.save();

  // --------------------------------------------------------
  // CREATE SESSION
  // --------------------------------------------------------

  const { accessToken, refreshToken, session } = await createSession({
    user,
    req,
  });

  await createAuditLogFromRequest({
    req,
    action: "LOGIN",
    resourceType: "SESSION",
    resourceId: session._id,
    targetUserId: user._id,
    success: true,
    statusCode: 200,
    message: "User logged in successfully",
    metadata: {
      sessionId: session._id,
      deviceId: req.headers["x-device-id"] || null,
      deviceName: req.headers["x-device-name"] || null,
    },
  });

  // --------------------------------------------------------
  // RESPONSE
  // --------------------------------------------------------

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken,

        token: accessToken,

        refreshToken,

        sessionId: session._id,

        user: sanitizeUser(user),
      },
      "User logged in successfully.",
    ),
  );
});

// ============================================================
// GET CURRENT USER
// GET /api/v1/auth/me
// ============================================================

export const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated.");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.accountStatus !== "Active") {
    throw new ApiError(403, "Your account is inactive.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        sanitizeUser(user),
        "User profile fetched successfully.",
      ),
    );
});

// ============================================================
// LOGOUT CURRENT SESSION
// POST /api/v1/auth/logout
// ============================================================

export const logoutUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required.");
  }

  if (req.sessionId) {
    await Session.findOneAndUpdate(
      {
        _id: req.sessionId,

        userId: req.user._id,

        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),

          revokedReason: "USER_LOGOUT",

          lastUsedAt: new Date(),
        },
      },
    );
  }

  await createAuditLogFromRequest({
    req,
    action: "LOGOUT",
    resourceType: "SESSION",
    resourceId: req.sessionId || null,
    targetUserId: req.user._id,
    success: true,
    statusCode: 200,
    message: "User logged out successfully",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully."));
});

// ============================================================
// LOGOUT ALL DEVICES
// POST /api/v1/auth/logout-all
// ============================================================

export const logoutAllDevices = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required.");
  }

  await Session.updateMany(
    {
      userId: req.user._id,

      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),

        revokedReason: "LOGOUT_ALL_DEVICES",
      },
    },
  );

  await createAuditLogFromRequest({
    req,
    action: "LOGOUT_ALL",
    resourceType: "SESSION",
    targetUserId: req.user._id,
    success: true,
    statusCode: 200,
    message: "All active sessions were logged out",
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "All active sessions have been logged out."),
    );
});

// ============================================================
// GET ACTIVE SESSIONS
// GET /api/v1/auth/sessions
// ============================================================

export const getSessions = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required.");
  }

  const sessions = await Session.find({
    userId: req.user._id,

    revokedAt: null,

    expiresAt: {
      $gt: new Date(),
    },
  })
    .select("-refreshTokenHash")
    .sort({
      lastUsedAt: -1,
    });

  return res
    .status(200)
    .json(
      new ApiResponse(200, sessions, "Active sessions fetched successfully."),
    );
});

// ============================================================
// REVOKE SINGLE SESSION
// DELETE /api/v1/auth/sessions/:sessionId
// ============================================================

export const revokeSession = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required.");
  }

  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ApiError(400, "Session ID is required.");
  }

  const session = await Session.findOne({
    _id: sessionId,

    userId: req.user._id,

    revokedAt: null,
  });

  if (!session) {
    throw new ApiError(404, "Session not found.");
  }

  session.revokedAt = new Date();

  session.revokedReason = "USER_REVOKED";

  await session.save();

  await createAuditLogFromRequest({
    req,
    action: "REVOKE_SESSION",
    resourceType: "SESSION",
    resourceId: session._id,
    targetUserId: req.user._id,
    success: true,
    statusCode: 200,
    message: "Session revoked successfully",
    metadata: {
      revokedReason: "USER_REVOKED",
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Session revoked successfully."));
});

// ============================================================
// CHANGE PASSWORD
// POST /api/v1/auth/change-password
// ============================================================

export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!req.user) {
    throw new ApiError(401, "Authentication required.");
  }

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required.");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters long.");
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const passwordMatches = await user.matchPassword(oldPassword);

  if (!passwordMatches) {
    throw new ApiError(401, "Incorrect old password.");
  }

  // --------------------------------------------------------
  // CHANGE PASSWORD
  // --------------------------------------------------------

  user.password = newPassword;

  await user.save();

  // --------------------------------------------------------
  // INVALIDATE ALL SESSIONS
  // --------------------------------------------------------

  await Session.updateMany(
    {
      userId: user._id,

      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),

        revokedReason: "PASSWORD_CHANGED",
      },
    },
  );

  await createAuditLogFromRequest({
    req,
    action: "CHANGE_PASSWORD",
    resourceType: "USER",
    resourceId: user._id,
    targetUserId: user._id,
    success: true,
    statusCode: 200,
    message: "User password changed successfully",
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Password changed successfully. Please login again on all devices.",
      ),
    );
});

// ============================================================
// FORGOT PASSWORD
// POST /api/v1/auth/forgot-password
// ============================================================

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Please provide email address.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  });

  /**
   * Always return the same
   * response whether the account
   * exists or not.
   *
   * This prevents email enumeration.
   */
  if (!user) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "If that email is registered, password reset instructions will be sent.",
        ),
      );
  }

  // --------------------------------------------------------
  // GENERATE RESET TOKEN
  // --------------------------------------------------------

  const resetToken = crypto.randomBytes(32).toString("hex");

  const resetTokenHash = hashToken(resetToken);

  user.passwordResetToken = resetTokenHash;

  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

  await user.save({
    validateBeforeSave: false,
  });

  /**
   * IMPORTANT:
   *
   * We deliberately do not return
   * the reset token in production.
   *
   * An email service should send
   * the raw token to the user.
   */
  console.log(`Password reset requested for ${normalizedEmail}`);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "If that email is registered, password reset instructions will be sent.",
      ),
    );
});

// ============================================================
// RESET PASSWORD
// POST /api/v1/auth/reset-password
// ============================================================

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, resetToken, newPassword } = req.body;

  if (!email || !resetToken || !newPassword) {
    throw new ApiError(
      400,
      "Email, reset token and new password are required.",
    );
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters long.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const resetTokenHash = hashToken(resetToken);

  const user = await User.findOne({
    email: normalizedEmail,

    passwordResetToken: resetTokenHash,

    passwordResetExpires: {
      $gt: new Date(),
    },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    throw new ApiError(400, "Invalid or expired password reset token.");
  }

  // --------------------------------------------------------
  // RESET PASSWORD
  // --------------------------------------------------------

  user.password = newPassword;

  user.passwordResetToken = undefined;

  user.passwordResetExpires = undefined;

  await user.save();

  // --------------------------------------------------------
  // REVOKE ALL EXISTING SESSIONS
  // --------------------------------------------------------

  await Session.updateMany(
    {
      userId: user._id,

      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),

        revokedReason: "PASSWORD_RESET",
      },
    },
  );

  await createAuditLogFromRequest({
    req,
    action: "RESET_PASSWORD",
    resourceType: "USER",
    resourceId: user._id,
    targetUserId: user._id,
    success: true,
    statusCode: 200,
    message: "User password reset successfully",
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Password reset successfully. Please login again.",
      ),
    );
});

// ============================================================
// REFRESH ACCESS TOKEN
// POST /api/v1/auth/refresh
// ============================================================

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: rawRefreshToken } = req.body;

  if (!rawRefreshToken) {
    throw new ApiError(401, "Refresh token is required.");
  }

  // --------------------------------------------------------
  // HASH INCOMING TOKEN
  // --------------------------------------------------------

  const refreshTokenHash = hashToken(rawRefreshToken);

  // --------------------------------------------------------
  // FIND VALID SESSION
  // --------------------------------------------------------

  const session = await Session.findOne({
    refreshTokenHash,

    revokedAt: null,

    expiresAt: {
      $gt: new Date(),
    },
  });

  if (!session) {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  // --------------------------------------------------------
  // FIND USER
  // --------------------------------------------------------

  const user = await User.findById(session.userId);

  if (!user) {
    session.revokedAt = new Date();

    session.revokedReason = "USER_NOT_FOUND";

    await session.save();

    throw new ApiError(401, "Invalid session.");
  }

  // --------------------------------------------------------
  // ACCOUNT STATUS
  // --------------------------------------------------------

  if (user.accountStatus !== "Active") {
    session.revokedAt = new Date();

    session.revokedReason = "ACCOUNT_INACTIVE";

    await session.save();

    throw new ApiError(403, "Your account is inactive.");
  }

  // --------------------------------------------------------
  // ROTATE REFRESH TOKEN
  // --------------------------------------------------------

  const newRefreshToken = generateRefreshToken();

  session.refreshTokenHash = hashToken(newRefreshToken);

  session.expiresAt = getRefreshTokenExpiry();

  session.lastUsedAt = new Date();

  await session.save();

  // --------------------------------------------------------
  // CREATE NEW ACCESS TOKEN
  // --------------------------------------------------------

  const accessToken = generateAccessToken(user._id, session._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken,

        token: accessToken,

        refreshToken: newRefreshToken,

        sessionId: session._id,

        user: sanitizeUser(user),
      },
      "Token refreshed successfully.",
    ),
  );
});

// ============================================================
// SAVE ONBOARDING PREFERENCES
// PATCH /api/v1/auth/onboarding
// ============================================================

export const saveOnboarding = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required.");
  }

  const {
    investmentKnowledge,
    experienceYears,
    primaryObjective,
    assignedWorkspace,
    assignedTab,
    routingReason,
  } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  user.onboarding = {
    completed: true,
    investmentKnowledge: investmentKnowledge || "",
    experienceYears: experienceYears || "",
    primaryObjective: primaryObjective || "",
    assignedWorkspace: assignedWorkspace || user.role,
    assignedTab: assignedTab || "overview",
    routingReason: routingReason || "",
    completedAt: new Date(),
  };

  await user.save();

  await createAuditLogFromRequest({
    req,
    action: "ONBOARDING_COMPLETED",
    resourceType: "USER",
    resourceId: user._id,
    targetUserId: user._id,
    success: true,
    statusCode: 200,
    message: "User diagnostic onboarding completed",
    metadata: {
      assignedWorkspace: user.onboarding.assignedWorkspace,
      assignedTab: user.onboarding.assignedTab,
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      sanitizeUser(user),
      "Onboarding preferences saved successfully.",
    ),
  );
});
