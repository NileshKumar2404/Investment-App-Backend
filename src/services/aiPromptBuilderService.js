const clamp = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max);

const normalizeContext = (context = {}) => ({
  goal: String(context.goal || "").trim(),
  audience: String(context.audience || "").trim(),
  tone: String(context.tone || "practical").trim(),
  constraints: String(context.constraints || "").trim(),
  desiredOutput: String(context.desiredOutput || "action plan").trim(),
});

const metricSnapshot = (metrics = {}) => ({
  monthlyRevenue: metrics.monthlyRevenue ?? null,
  mrr: metrics.mrr ?? null,
  customers: metrics.customers ?? null,
  cac: metrics.cac ?? null,
  ltv: metrics.ltv ?? null,
  churnRate: metrics.churnRate ?? null,
  conversionRate: metrics.conversionRate ?? null,
  grossMargin: metrics.grossMargin ?? null,
  monthlyBurn: metrics.monthlyBurn ?? null,
  cashAvailable: metrics.cashAvailable ?? null,
  arpu: metrics.arpu ?? null,
  ltvCacRatio: metrics.ltvCacRatio ?? null,
  netBurn: metrics.netBurn ?? null,
  runway: metrics.runway ?? null,
  cacPaybackMonths: metrics.cacPaybackMonths ?? null,
});

const promptTemplates = {
  strategy: {
    label: "Startup Strategy",
    instruction: "Diagnose the startup situation, identify the highest-leverage constraint, and recommend a focused strategy.",
  },
  growth: {
    label: "Growth",
    instruction: "Find the strongest realistic growth lever, explain the expected impact, and propose measurable experiments.",
  },
  retention: {
    label: "Retention",
    instruction: "Diagnose retention risk, identify likely churn drivers, and propose experiments to improve customer retention.",
  },
  fundraising: {
    label: "Fundraising",
    instruction: "Assess fundraising readiness from the available operating metrics and identify the evidence gaps an investor would challenge.",
  },
  unitEconomics: {
    label: "Unit Economics",
    instruction: "Analyze CAC, LTV, LTV:CAC, payback, gross margin, and churn to identify the most important unit-economic improvement.",
  },
  custom: {
    label: "Custom",
    instruction: "Solve the founder's stated goal using the provided company context and metrics.",
  },
};

export const buildAIPrompt = ({ company, metrics, type = "strategy", context = {} }) => {
  const template = promptTemplates[type] || promptTemplates.custom;
  const normalizedContext = normalizeContext(context);
  const startup = {
    companyName: company?.companyName || null,
    ticker: company?.ticker || null,
    industry: company?.industry || null,
    stage: company?.stage || null,
    businessModel: company?.businessModel || null,
    targetCustomer: company?.targetCustomer || null,
  };

  const prompt = [
    "You are a startup operating advisor.",
    `Task type: ${template.label}.`,
    `Objective: ${normalizedContext.goal || template.instruction}`,
    "",
    "Company context:",
    JSON.stringify(startup, null, 2),
    "",
    "Current operating metrics:",
    JSON.stringify(metricSnapshot(metrics), null, 2),
    "",
    `Audience: ${normalizedContext.audience || "founder and leadership team"}`,
    `Tone: ${normalizedContext.tone}`,
    `Desired output: ${normalizedContext.desiredOutput}`,
    `Constraints: ${normalizedContext.constraints || "Use only the supplied facts; state assumptions explicitly."}`,
    "",
    "Instructions:",
    template.instruction,
    "Prioritize the highest-impact issue first. Quantify recommendations where the supplied data allows it.",
    "Separate facts, assumptions, risks, and recommendations.",
    "End with a concise next-step checklist and measurable success criteria.",
  ].join("\n");

  const completeness = clamp(
    [normalizedContext.goal, normalizedContext.audience, normalizedContext.constraints].filter(Boolean).length * 25 +
      Object.values(startup).filter(Boolean).length * 5,
    0,
    100,
  );

  return {
    type,
    typeLabel: template.label,
    prompt,
    context: normalizedContext,
    startup,
    metrics: metricSnapshot(metrics),
    completenessScore: completeness,
    generatedAt: new Date().toISOString(),
  };
};

export const listPromptTypes = () =>
  Object.entries(promptTemplates).map(([key, value]) => ({
    key,
    label: value.label,
    instruction: value.instruction,
  }));
