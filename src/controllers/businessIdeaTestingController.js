import BusinessIdeaHypothesis from "../models/BusinessIdeaHypothesis.js";
import BusinessIdeaExperiment from "../models/BusinessIdeaExperiment.js";
import Company from "../models/Company.js";
import { decideHypothesis, calculateValidationReadiness } from "../services/businessIdeaTestingService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const CATEGORIES = ["CUSTOMER", "PROBLEM", "SOLUTION", "MARKET", "PRICING", "BUSINESS_MODEL", "CHANNEL", "RETENTION"];
const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const HYPOTHESIS_STATUSES = ["OPEN", "TESTING", "VALIDATED", "REJECTED", "ITERATE", "INCONCLUSIVE"];
const RESULT_STATUSES = ["PLANNED", "SUCCESS", "FAILURE", "INCONCLUSIVE"];
const EVIDENCE_QUALITIES = ["NONE", "LOW", "MEDIUM", "HIGH"];

const requiredString = (body, field) => {
  if (typeof body[field] !== "string" || !body[field].trim()) {
    throw new ApiError(400, `${field} is required.`);
  }
  return body[field].trim();
};

const optionalString = (body, field, fallback = undefined) => {
  if (body[field] === undefined) return fallback;
  if (typeof body[field] !== "string") throw new ApiError(400, `${field} must be a string.`);
  return body[field].trim();
};

const optionalNumber = (body, field, fallback = undefined) => {
  if (body[field] === undefined) return fallback;
  const value = Number(body[field]);
  if (!Number.isFinite(value) || value < 0) throw new ApiError(400, `${field} must be a non-negative number.`);
  return value;
};

const validateEnum = (value, field, allowed) => {
  if (!allowed.includes(value)) throw new ApiError(400, `${field} must be one of: ${allowed.join(", ")}.`);
  return value;
};

const normalizeDate = (value, field) => {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `${field} must be a valid date.`);
  return date;
};

const serializeHypothesis = (item) => ({
  id: item._id,
  companyId: item.companyId,
  createdBy: item.createdBy,
  title: item.title,
  statement: item.statement,
  category: item.category,
  assumption: item.assumption,
  expectedOutcome: item.expectedOutcome,
  confidence: item.confidence,
  riskLevel: item.riskLevel,
  status: item.status,
  decision: item.decision,
  decisionConfidence: item.decisionConfidence,
  decisionRationale: item.decisionRationale,
  recommendedNextAction: item.recommendedNextAction,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const serializeExperiment = (item) => ({
  id: item._id,
  companyId: item.companyId,
  hypothesisId: item.hypothesisId,
  createdBy: item.createdBy,
  name: item.name,
  objective: item.objective,
  method: item.method,
  targetSample: item.targetSample,
  successCriteria: item.successCriteria,
  startDate: item.startDate,
  endDate: item.endDate,
  actualResult: item.actualResult,
  evidence: item.evidence,
  evidenceQuality: item.evidenceQuality,
  resultStatus: item.resultStatus,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const refreshHypothesisDecision = async (hypothesis) => {
  const experiments = await BusinessIdeaExperiment.find({
    companyId: hypothesis.companyId,
    hypothesisId: hypothesis._id,
  });
  const decision = decideHypothesis(hypothesis, experiments);
  hypothesis.status = decision.status;
  hypothesis.decision = decision.decision;
  hypothesis.decisionConfidence = decision.confidence;
  hypothesis.decisionRationale = decision.rationale;
  hypothesis.recommendedNextAction = decision.recommendedNextAction;
  await hypothesis.save();
  return decision;
};

export const createHypothesis = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const category = validateEnum(body.category, "category", CATEGORIES);
  const riskLevel = body.riskLevel === undefined ? "MEDIUM" : validateEnum(body.riskLevel, "riskLevel", RISK_LEVELS);
  const confidence = body.confidence === undefined ? 50 : optionalNumber(body, "confidence");
  if (confidence > 100) throw new ApiError(400, "confidence must be between 0 and 100.");

  const hypothesis = await BusinessIdeaHypothesis.create({
    companyId: req.company._id,
    createdBy: req.user._id,
    title: requiredString(body, "title"),
    statement: requiredString(body, "statement"),
    category,
    assumption: requiredString(body, "assumption"),
    expectedOutcome: requiredString(body, "expectedOutcome"),
    confidence,
    riskLevel,
  });

  return res.status(201).json(new ApiResponse(201, serializeHypothesis(hypothesis), "Business hypothesis created successfully."));
});

export const listHypotheses = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const hypotheses = await BusinessIdeaHypothesis.find({ companyId: req.company._id })
    .sort({ createdAt: -1 })
    .limit(limit);

  return res.status(200).json(new ApiResponse(200, hypotheses.map(serializeHypothesis), "Business hypotheses retrieved successfully."));
});

export const getHypothesis = asyncHandler(async (req, res) => {
  const hypothesis = await BusinessIdeaHypothesis.findOne({ _id: req.params.hypothesisId, companyId: req.company._id });
  if (!hypothesis) throw new ApiError(404, "Business hypothesis not found.");
  return res.status(200).json(new ApiResponse(200, serializeHypothesis(hypothesis), "Business hypothesis retrieved successfully."));
});

export const updateHypothesis = asyncHandler(async (req, res) => {
  const hypothesis = await BusinessIdeaHypothesis.findOne({ _id: req.params.hypothesisId, companyId: req.company._id });
  if (!hypothesis) throw new ApiError(404, "Business hypothesis not found.");
  const body = req.body || {};

  for (const field of ["title", "statement", "assumption", "expectedOutcome", "decisionRationale", "recommendedNextAction"]) {
    if (body[field] !== undefined) hypothesis[field] = optionalString(body, field);
  }
  if (body.category !== undefined) hypothesis.category = validateEnum(body.category, "category", CATEGORIES);
  if (body.riskLevel !== undefined) hypothesis.riskLevel = validateEnum(body.riskLevel, "riskLevel", RISK_LEVELS);
  if (body.status !== undefined) hypothesis.status = validateEnum(body.status, "status", HYPOTHESIS_STATUSES);
  if (body.confidence !== undefined) {
    hypothesis.confidence = optionalNumber(body, "confidence");
    if (hypothesis.confidence > 100) throw new ApiError(400, "confidence must be between 0 and 100.");
  }

  await hypothesis.save();
  return res.status(200).json(new ApiResponse(200, serializeHypothesis(hypothesis), "Business hypothesis updated successfully."));
});

export const createExperiment = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const hypothesis = await BusinessIdeaHypothesis.findOne({ _id: body.hypothesisId, companyId: req.company._id });
  if (!hypothesis) throw new ApiError(404, "Business hypothesis not found.");

  const evidence = body.evidence === undefined ? [] : body.evidence;
  if (!Array.isArray(evidence) || evidence.some((item) => typeof item !== "string")) {
    throw new ApiError(400, "evidence must be an array of strings.");
  }

  const experiment = await BusinessIdeaExperiment.create({
    companyId: req.company._id,
    hypothesisId: hypothesis._id,
    createdBy: req.user._id,
    name: requiredString(body, "name"),
    objective: requiredString(body, "objective"),
    method: requiredString(body, "method"),
    targetSample: optionalNumber(body, "targetSample", 0),
    successCriteria: requiredString(body, "successCriteria"),
    startDate: normalizeDate(body.startDate, "startDate"),
    endDate: normalizeDate(body.endDate, "endDate"),
    actualResult: optionalString(body, "actualResult", ""),
    evidence: evidence.map((item) => item.trim()).filter(Boolean),
    evidenceQuality: body.evidenceQuality === undefined ? "NONE" : validateEnum(body.evidenceQuality, "evidenceQuality", EVIDENCE_QUALITIES),
    resultStatus: body.resultStatus === undefined ? "PLANNED" : validateEnum(body.resultStatus, "resultStatus", RESULT_STATUSES),
  });

  if (experiment.resultStatus !== "PLANNED") await refreshHypothesisDecision(hypothesis);
  else if (hypothesis.status === "OPEN") {
    hypothesis.status = "TESTING";
    await hypothesis.save();
  }

  return res.status(201).json(new ApiResponse(201, serializeExperiment(experiment), "Business experiment created successfully."));
});

export const listExperiments = asyncHandler(async (req, res) => {
  const filter = { companyId: req.company._id };
  if (req.query.hypothesisId) filter.hypothesisId = req.query.hypothesisId;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const experiments = await BusinessIdeaExperiment.find(filter).sort({ createdAt: -1 }).limit(limit);
  return res.status(200).json(new ApiResponse(200, experiments.map(serializeExperiment), "Business experiments retrieved successfully."));
});

export const getExperiment = asyncHandler(async (req, res) => {
  const experiment = await BusinessIdeaExperiment.findOne({ _id: req.params.experimentId, companyId: req.company._id });
  if (!experiment) throw new ApiError(404, "Business experiment not found.");
  return res.status(200).json(new ApiResponse(200, serializeExperiment(experiment), "Business experiment retrieved successfully."));
});

export const updateExperiment = asyncHandler(async (req, res) => {
  const experiment = await BusinessIdeaExperiment.findOne({ _id: req.params.experimentId, companyId: req.company._id });
  if (!experiment) throw new ApiError(404, "Business experiment not found.");
  const body = req.body || {};

  for (const field of ["name", "objective", "method", "successCriteria", "actualResult"]) {
    if (body[field] !== undefined) experiment[field] = optionalString(body, field);
  }
  if (body.targetSample !== undefined) experiment.targetSample = optionalNumber(body, "targetSample");
  if (body.startDate !== undefined) experiment.startDate = normalizeDate(body.startDate, "startDate");
  if (body.endDate !== undefined) experiment.endDate = normalizeDate(body.endDate, "endDate");
  if (body.resultStatus !== undefined) experiment.resultStatus = validateEnum(body.resultStatus, "resultStatus", RESULT_STATUSES);
  if (body.evidenceQuality !== undefined) experiment.evidenceQuality = validateEnum(body.evidenceQuality, "evidenceQuality", EVIDENCE_QUALITIES);
  if (body.evidence !== undefined) {
    if (!Array.isArray(body.evidence) || body.evidence.some((item) => typeof item !== "string")) {
      throw new ApiError(400, "evidence must be an array of strings.");
    }
    experiment.evidence = body.evidence.map((item) => item.trim()).filter(Boolean);
  }

  await experiment.save();
  const hypothesis = await BusinessIdeaHypothesis.findOne({ _id: experiment.hypothesisId, companyId: req.company._id });
  if (hypothesis) await refreshHypothesisDecision(hypothesis);

  return res.status(200).json(new ApiResponse(200, serializeExperiment(experiment), "Business experiment updated successfully."));
});

export const getTestingSummary = asyncHandler(async (req, res) => {
  const [hypotheses, experiments, company] = await Promise.all([
    BusinessIdeaHypothesis.find({ companyId: req.company._id }).sort({ createdAt: -1 }),
    BusinessIdeaExperiment.find({ companyId: req.company._id }).sort({ createdAt: -1 }),
    Company.findById(req.company._id).select("ticker companyName targetAudience industry sector"),
  ]);

  const readiness = calculateValidationReadiness({ hypotheses, experiments });
  const decisions = hypotheses.reduce((acc, hypothesis) => {
    acc[hypothesis.decision] = (acc[hypothesis.decision] || 0) + 1;
    return acc;
  }, {});

  return res.status(200).json(new ApiResponse(200, {
    company,
    readiness,
    decisions,
    hypotheses: hypotheses.map(serializeHypothesis),
    experiments: experiments.map(serializeExperiment),
  }, "Business idea testing summary retrieved successfully."));
});

export const getValidationReadiness = asyncHandler(async (req, res) => {
  const [hypotheses, experiments] = await Promise.all([
    BusinessIdeaHypothesis.find({ companyId: req.company._id }),
    BusinessIdeaExperiment.find({ companyId: req.company._id }),
  ]);
  const readiness = calculateValidationReadiness({ hypotheses, experiments });
  return res.status(200).json(new ApiResponse(200, readiness, "Business validation readiness calculated successfully."));
});
