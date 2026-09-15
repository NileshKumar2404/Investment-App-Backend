import Company from "../models/Company.js";
import { calculateStartupMetrics } from "../services/startupMetricsService.js";
import { buildActionPlan } from "../services/actionPlanService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getCompany = async (ticker) => {
  const company = await Company.findOne({ ticker: ticker.toUpperCase() });
  if (!company) throw new ApiError(404, "Company not found");
  return company;
};

export const getActionPlan = asyncHandler(async (req, res) => {
  const company = await getCompany(req.params.ticker);
  const metrics = calculateStartupMetrics(company);
  const plan = buildActionPlan(metrics);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ticker: company.ticker,
        companyName: company.companyName,
        metrics,
        ...plan,
      },
      "30-day action plan generated successfully",
    ),
  );
});
