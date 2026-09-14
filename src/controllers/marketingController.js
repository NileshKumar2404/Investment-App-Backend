import mongoose from "mongoose";

import MarketingChannel from "../models/MarketingChannel.js";
import CompanyActivity from "../models/CompanyActivity.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toNumber = (value, field, { min = 0 } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min) {
    throw new ApiError(400, `${field} must be a valid number${min === 0 ? " greater than or equal to 0" : ` greater than or equal to ${min}`}.`);
  }
  return numeric;
};

const normalizeMetrics = (body = {}, partial = false) => {
  const output = {};
  const numericFields = [
    "budget",
    "spend",
    "impressions",
    "clicks",
    "leads",
    "customers",
    "revenue",
  ];

  for (const field of numericFields) {
    if (!partial || body[field] !== undefined) {
      output[field] = toNumber(body[field] ?? 0, field);
    }
  }

  if (!partial || body.channelName !== undefined) {
    const channelName = String(body.channelName || "").trim();
    if (!channelName) throw new ApiError(400, "Channel name is required.");
    if (channelName.length > 150) throw new ApiError(400, "Channel name cannot exceed 150 characters.");
    output.channelName = channelName;
  }

  if (!partial || body.status !== undefined) {
    const status = String(body.status || "ACTIVE").trim().toUpperCase();
    if (!["ACTIVE", "PAUSED", "PLANNED"].includes(status)) {
      throw new ApiError(400, "Invalid marketing channel status.");
    }
    output.status = status;
  }

  if (!partial || body.periodStart !== undefined) {
    output.periodStart = body.periodStart ? new Date(body.periodStart) : undefined;
    if (output.periodStart && Number.isNaN(output.periodStart.getTime())) {
      throw new ApiError(400, "Invalid periodStart date.");
    }
  }

  if (!partial || body.periodEnd !== undefined) {
    output.periodEnd = body.periodEnd ? new Date(body.periodEnd) : undefined;
    if (output.periodEnd && Number.isNaN(output.periodEnd.getTime())) {
      throw new ApiError(400, "Invalid periodEnd date.");
    }
  }

  if (output.periodStart && output.periodEnd && output.periodEnd < output.periodStart) {
    throw new ApiError(400, "periodEnd cannot be before periodStart.");
  }

  if (partial) {
    const hasMetricUpdate = numericFields.some((field) => body[field] !== undefined);
    const hasNameUpdate = body.channelName !== undefined;
    const hasStatusUpdate = body.status !== undefined;
    const hasPeriodUpdate = body.periodStart !== undefined || body.periodEnd !== undefined;
    if (!hasMetricUpdate && !hasNameUpdate && !hasStatusUpdate && !hasPeriodUpdate) {
      throw new ApiError(400, "At least one marketing channel field is required.");
    }
  }

  return output;
};

const withAnalytics = (channel) => {
  const data = channel.toObject ? channel.toObject() : { ...channel };
  const spend = Number(data.spend || 0);
  const impressions = Number(data.impressions || 0);
  const clicks = Number(data.clicks || 0);
  const leads = Number(data.leads || 0);
  const customers = Number(data.customers || 0);
  const revenue = Number(data.revenue || 0);

  return {
    ...data,
    analytics: {
      ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      leadConversionRate: clicks > 0 ? Number(((leads / clicks) * 100).toFixed(2)) : 0,
      customerConversionRate: leads > 0 ? Number(((customers / leads) * 100).toFixed(2)) : 0,
      costPerLead: leads > 0 ? Number((spend / leads).toFixed(2)) : 0,
      customerAcquisitionCost: customers > 0 ? Number((spend / customers).toFixed(2)) : 0,
      roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
    },
  };
};

const logMarketingActivity = async (companyId, userId, action, description) => {
  try {
    await CompanyActivity.create({
      companyId,
      userId,
      action,
      category: "MARKETING",
      description,
    });
  } catch (error) {
    console.error("Marketing activity log error:", error);
  }
};

const getChannel = async (req) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, "Invalid marketing channel ID.");
  }

  const channel = await MarketingChannel.findOne({
    _id: req.params.id,
    companyId: req.company._id,
  });

  if (!channel) throw new ApiError(404, "Marketing channel not found.");
  return channel;
};

export const getMarketingChannels = asyncHandler(async (req, res) => {
  const channels = await MarketingChannel.find({ companyId: req.company._id }).sort({ createdAt: -1 });
  return res.status(200).json(
    new ApiResponse(200, channels.map(withAnalytics), "Marketing channels retrieved successfully."),
  );
});

export const getMarketingSummary = asyncHandler(async (req, res) => {
  const channels = await MarketingChannel.find({ companyId: req.company._id });

  const summary = channels.reduce(
    (acc, channel) => {
      acc.budget += Number(channel.budget || 0);
      acc.spend += Number(channel.spend || 0);
      acc.impressions += Number(channel.impressions || 0);
      acc.clicks += Number(channel.clicks || 0);
      acc.leads += Number(channel.leads || 0);
      acc.customers += Number(channel.customers || 0);
      acc.revenue += Number(channel.revenue || 0);
      return acc;
    },
    { channels: channels.length, budget: 0, spend: 0, impressions: 0, clicks: 0, leads: 0, customers: 0, revenue: 0 },
  );

  summary.remainingBudget = Number((summary.budget - summary.spend).toFixed(2));
  summary.ctr = summary.impressions > 0 ? Number(((summary.clicks / summary.impressions) * 100).toFixed(2)) : 0;
  summary.leadConversionRate = summary.clicks > 0 ? Number(((summary.leads / summary.clicks) * 100).toFixed(2)) : 0;
  summary.customerConversionRate = summary.leads > 0 ? Number(((summary.customers / summary.leads) * 100).toFixed(2)) : 0;
  summary.costPerLead = summary.leads > 0 ? Number((summary.spend / summary.leads).toFixed(2)) : 0;
  summary.customerAcquisitionCost = summary.customers > 0 ? Number((summary.spend / summary.customers).toFixed(2)) : 0;
  summary.roas = summary.spend > 0 ? Number((summary.revenue / summary.spend).toFixed(2)) : 0;

  return res.status(200).json(new ApiResponse(200, summary, "Marketing summary retrieved successfully."));
});

export const getMarketingChannel = asyncHandler(async (req, res) => {
  const channel = await getChannel(req);
  return res.status(200).json(new ApiResponse(200, withAnalytics(channel), "Marketing channel retrieved successfully."));
});

export const createMarketingChannel = asyncHandler(async (req, res) => {
  const channel = await MarketingChannel.create({
    companyId: req.company._id,
    ...normalizeMetrics(req.body),
  });

  await logMarketingActivity(
    req.company._id,
    req.user._id,
    "MARKETING_CHANNEL_CREATED",
    `Marketing channel ${channel.channelName} was created.`,
  );

  return res.status(201).json(new ApiResponse(201, withAnalytics(channel), "Marketing channel created successfully."));
});

export const updateMarketingChannel = asyncHandler(async (req, res) => {
  const channel = await getChannel(req);
  Object.assign(channel, normalizeMetrics(req.body, true));
  await channel.save();

  await logMarketingActivity(
    req.company._id,
    req.user._id,
    "MARKETING_CHANNEL_UPDATED",
    `Marketing channel ${channel.channelName} was updated.`,
  );

  return res.status(200).json(new ApiResponse(200, withAnalytics(channel), "Marketing channel updated successfully."));
});

export const deleteMarketingChannel = asyncHandler(async (req, res) => {
  const channel = await getChannel(req);
  await MarketingChannel.findByIdAndDelete(channel._id);

  await logMarketingActivity(
    req.company._id,
    req.user._id,
    "MARKETING_CHANNEL_DELETED",
    `Marketing channel ${channel.channelName} was deleted.`,
  );

  return res.status(200).json(new ApiResponse(200, null, "Marketing channel deleted successfully."));
});
