import mongoose from "mongoose";

import AuditLog from "../models/AuditLog.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const AUDIT_LOG_ACCESS_ROLES = ["admin", "super_admin"];

const ensureAuditLogAccess = (req) => {
  if (!req.user || !AUDIT_LOG_ACCESS_ROLES.includes(req.user.role)) {
    throw new ApiError(403, "You do not have permission to access audit logs");
  }
};

const normalizePagination = (req) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 25, 1),
    100,
  );

  return { page, limit, skip: (page - 1) * limit };
};

const buildDateFilter = (query) => {
  const createdAt = {};

  if (query.from) {
    const from = new Date(query.from);
    if (Number.isNaN(from.getTime())) {
      throw new ApiError(400, "Invalid from date");
    }
    createdAt.$gte = from;
  }

  if (query.to) {
    const to = new Date(query.to);
    if (Number.isNaN(to.getTime())) {
      throw new ApiError(400, "Invalid to date");
    }
    createdAt.$lte = to;
  }

  return Object.keys(createdAt).length ? createdAt : undefined;
};

export const getAuditLogs = async (req, res) => {
  ensureAuditLogAccess(req);

  const { page, limit, skip } = normalizePagination(req);
  const filter = {};

  if (req.query.action) {
    filter.action = String(req.query.action).trim().toUpperCase();
  }

  if (req.query.resourceType) {
    filter.resourceType = String(req.query.resourceType).trim();
  }

  if (req.query.success !== undefined) {
    if (!["true", "false"].includes(String(req.query.success))) {
      throw new ApiError(400, "success must be true or false");
    }
    filter.success = String(req.query.success) === "true";
  }

  if (req.query.actorUserId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.actorUserId)) {
      throw new ApiError(400, "Invalid actorUserId");
    }
    filter.actorUserId = req.query.actorUserId;
  }

  if (req.query.targetUserId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.targetUserId)) {
      throw new ApiError(400, "Invalid targetUserId");
    }
    filter.targetUserId = req.query.targetUserId;
  }

  if (req.query.companyId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.companyId)) {
      throw new ApiError(400, "Invalid companyId");
    }
    filter.companyId = req.query.companyId;
  }

  if (req.query.resourceId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.resourceId)) {
      throw new ApiError(400, "Invalid resourceId");
    }
    filter.resourceId = req.query.resourceId;
  }

  const createdAt = buildDateFilter(req.query);
  if (createdAt) filter.createdAt = createdAt;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actorUserId", "_id firstName lastName email role")
      .populate("targetUserId", "_id firstName lastName email role")
      .populate("companyId", "_id ticker companyName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Audit logs fetched successfully",
    ),
  );
};

export const getAuditLog = async (req, res) => {
  ensureAuditLogAccess(req);

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid audit log identifier");
  }

  const auditLog = await AuditLog.findById(id)
    .populate("actorUserId", "_id firstName lastName email role")
    .populate("targetUserId", "_id firstName lastName email role")
    .populate("companyId", "_id ticker companyName")
    .lean();

  if (!auditLog) {
    throw new ApiError(404, "Audit log not found");
  }

  return res.status(200).json(
    new ApiResponse(200, auditLog, "Audit log fetched successfully"),
  );
};

export const createAuditLog = async ({
  actorUserId = null,
  action,
  resourceType,
  resourceId = null,
  companyId = null,
  targetUserId = null,
  success = true,
  statusCode = null,
  message = "",
  metadata = {},
  ipAddress = null,
  userAgent = null,
  requestId = null,
}) => {
  if (!action || !resourceType) {
    console.error(
      "[AUDIT LOG] Missing required action or resourceType",
      {
        action,
        resourceType,
      },
    );

    return null;
  }

  try {
    return await AuditLog.create({
      actorUserId,
      action,
      resourceType,
      resourceId,
      companyId,
      targetUserId,
      success,
      statusCode,
      message,
      metadata,
      ipAddress,
      userAgent,
      requestId,
    });
  } catch (error) {
    console.error("[AUDIT LOG] Failed to create audit log:", {
      message: error.message,
      name: error.name,
      action,
      resourceType,
      resourceId,
      actorUserId,
      targetUserId,
    });

    return null;
  }
};

export const createAuditLogFromRequest = async ({
  req,
  action,
  resourceType,
  resourceId = null,
  companyId = null,
  targetUserId = null,
  success = true,
  statusCode = null,
  message = "",
  metadata = {},
}) => {
  return createAuditLog({
    actorUserId: req.user?._id || null,
    action,
    resourceType,
    resourceId,
    companyId,
    targetUserId,
    success,
    statusCode,
    message,
    metadata,
    ipAddress: req.ip || null,
    userAgent: req.get("user-agent") || null,
    requestId: req.get("x-request-id") || null,
  });
};
