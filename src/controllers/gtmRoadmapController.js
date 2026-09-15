import GtmPersona from "../models/GtmPersona.js";
import GtmChannel from "../models/GtmChannel.js";
import GtmRoadmapItem from "../models/GtmRoadmapItem.js";
import { calculatePersonaPriority, calculateChannelPriority, calculateGtmReadiness } from "../services/gtmRoadmapService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const arrayOfStrings = (value, field) => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new ApiError(400, `${field} must be an array of strings.`);
  return value.map((item) => item.trim()).filter(Boolean);
};
const requiredString = (body, field) => {
  if (typeof body[field] !== "string" || !body[field].trim()) throw new ApiError(400, `${field} is required.`);
  return body[field].trim();
};
const optionalString = (body, field, fallback = "") => {
  if (body[field] === undefined) return fallback;
  if (typeof body[field] !== "string") throw new ApiError(400, `${field} must be a string.`);
  return body[field].trim();
};
const number = (body, field, fallback = 0) => {
  if (body[field] === undefined) return fallback;
  const value = Number(body[field]);
  if (!Number.isFinite(value) || value < 0) throw new ApiError(400, `${field} must be a non-negative number.`);
  return value;
};
const score = (body, field, fallback = 50) => {
  const value = number(body, field, fallback);
  if (value > 100) throw new ApiError(400, `${field} must be between 0 and 100.`);
  return value;
};
const date = (body, field) => {
  if (body[field] === undefined || body[field] === null || body[field] === "") return null;
  const value = new Date(body[field]);
  if (Number.isNaN(value.getTime())) throw new ApiError(400, `${field} must be a valid date.`);
  return value;
};
const serialize = (item) => ({ ...item.toObject(), id: item._id });

export const createPersona = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const persona = new GtmPersona({
    companyId: req.company._id, createdBy: req.user._id,
    name: requiredString(body, "name"), segment: requiredString(body, "segment"),
    description: optionalString(body, "description"), painPoints: arrayOfStrings(body.painPoints, "painPoints"),
    buyingMotivations: arrayOfStrings(body.buyingMotivations, "buyingMotivations"), objections: arrayOfStrings(body.objections, "objections"),
    decisionMaker: optionalString(body, "decisionMaker"), marketSize: number(body, "marketSize"),
    problemSeverity: score(body, "problemSeverity"), abilityToPay: score(body, "abilityToPay"),
    reachability: score(body, "reachability"), strategicFit: score(body, "strategicFit"),
  });
  Object.assign(persona, calculatePersonaPriority(persona));
  await persona.save();
  return res.status(201).json(new ApiResponse(201, serialize(persona), "GTM persona created successfully."));
});

export const listPersonas = asyncHandler(async (req, res) => {
  const items = await GtmPersona.find({ companyId: req.company._id }).sort({ priorityScore: -1, createdAt: -1 }).limit(100);
  return res.status(200).json(new ApiResponse(200, items.map(serialize), "GTM personas retrieved successfully."));
});

export const updatePersona = asyncHandler(async (req, res) => {
  const item = await GtmPersona.findOne({ _id: req.params.personaId, companyId: req.company._id });
  if (!item) throw new ApiError(404, "GTM persona not found.");
  const body = req.body || {};
  for (const field of ["name", "segment", "description", "decisionMaker"]) if (body[field] !== undefined) item[field] = optionalString(body, field);
  for (const field of ["painPoints", "buyingMotivations", "objections"]) if (body[field] !== undefined) item[field] = arrayOfStrings(body[field], field);
  if (body.marketSize !== undefined) item.marketSize = number(body, "marketSize");
  for (const field of ["problemSeverity", "abilityToPay", "reachability", "strategicFit"]) if (body[field] !== undefined) item[field] = score(body, field);
  Object.assign(item, calculatePersonaPriority(item));
  await item.save();
  return res.status(200).json(new ApiResponse(200, serialize(item), "GTM persona updated successfully."));
});

export const createChannel = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const channel = new GtmChannel({
    companyId: req.company._id, createdBy: req.user._id,
    name: requiredString(body, "name"), acquisitionMethod: requiredString(body, "acquisitionMethod"),
    description: optionalString(body, "description"), expectedCac: number(body, "expectedCac"),
    estimatedReach: number(body, "estimatedReach"), conversionExpectation: score(body, "conversionExpectation", 0),
    estimatedCost: number(body, "estimatedCost"), status: body.status || "PLANNED",
  });
  if (!["PLANNED", "TESTING", "ACTIVE", "PAUSED", "STOPPED"].includes(channel.status)) throw new ApiError(400, "Invalid channel status.");
  Object.assign(channel, calculateChannelPriority(channel));
  await channel.save();
  return res.status(201).json(new ApiResponse(201, serialize(channel), "GTM channel created successfully."));
});

export const listChannels = asyncHandler(async (req, res) => {
  const items = await GtmChannel.find({ companyId: req.company._id }).sort({ priorityScore: -1, createdAt: -1 }).limit(100);
  return res.status(200).json(new ApiResponse(200, items.map(serialize), "GTM channels retrieved successfully."));
});

export const updateChannel = asyncHandler(async (req, res) => {
  const item = await GtmChannel.findOne({ _id: req.params.channelId, companyId: req.company._id });
  if (!item) throw new ApiError(404, "GTM channel not found.");
  const body = req.body || {};
  for (const field of ["name", "acquisitionMethod", "description"]) if (body[field] !== undefined) item[field] = optionalString(body, field);
  for (const field of ["expectedCac", "estimatedReach", "estimatedCost"]) if (body[field] !== undefined) item[field] = number(body, field);
  if (body.conversionExpectation !== undefined) item.conversionExpectation = score(body, "conversionExpectation", 0);
  if (body.status !== undefined) item.status = body.status;
  if (!["PLANNED", "TESTING", "ACTIVE", "PAUSED", "STOPPED"].includes(item.status)) throw new ApiError(400, "Invalid channel status.");
  Object.assign(item, calculateChannelPriority(item));
  await item.save();
  return res.status(200).json(new ApiResponse(200, serialize(item), "GTM channel updated successfully."));
});

export const createRoadmapItem = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const week = number(body, "week", 0);
  if (!Number.isInteger(week) || week < 1 || week > 12) throw new ApiError(400, "week must be an integer between 1 and 12.");
  if (body.personaId) {
    const persona = await GtmPersona.findOne({ _id: body.personaId, companyId: req.company._id });
    if (!persona) throw new ApiError(404, "GTM persona not found.");
  }
  if (body.channelId) {
    const channel = await GtmChannel.findOne({ _id: body.channelId, companyId: req.company._id });
    if (!channel) throw new ApiError(404, "GTM channel not found.");
  }
  const item = await GtmRoadmapItem.create({
    companyId: req.company._id, createdBy: req.user._id, personaId: body.personaId || null, channelId: body.channelId || null,
    week, title: requiredString(body, "title"), objective: requiredString(body, "objective"),
    activities: arrayOfStrings(body.activities, "activities"), deliverable: optionalString(body, "deliverable"), owner: optionalString(body, "owner"),
    status: body.status || "PLANNED", startDate: date(body, "startDate"), endDate: date(body, "endDate"),
  });
  if (!["PLANNED", "IN_PROGRESS", "COMPLETED", "BLOCKED"].includes(item.status)) throw new ApiError(400, "Invalid roadmap status.");
  return res.status(201).json(new ApiResponse(201, serialize(item), "GTM roadmap item created successfully."));
});

export const listRoadmapItems = asyncHandler(async (req, res) => {
  const items = await GtmRoadmapItem.find({ companyId: req.company._id }).sort({ week: 1, createdAt: 1 }).limit(200);
  return res.status(200).json(new ApiResponse(200, items.map(serialize), "GTM roadmap items retrieved successfully."));
});

export const updateRoadmapItem = asyncHandler(async (req, res) => {
  const item = await GtmRoadmapItem.findOne({ _id: req.params.itemId, companyId: req.company._id });
  if (!item) throw new ApiError(404, "GTM roadmap item not found.");
  const body = req.body || {};
  if (body.week !== undefined) {
    const week = number(body, "week");
    if (!Number.isInteger(week) || week < 1 || week > 12) throw new ApiError(400, "week must be an integer between 1 and 12.");
    item.week = week;
  }
  for (const field of ["title", "objective", "deliverable", "owner"]) if (body[field] !== undefined) item[field] = optionalString(body, field);
  if (body.activities !== undefined) item.activities = arrayOfStrings(body.activities, "activities");
  if (body.personaId !== undefined) item.personaId = body.personaId || null;
  if (body.channelId !== undefined) item.channelId = body.channelId || null;
  if (body.startDate !== undefined) item.startDate = date(body, "startDate");
  if (body.endDate !== undefined) item.endDate = date(body, "endDate");
  if (body.status !== undefined) item.status = body.status;
  if (!["PLANNED", "IN_PROGRESS", "COMPLETED", "BLOCKED"].includes(item.status)) throw new ApiError(400, "Invalid roadmap status.");
  await item.save();
  return res.status(200).json(new ApiResponse(200, serialize(item), "GTM roadmap item updated successfully."));
});

const summaryData = async (companyId) => {
  const [personas, channels, roadmapItems] = await Promise.all([
    GtmPersona.find({ companyId }).sort({ priorityScore: -1 }).lean(),
    GtmChannel.find({ companyId }).sort({ priorityScore: -1 }).lean(),
    GtmRoadmapItem.find({ companyId }).sort({ week: 1 }).lean(),
  ]);
  const readiness = calculateGtmReadiness({ personas, channels, roadmapItems });
  return { personas, channels, roadmapItems, ...readiness };
};

export const getGtmSummary = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, await summaryData(req.company._id), "GTM roadmap summary retrieved successfully."));
});

export const getGtmReadiness = asyncHandler(async (req, res) => {
  const data = await summaryData(req.company._id);
  return res.status(200).json(new ApiResponse(200, { readinessScore: data.readinessScore, verdict: data.verdict, nextActions: data.nextActions }, "GTM readiness retrieved successfully."));
});
