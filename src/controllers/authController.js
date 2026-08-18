import jwt from "jsonwebtoken";
import crypto from "crypto";
import session from "../models/session.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import Session from "../models/session.js";
const JWT_SECRET =
  process.env.JWT_SECRET || "investment_os_super_secret_jwt_key_2026";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";

const REFRESH_TOKEN_EXPIRES_DAYS = Number(
  process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30,
);

const generateAccessToken = (userId, sessionId) => {
  return jwt.sign(
    {
      id: userId,
      sessionId,
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
});

const createSession = async ({ user, req }) => {
  const refreshToken = generateRefreshToken();

  const session = await Session.create({
    userId: user._id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
    ipAddress: req.ip || req.headers["x-forward-for"] || null,
    userAgent: req.headers["user-agent"] || null,
    deviceName: req.headers["x-device-name"] || "Unknown Device",
  });

  const accessToken = generateAccessToken(user._id, session._id);

  return {
    accessToken,
    refreshToken,
    session,
  };
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
export const registerUser = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, country, language, currency } =
    req.body;

  if (!email || !password || !fullName) {
    throw new ApiError(400, "Please provide email, password, and full name");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, "User with this email already exists");
  }

  const user = await User.create({
    email: normalizedEmail,
    password,
    fullName: fullName.trim(),
    phone: phone || "-",
    country: country || "India",
    language: language || "English",
    currency: currency || "INR",
    role: "founder",
    accountStatus: "Active",
    verified: false,
    loginCount: 0,
    lastLogin: new Date(),
  });

  const { accessToken, refreshToken } = await createSession({ user, req });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        accessToken,
        refreshToken,
        user: sanitizeUser(user),
      },
      "User registered successfully",
    ),
  );
});

// @desc    Login user
// @route   POST /api/v1/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Please provide email and password");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password",
  );
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await user.matchPassword(password);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.accountStatus !== "Active") {
    throw new ApiError(
      403,
      "Your account is inactive. Please contact an administrator.",
    );
  }

  user.loginCount = (user.loginCount || 0) + 1;
  user.lastLogin = new Date();
  await user.save();

  const { accessToken, refreshToken } = await createSession({
    user,
    req,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken,
        refreshToken,
        user: sanitizeUser(user),
      },
      "User logged in successfully",
    ),
  );
});

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
export const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.accountStatus !== "Active") {
    throw new ApiError(403, "Your account is inactive");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        sanitizeUser(user),
        "User profile fetched successfully",
      ),
    );
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
export const logoutUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.sessionId) {
    await Session.findByIdAndUpdate(req.sessionId, {
      revokedAt: new Date(),
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

// @desc    Logout all active sessions
// @route   POST /api/v1/auth/logout-all
export const logoutAllDevices = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  await Session.updateMany(
    {
      userId: req.user._id,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "All active sessions have been logged out"),
    );
});

// @desc    Change user password
// @route   POST /api/v1/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters long");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const passwordMatches = await user.matchPassword(oldPassword);

  if (!passwordMatches) {
    throw new ApiError(401, "Incorrect old password");
  }

  user.password = newPassword;
  await user.save();

  await Session.updateMany(
    {
      userId: user._id,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Password changed successfully. Please login again on your devices.",
      ),
    );
});

// @desc    Forgot Password Request
// @route   POST /api/v1/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Please provide email address");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "If that email is registered, a password reset link has been generated.",
        ),
      );
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const resetTokenHash = hashToken(resetToken);

  user.passwordResetToken = resetTokenHash;

  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

  await user.save({
    validateBeforeSave: false,
  });

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

// @desc    Reset Password
// @route   POST /api/v1/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  if (!email || !newPassword || !resetToken) {
    throw new ApiError(400, "Email, reset token and new password are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters long");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
    passwordResetToken: hashToken(resetToken),
    passwordResetExpires: {
      $gt: new Date(),
    },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    throw new ApiError(400, "Invalid or expired password reset token");
  }

  user.password = newPassword;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await Session.updateMany(
    {
      userId: user._id,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully"));
});

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: rawRefreshToken } = req.body;

  if (!rawRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  const refreshTokenHash = hashToken(rawRefreshToken);

  const session = await Session.findOne({
    refreshTokenHash,
    revokedAt: null,
    expiresAt: {
      $gt: new Date(),
    },
  }).select('+refreshTokenHash');

  if (!session) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(session.userId);

  if (!user) {
    await Session.findByIdAndUpdate(session._id, {
      revokedAt: new Date(),
    });

    throw new ApiError(401, "Invalid session");
  }

  if (user.accountStatus !== "Active") {
    await Session.findByIdAndUpdate(session._id, {
      revokedAt: new Date(),
    });

    throw new ApiError(403, "Your account is inactive");
  }

  /**
   * Rotate refresh token.
   *
   * The old refresh token becomes invalid.
   */
  const newRefreshToken = generateRefreshToken();

  session.refreshTokenHash = hashToken(newRefreshToken);

  session.expiresAt = getRefreshTokenExpiry();

  session.lastUsedAt = new Date();

  await session.save();

  const accessToken = generateAccessToken(user._id, session._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken,
        refreshToken: newRefreshToken,
        user: sanitizeUser(user),
      },
      "Token refreshed successfully",
    ),
  );
});