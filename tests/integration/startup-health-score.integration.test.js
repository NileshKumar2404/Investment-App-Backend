import assert from "node:assert/strict";
import test from "node:test";
import { calculateStartupHealthScore } from "../../src/services/startupHealthScoreService.js";

test("startup health score service calculates a healthy startup", () => {
  const result = calculateStartupHealthScore(
    {
      ltvCacRatio: 4,
      churnRate: 2,
      runway: 12,
    },
    15,
  );

  assert.equal(result.healthStatus, "HEALTHY");
  assert.ok(result.overallScore >= 65);
  assert.ok(result.metricScores.growth > 50);
  assert.ok(result.metricScores.ltvCac > 80);
  assert.equal(result.metricScores.churn, 100);
  assert.ok(result.metricScores.runway > 60);
  assert.ok(result.strengths.length >= 1);
  assert.ok(result.risks.length >= 1);
});

test("startup health score identifies critical runway and weak unit economics", () => {
  const result = calculateStartupHealthScore(
    {
      ltvCacRatio: 1.5,
      churnRate: 8,
      runway: 2,
    },
    0,
  );

  assert.ok(result.overallScore < 50);
  assert.equal(result.healthStatus, "CRITICAL");
  assert.ok(result.risks.some((risk) => risk.includes("Runway")));
  assert.ok(result.risks.some((risk) => risk.includes("LTV:CAC")));
  assert.ok(result.risks.some((risk) => risk.includes("Churn")));
  assert.ok(result.recommendations.length >= 3);
});

test("startup health score handles missing runway without throwing", () => {
  const result = calculateStartupHealthScore(
    {
      ltvCacRatio: 3,
      churnRate: 4,
      runway: null,
    },
    10,
  );

  assert.equal(result.metricScores.runway, 40);
  assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
});
