const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const scoreGrowth = (growthRate) => {
  const growth = Number(growthRate) || 0;
  if (growth <= 0) return 20;
  if (growth >= 30) return 100;
  return 20 + (growth / 30) * 80;
};

const scoreLtvCac = (ratio) => {
  const value = Number(ratio) || 0;
  if (value <= 0) return 20;
  if (value >= 5) return 100;
  if (value < 3) return 40 + (value / 3) * 30;
  return 70 + ((value - 3) / 2) * 30;
};

const scoreChurn = (churnRate) => {
  const churn = Number(churnRate) || 0;
  if (churn <= 2) return 100;
  if (churn >= 10) return 20;
  return 100 - ((churn - 2) / 8) * 80;
};

const scoreRunway = (runway) => {
  if (runway === null || runway === undefined) return 40;
  const months = Number(runway);
  if (!Number.isFinite(months)) return 40;
  if (months <= 3) return 20;
  if (months >= 18) return 100;
  return 20 + ((months - 3) / 15) * 80;
};

const getHealthStatus = (score) => {
  if (score >= 80) return "EXCELLENT";
  if (score >= 65) return "HEALTHY";
  if (score >= 50) return "WATCH";
  if (score >= 35) return "AT_RISK";
  return "CRITICAL";
};

const getMetricLabel = (key) => ({
  growth: "Growth",
  ltvCac: "LTV:CAC",
  churn: "Churn",
  runway: "Runway",
}[key] || key);

export const calculateStartupHealthScore = (metrics = {}, growthRate = 0) => {
  const metricScores = {
    growth: round(scoreGrowth(growthRate)),
    ltvCac: round(scoreLtvCac(metrics.ltvCacRatio)),
    churn: round(scoreChurn(metrics.churnRate)),
    runway: round(scoreRunway(metrics.runway)),
  };

  const overallScore = round(
    (metricScores.growth + metricScores.ltvCac + metricScores.churn + metricScores.runway) / 4,
  );

  const strengths = [];
  const risks = [];
  const recommendations = [];

  for (const [key, score] of Object.entries(metricScores)) {
    const label = getMetricLabel(key);
    if (score >= 80) strengths.push(`${label} is a strong area.`);
    if (score < 50) risks.push(`${label} needs immediate attention.`);
    else if (score < 65) risks.push(`${label} should be monitored closely.`);
  }

  if (metricScores.growth < 65) recommendations.push("Improve revenue growth through focused acquisition, conversion, and retention experiments.");
  if (metricScores.ltvCac < 65) recommendations.push("Improve unit economics by reducing CAC and/or increasing LTV.");
  if (metricScores.churn < 65) recommendations.push("Reduce customer churn by identifying the main retention drivers and fixing the highest-impact causes.");
  if (metricScores.runway < 65) recommendations.push("Extend runway by controlling burn, improving gross profit, or increasing available cash.");

  if (recommendations.length === 0) {
    recommendations.push("Maintain current operating discipline and continue monitoring the four core health metrics.");
  }

  return {
    overallScore,
    healthStatus: getHealthStatus(overallScore),
    metricScores,
    strengths,
    risks,
    recommendations,
    scoring: {
      growth: "0% growth = 20, 30%+ growth = 100",
      ltvCac: "0x = 20, 3x = 70, 5x+ = 100",
      churn: "2% or lower = 100, 10%+ = 20",
      runway: "3 months or less = 20, 18+ months = 100",
    },
  };
};
