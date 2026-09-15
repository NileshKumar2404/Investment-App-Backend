import { calculateStartupMetrics } from "../services/startupMetricsService.js";
import { calculateStartupHealthScore } from "../services/startupHealthScoreService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getStartupHealthScore = asyncHandler(async (req, res) => {
  const metrics = calculateStartupMetrics(req.company);
  const growthRate = Number(
    req.company.growthRate ?? req.company.revenueGrowthRate ?? 0,
  );

  const health = calculateStartupHealthScore(metrics, growthRate);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ticker: req.company.ticker,
        companyName: req.company.companyName,
        growthRate,
        metrics,
        ...health,
      },
      "Startup health score calculated successfully.",
    ),
  );
});
