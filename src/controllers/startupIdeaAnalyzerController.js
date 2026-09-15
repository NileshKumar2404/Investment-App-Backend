import StartupIdeaAnalysis from "../models/StartupIdeaAnalysis.js";
import { analyzeStartupIdea } from "../services/startupIdeaAnalyzerService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const STRING_FIELDS = [
  "ideaName",
  "ideaDescription",
  "problemStatement",
  "targetCustomer",
  "buyer",
  "marketDescription",
  "market",
  "geography",
  "solutionDescription",
  "prototypeOrMvp",
  "businessModel",
  "revenueModel",
  "pricePoint",
  "averageContractValue",
  "unitEconomics",
  "competitors",
  "competitorDescription",
  "competitorStrengths",
  "competitorWeaknesses",
  "differentiation",
  "moat",
  "scalabilityPlan",
  "operationalBottleneck",
  "timingRationale",
  "validationEvidence",
  "assumptions",
];

const NUMERIC_FIELDS = ["tam", "sam", "som", "marketGrowthRate"];

const normalizeInput = (body = {}, company) => {
  if (!body.ideaName || typeof body.ideaName !== "string" || !body.ideaName.trim()) {
    throw new ApiError(400, "ideaName is required.");
  }

  const input = {};
  for (const field of STRING_FIELDS) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string") {
        throw new ApiError(400, `${field} must be a string.`);
      }
      input[field] = body[field].trim();
    }
  }

  for (const field of NUMERIC_FIELDS) {
    if (body[field] === undefined) continue;
    const value = Number(body[field]);
    if (!Number.isFinite(value) || value < 0) {
      throw new ApiError(400, `${field} must be a non-negative number.`);
    }
    input[field] = value;
  }

  if (!input.ideaDescription && !input.problemStatement && !input.solutionDescription) {
    throw new ApiError(400, "Provide at least an ideaDescription, problemStatement, or solutionDescription.");
  }

  input.companyContext = {
    ticker: company.ticker,
    industry: company.industry,
    sector: company.sector,
    targetAudience: company.targetAudience,
    productsServices: company.productsServices,
    currentRevenue: company.currentRevenue,
    customers: company.customers,
    tam: company.tam,
    sam: company.sam,
    som: company.som,
  };

  return input;
};

const serializeAnalysis = (analysis) => ({
  id: analysis._id,
  companyId: analysis.companyId,
  createdBy: analysis.createdBy,
  ideaName: analysis.ideaName,
  input: analysis.input,
  dimensions: analysis.dimensions,
  ideaScore: analysis.ideaScore,
  verdict: analysis.verdict,
  strengths: analysis.strengths,
  criticalVulnerabilities: analysis.criticalVulnerabilities,
  unansweredQuestions: analysis.unansweredQuestions,
  immediateNextSteps: analysis.immediateNextSteps,
  createdAt: analysis.createdAt,
  updatedAt: analysis.updatedAt,
});

export const analyzeIdea = asyncHandler(async (req, res) => {
  const input = normalizeInput(req.body || {}, req.company);
  const result = analyzeStartupIdea(input, req.company);

  const analysis = await StartupIdeaAnalysis.create({
    companyId: req.company._id,
    createdBy: req.user._id,
    ideaName: input.ideaName.trim(),
    input,
    ...result,
  });

  return res.status(201).json(
    new ApiResponse(201, serializeAnalysis(analysis), "Startup idea analyzed successfully."),
  );
});

export const getIdeaAnalysisHistory = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

  const analyses = await StartupIdeaAnalysis.find({ companyId: req.company._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("ideaName ideaScore verdict dimensions strengths criticalVulnerabilities createdBy createdAt updatedAt");

  return res.status(200).json(
    new ApiResponse(200, analyses.map(serializeAnalysis), "Startup idea analysis history retrieved successfully."),
  );
});

export const getIdeaAnalysis = asyncHandler(async (req, res) => {
  const analysis = await StartupIdeaAnalysis.findOne({
    _id: req.params.analysisId,
    companyId: req.company._id,
  });

  if (!analysis) throw new ApiError(404, "Startup idea analysis not found.");

  return res.status(200).json(
    new ApiResponse(200, serializeAnalysis(analysis), "Startup idea analysis retrieved successfully."),
  );
});
