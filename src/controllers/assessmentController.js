import mongoose from "mongoose";

import Assessment from "../models/Assessment.js";
import Company from "../models/Company.js";
import CompanyActivity from "../models/CompanyActivity.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import {
  generateStandardAssessment,
  generateAIAssessment,
  evaluateAssessment as evaluateFounderAssessment
} from "../services/founderAssessmentService.js";

const DOMAIN_KEYS = ["leadership", "strategy", "finance", "marketing", "operations", "product"];

const calculateArchetype = (score) => {
  if (score >= 80) return "Strategic Visionary";
  if (score >= 65) return "Growth Architect";
  if (score >= 50) return "Balanced Builder";
  if (score >= 35) return "Operational Builder";
  return "Developing Leader";
};

const normalizeScore = (value, fieldName = "Score") => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    throw new ApiError(400, `${fieldName} must be a number between 0 and 100.`);
  }
  return Number(numeric.toFixed(2));
};

const normalizeDomainScores = (domainScores = {}) => {
  if (!domainScores || typeof domainScores !== "object" || Array.isArray(domainScores)) {
    throw new ApiError(400, "domainScores must be an object.");
  }

  const normalized = {};
  const provided = [];
  for (const key of DOMAIN_KEYS) {
    if (domainScores[key] !== undefined && domainScores[key] !== null) {
      normalized[key] = normalizeScore(domainScores[key], `${key} score`);
      provided.push(normalized[key]);
    } else {
      normalized[key] = 0;
    }
  }
  return { normalized, provided };
};

const calculateScore = (score, domainScores) => {
  if (score !== undefined && score !== null) return normalizeScore(score);
  const { provided } = normalizeDomainScores(domainScores);
  if (provided.length === 0) throw new ApiError(400, "Provide score or at least one domain score.");
  return Number((provided.reduce((sum, value) => sum + value, 0) / provided.length).toFixed(2));
};

const ensureObject = (value, fieldName) => {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, `${fieldName} must be an object.`);
  }
  return value;
};

const logAssessmentActivity = async (companyId, userId, action, description) => {
  try {
    await CompanyActivity.create({ companyId, userId, action, category: "ASSESSMENT", description });
  } catch (error) {
    console.error("Assessment activity log error:", error);
  }
};

const getAssessment = async (req) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw new ApiError(400, "Invalid assessment ID.");

  const assessment = await Assessment.findOne({ _id: req.params.id, companyId: req.company._id })
    .populate("userId", "fullName email role")
    .populate("reviewedByUserId", "fullName email role");

  if (!assessment) throw new ApiError(404, "Assessment not found.");
  return assessment;
};

/**
 * Generate 30 Assessment Questions (AI Dynamic or Standard Curated)
 * POST /api/v1/assessments/:ticker/generate-test
 */
export const generateTest = asyncHandler(async (req, res) => {
  const mode = req.query.mode || req.body?.mode || "standard";
  let questions = [];

  if (mode === "ai") {
    questions = await generateAIAssessment({ company: req.company });
  } else {
    questions = generateStandardAssessment();
  }

  return res.status(200).json(new ApiResponse(200, {
    mode,
    totalQuestions: questions.length,
    questions,
    company: {
      id: req.company._id,
      name: req.company.companyName || req.company.name,
      ticker: req.company.ticker,
      stage: req.company.stage,
      industry: req.company.industry
    }
  }, `Generated ${questions.length} assessment questions in ${mode} mode.`));
});

/**
 * Submit & Grade Assessment
 * POST /api/v1/assessments/:ticker/submit-test
 */
export const submitTest = asyncHandler(async (req, res) => {
  const { questions = [], answers = {}, durationMinutes = 15, mode = "standard" } = req.body || {};

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new ApiError(400, "Questions array is required to grade the assessment.");
  }

  // Evaluate assessment responses
  const evalResult = evaluateFounderAssessment({ questions, answers, durationMinutes });

  const assessment = await Assessment.create({
    userId: req.user._id,
    companyId: req.company._id,
    score: evalResult.overallScore,
    mode: mode === "ai" ? "ai" : "standard",
    capabilityLevel: evalResult.capabilityLevel,
    archetype: evalResult.archetype.name,
    archetypeIcon: evalResult.archetype.icon,
    archetypeDescription: evalResult.archetype.desc,
    domainScores: evalResult.domainScores,
    subskillScores: evalResult.subskillScores,
    strengths: evalResult.strengths,
    weaknesses: evalResult.weaknesses,
    recommendations: evalResult.recommendations,
    questionResults: evalResult.questionResults,
    durationMinutes: evalResult.durationMinutes,
    answers: answers
  });

  // Promote company status if score threshold reached and status allows advancement
  const company = await Company.findById(req.company._id);
  let statusUpdated = false;
  if (company) {
    company.founderCapabilityScore = evalResult.overallScore;
    if (evalResult.overallScore >= 60) {
      const allowedFrom = ["Draft", "Submitted", "Under Review", "Founder Assessment Pending", "Documents Pending"];
      if (allowedFrom.includes(company.status)) {
        company.status = "Investment Ready";
        statusUpdated = true;
      }
    }
    await company.save();
  }

  await logAssessmentActivity(
    req.company._id,
    req.user._id,
    "ASSESSMENT_COMPLETED",
    `Founder assessment completed with overall score ${evalResult.overallScore}/100 (${evalResult.archetype.name}).`
  );

  return res.status(201).json(new ApiResponse(201, {
    assessment,
    evaluation: evalResult,
    companyStatus: company ? company.status : req.company.status,
    statusUpdated
  }, "Founder assessment evaluated and recorded successfully."));
});

export const createAssessment = asyncHandler(async (req, res) => {
  const { score, archetype, domainScores, subskillScores, answers, reviewNotes } = req.body || {};
  const normalizedDomains = normalizeDomainScores(domainScores);
  const finalScore = calculateScore(score, domainScores);

  const assessment = await Assessment.create({
    userId: req.user._id,
    companyId: req.company._id,
    score: finalScore,
    archetype: archetype?.trim() || calculateArchetype(finalScore),
    domainScores: normalizedDomains.normalized,
    subskillScores: ensureObject(subskillScores, "subskillScores"),
    answers: ensureObject(answers, "answers"),
    reviewNotes: reviewNotes ? String(reviewNotes).trim() : "",
  });

  await logAssessmentActivity(req.company._id, req.user._id, "ASSESSMENT_CREATED", `Assessment ${assessment._id} created with score ${assessment.score}.`);
  return res.status(201).json(new ApiResponse(201, assessment, "Assessment created successfully."));
});

export const getAssessments = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filter = { companyId: req.company._id };

  if (req.query.userId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.userId)) throw new ApiError(400, "Invalid user ID.");
    filter.userId = req.query.userId;
  }
  if (req.query.reviewStatus) filter.reviewStatus = String(req.query.reviewStatus).toUpperCase();

  const [assessments, total] = await Promise.all([
    Assessment.find(filter).populate("userId", "fullName email role").populate("reviewedByUserId", "fullName email role").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Assessment.countDocuments(filter),
  ]);

  return res.status(200).json(new ApiResponse(200, {
    assessments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }, "Assessments retrieved successfully."));
});

export const getMyAssessments = asyncHandler(async (req, res) => {
  const assessments = await Assessment.find({ companyId: req.company._id, userId: req.user._id }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, assessments, "Your assessments retrieved successfully."));
});

export const getAssessmentById = asyncHandler(async (req, res) => {
  const assessment = await getAssessment(req);
  return res.status(200).json(new ApiResponse(200, assessment, "Assessment retrieved successfully."));
});

export const updateAssessment = asyncHandler(async (req, res) => {
  const assessment = await getAssessment(req);

  if (assessment.userId._id.toString() !== req.user._id.toString()) throw new ApiError(403, "You can only update your own assessment.");
  if (assessment.reviewStatus === "APPROVED") throw new ApiError(400, "An approved assessment cannot be edited.");

  const { score, archetype, domainScores, subskillScores, answers, reviewNotes } = req.body || {};
  const existingDomains = assessment.domainScores?.toObject ? assessment.domainScores.toObject() : { ...assessment.domainScores };
  const nextDomains = domainScores === undefined ? existingDomains : normalizeDomainScores(domainScores).normalized;

  if (score !== undefined || domainScores !== undefined) assessment.score = calculateScore(score, nextDomains);
  if (archetype !== undefined) assessment.archetype = String(archetype).trim() || calculateArchetype(assessment.score);
  if (domainScores !== undefined) assessment.domainScores = nextDomains;
  if (subskillScores !== undefined) assessment.subskillScores = ensureObject(subskillScores, "subskillScores");
  if (answers !== undefined) assessment.answers = ensureObject(answers, "answers");
  if (reviewNotes !== undefined) assessment.reviewNotes = String(reviewNotes).trim();

  assessment.reviewStatus = "PENDING";
  assessment.reviewedByUserId = null;
  assessment.reviewedAt = null;
  await assessment.save();

  await logAssessmentActivity(req.company._id, req.user._id, "ASSESSMENT_UPDATED", `Assessment ${assessment._id} was updated.`);
  return res.status(200).json(new ApiResponse(200, assessment, "Assessment updated successfully."));
});

export const reviewAssessment = asyncHandler(async (req, res) => {
  const assessment = await getAssessment(req);
  const reviewStatus = String(req.body?.reviewStatus || "").trim().toUpperCase();
  const allowedStatuses = ["PENDING", "IN_REVIEW", "APPROVED", "REQUIRES_FOLLOW_UP", "REJECTED"];

  if (!allowedStatuses.includes(reviewStatus)) throw new ApiError(400, "Invalid review status.");

  assessment.reviewStatus = reviewStatus;
  assessment.reviewNotes = req.body?.reviewNotes === undefined ? assessment.reviewNotes : String(req.body.reviewNotes || "").trim();
  assessment.reviewedByUserId = req.user._id;
  assessment.reviewedAt = new Date();
  await assessment.save();

  await logAssessmentActivity(req.company._id, req.user._id, "ASSESSMENT_REVIEWED", `Assessment ${assessment._id} moved to ${reviewStatus}.`);
  return res.status(200).json(new ApiResponse(200, assessment, "Assessment review updated successfully."));
});

export const deleteAssessment = asyncHandler(async (req, res) => {
  const assessment = await getAssessment(req);
  await Assessment.findByIdAndDelete(assessment._id);
  await logAssessmentActivity(req.company._id, req.user._id, "ASSESSMENT_DELETED", `Assessment ${assessment._id} was deleted.`);
  return res.status(200).json(new ApiResponse(200, null, "Assessment deleted successfully."));
});
