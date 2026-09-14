import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getUserId = (req) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Authentication required. Please login.");
  }

  return req.user._id;
};

const findNotification = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new ApiError(400, "Invalid notification ID.");
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  })
    .populate("companyId", "ticker companyName logo")
    .populate("investmentId", "_id")
    .populate("reportId", "title type status");

  if (!notification) {
    throw new ApiError(404, "Notification not found.");
  }

  return notification;
};

export const getMyNotifications = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
    100,
  );
  const skip = (page - 1) * limit;

  const filter = {
    userId,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  };

  if (req.query.unread === "true") {
    filter.readAt = null;
  }

  if (req.query.type) {
    filter.type = String(req.query.type).trim().toUpperCase();
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate("companyId", "ticker companyName logo")
      .populate("reportId", "title type status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      userId,
      readAt: null,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount,
      },
      "Notifications retrieved successfully.",
    ),
  );
});

export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const unreadCount = await Notification.countDocuments({
    userId,
    readAt: null,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { unreadCount },
      "Unread notification count retrieved successfully.",
    ),
  );
});

export const getNotification = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const notification = await findNotification(req.params.id, userId);

  return res.status(200).json(
    new ApiResponse(200, notification, "Notification retrieved successfully."),
  );
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const notification = await findNotification(req.params.id, userId);

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      notification,
      "Notification marked as read.",
    ),
  );
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const result = await Notification.updateMany(
    {
      userId,
      readAt: null,
    },
    {
      $set: { readAt: new Date() },
    },
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { modifiedCount: result.modifiedCount },
      "All notifications marked as read.",
    ),
  );
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, "Invalid notification ID.");
  }

  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found.");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Notification deleted successfully."),
  );
});

// Internal helper for other backend modules.
// It deliberately has no public route so users cannot create arbitrary notifications.
export const createNotification = async ({
  userId,
  type = "SYSTEM",
  priority = "NORMAL",
  title,
  message,
  data = {},
  companyId = null,
  investmentId = null,
  reportId = null,
  createdByUserId = null,
  expiresAt = null,
}) => {
  if (!userId) {
    throw new ApiError(400, "Notification recipient is required.");
  }

  if (!title || !String(title).trim()) {
    throw new ApiError(400, "Notification title is required.");
  }

  if (!message || !String(message).trim()) {
    throw new ApiError(400, "Notification message is required.");
  }

  return Notification.create({
    userId,
    type,
    priority,
    title: String(title).trim(),
    message: String(message).trim(),
    data,
    companyId,
    investmentId,
    reportId,
    createdByUserId,
    expiresAt,
  });
};
