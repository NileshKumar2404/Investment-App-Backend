import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Session from "../models/session.js";

import { ApiError } from "../utils/ApiError.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "investment_os_super_secret_jwt_key_2026";

/**
 * Protect a route with authentication.
 *
 * Expected header:
 *
 * Authorization: Bearer <access-token>
 *
 * This middleware:
 *
 * 1. Requires an access token
 * 2. Verifies the JWT
 * 3. Verifies that the token is an access token
 * 4. Verifies the session exists
 * 5. Verifies the session has not been revoked
 * 6. Verifies the session has not expired
 * 7. Verifies the user still exists
 * 8. Verifies the user account is active
 *
 * On success:
 *
 * req.user
 * req.sessionId
 * req.auth
 *
 * are populated.
 */
export const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    // =====================================================
    // 1. CHECK AUTHORIZATION HEADER
    // =====================================================

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return next(new ApiError(401, "Authentication required. Please login."));
    }

    const token = authorization.substring(7).trim();

    if (!token) {
      return next(new ApiError(401, "Authentication required. Please login."));
    }

    // =====================================================
    // 2. VERIFY ACCESS TOKEN
    // =====================================================

    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return next(
        new ApiError(401, "Not authorized, token invalid or expired"),
      );
    }

    // =====================================================
    // 3. VERIFY TOKEN TYPE
    // =====================================================

    if (!decoded || decoded.type !== "access") {
      return next(new ApiError(401, "Invalid access token"));
    }

    if (!decoded.id) {
      return next(new ApiError(401, "Invalid access token"));
    }

    if (!decoded.sessionId) {
      return next(new ApiError(401, "Invalid session"));
    }

    // =====================================================
    // 4. FIND SESSION
    // =====================================================

    const session = await Session.findById(decoded.sessionId);

    if (!session) {
      return next(new ApiError(401, "Session not found. Please login again."));
    }

    // =====================================================
    // 5. CHECK SESSION REVOCATION
    // =====================================================

    if (session.revokedAt) {
      return next(
        new ApiError(401, "Session has been revoked. Please login again."),
      );
    }

    // =====================================================
    // 6. CHECK SESSION EXPIRATION
    // =====================================================

    if (!session.expiresAt || session.expiresAt <= new Date()) {
      return next(
        new ApiError(401, "Session has expired. Please login again."),
      );
    }

    // =====================================================
    // 7. VERIFY SESSION BELONGS TO USER IN TOKEN
    // =====================================================

    if (session.userId.toString() !== decoded.id.toString()) {
      return next(new ApiError(401, "Invalid session"));
    }

    // =====================================================
    // 8. FIND USER
    // =====================================================

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ApiError(401, "User account no longer exists"));
    }

    // =====================================================
    // 9. CHECK ACCOUNT STATUS
    // =====================================================

    if (user.accountStatus !== "Active") {
      return next(
        new ApiError(
          403,
          "Your account is inactive. Please contact an administrator.",
        ),
      );
    }

    // =====================================================
    // 10. ATTACH AUTHENTICATED USER
    // =====================================================

    req.user = user;

    /**
     * Session ID is needed by:
     *
     * - logout
     * - session management
     * - audit logging
     */
    req.sessionId = session._id.toString();

    /**
     * Keep useful authentication information
     * available to controllers when required.
     */
    req.auth = {
      userId: user._id.toString(),
      sessionId: session._id.toString(),
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(new ApiError(401, "Authentication failed"));
  }
};

/**
 * Require an authenticated user.
 *
 * `protect` already performs authentication,
 * but keeping this middleware is useful for
 * existing routes that currently use:
 *
 * protect
 * requireAuth
 *
 * It also keeps backward compatibility with
 * the existing project.
 */
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required. Please login."));
  }

  return next();
};

/**
 * Require one of the specified global user roles.
 *
 * Example:
 *
 * authorizeRoles('admin', 'super_admin')
 *
 * This should be used for platform-level
 * administrative operations.
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required. Please login."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, "You do not have permission to perform this action."),
      );
    }

    return next();
  };
};
