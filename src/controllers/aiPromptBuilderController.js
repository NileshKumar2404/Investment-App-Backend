import Company from "../models/Company.js";
import { calculateStartupMetrics } from "../services/startupMetricsService.js";
import {
  buildAIPrompt,
  listPromptTypes,
} from "../services/aiPromptBuilderService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getCompany = async (ticker) => {
  const company = await Company.findOne({ ticker: ticker.toUpperCase() });
  if (!company) throw new ApiError(404, "Company not found");
  return company;
};

export const getPromptTypes = asyncHandler(async (req, res) =>
  res.status(200).json(
    new ApiResponse(200, listPromptTypes(), "AI prompt types fetched successfully"),
  ),
);

export const buildPrompt = asyncHandler(async (req, res) => {
  const company = await getCompany(req.params.ticker);
  const metrics = calculateStartupMetrics(company);
  const type = req.body?.type || "strategy";

  const result = buildAIPrompt({
    company,
    metrics,
    type,
    context: req.body?.context || {},
  });

  return res.status(200).json(
    new ApiResponse(200, result, "AI prompt generated successfully"),
  );
});
