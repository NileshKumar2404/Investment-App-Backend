import mongoose from "mongoose";
import User from "../models/User.js";
import Session from "../models/session.js";
import CompanyMember from "../models/CompanyMember.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { createAuditLogFromRequest } from "./auditLogController.js";

const VALID_ROLES = [
  "founder",
  "investor",
  "analyst",
  "advisor",
  "admin",
  "super_admin",
];

const VALID_STATUSES = ["Active", "Inactive", "Suspended", "Pending"];

/**
 * @desc    Get all users (paginated, searchable, filterable)
 * @route   GET /api/v1/users
 * @access  Admin / Super Admin
 */
export const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
    100,
  );
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.role) {
    const r = String(req.query.role).trim().toLowerCase();
    if (VALID_ROLES.includes(r)) {
      filter.role = r;
    }
  }

  if (req.query.status) {
    const s = String(req.query.status).trim();
    if (VALID_STATUSES.includes(s)) {
      filter.accountStatus = s;
    }
  }

  if (req.query.search) {
    const term = String(req.query.search).trim();
    filter.$or = [
      { email: { $regex: term, $options: "i" } },
      { fullName: { $regex: term, $options: "i" } },
      { company: { $regex: term, $options: "i" } },
    ];
  }

  const [users, total, roleCounts] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
  ]);

  const stats = {
    total,
    byRole: roleCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        stats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      "Users retrieved successfully.",
    ),
  );
});

/**
 * @desc    Get single user details by ID
 * @route   GET /api/v1/users/:id
 * @access  Admin / Super Admin
 */
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID format.");
  }

  const user = await User.findById(id).select("-password").lean();

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const [activeSessions, companyMemberships] = await Promise.all([
    Session.countDocuments({
      userId: id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }),
    CompanyMember.find({ userId: id })
      .populate("companyId", "companyName ticker sector")
      .lean(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...user,
        activeSessions,
        companyMemberships,
      },
      "User details retrieved successfully.",
    ),
  );
});

/**
 * @desc    Update a user's role
 * @route   PATCH /api/v1/users/:id/role
 * @access  Admin / Super Admin
 */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID format.");
  }

  if (!role || !VALID_ROLES.includes(String(role).trim().toLowerCase())) {
    throw new ApiError(
      400,
      `Valid role is required (${VALID_ROLES.join(", ")}).`,
    );
  }

  const newRole = String(role).trim().toLowerCase();

  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  // Only super_admin can create or demote super_admin
  if (
    (newRole === "super_admin" || targetUser.role === "super_admin") &&
    req.user.role !== "super_admin"
  ) {
    throw new ApiError(403, "Only Super Admin can manage Super Admin roles.");
  }

  // Prevent demoting the last super_admin
  if (targetUser.role === "super_admin" && newRole !== "super_admin") {
    const superAdminCount = await User.countDocuments({ role: "super_admin" });
    if (superAdminCount <= 1) {
      throw new ApiError(400, "Cannot demote the only remaining Super Admin.");
    }
  }

  const oldRole = targetUser.role;
  targetUser.role = newRole;
  await targetUser.save();

  // Audit this security-critical change
  await createAuditLogFromRequest({
    req,
    action: "USER_ROLE_CHANGED",
    resourceType: "USER",
    resourceId: targetUser._id,
    targetUserId: targetUser._id,
    message: `User ${targetUser.email} role changed from ${oldRole} to ${newRole}.`,
    metadata: {
      oldRole,
      newRole,
      reason: reason || "Administrative update",
    },
  }).catch((err) => console.error("Audit log error:", err));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        userId: targetUser._id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        oldRole,
        role: newRole,
      },
      "User role updated successfully.",
    ),
  );
});

/**
 * @desc    Update a user's account status (Active, Inactive, Suspended)
 * @route   PATCH /api/v1/users/:id/status
 * @access  Admin / Super Admin
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID format.");
  }

  if (!status || !VALID_STATUSES.includes(String(status).trim())) {
    throw new ApiError(
      400,
      `Valid status is required (${VALID_STATUSES.join(", ")}).`,
    );
  }

  const newStatus = String(status).trim();

  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  // Only super_admin can suspend an admin or super_admin
  if (
    ["admin", "super_admin"].includes(targetUser.role) &&
    req.user.role !== "super_admin"
  ) {
    throw new ApiError(
      403,
      "Only Super Admin can change status of administrative users.",
    );
  }

  const oldStatus = targetUser.accountStatus;
  targetUser.accountStatus = newStatus;
  await targetUser.save();

  // If suspended or inactive, revoke all their active sessions
  if (["Suspended", "Inactive"].includes(newStatus)) {
    await Session.updateMany(
      { userId: targetUser._id, revokedAt: null },
      {
        revokedAt: new Date(),
        revokedReason: `Account ${newStatus} by Administrator`,
      },
    );
  }

  void createAuditLogFromRequest({
    req,
    action: "USER_STATUS_CHANGED",
    resourceType: "USER",
    resourceId: targetUser._id,
    targetUserId: targetUser._id,
    message: `User ${targetUser.email} status changed from ${oldStatus} to ${newStatus}.`,
    metadata: {
      oldStatus,
      newStatus,
      reason: reason || "Administrative update",
    },
  }).catch((err) => console.error("Audit log error:", err));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        userId: targetUser._id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        oldStatus,
        accountStatus: newStatus,
      },
      "User status updated successfully.",
    ),
  );
});
