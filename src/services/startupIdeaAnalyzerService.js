const DIMENSIONS = [
  { key: "problemStrength", name: "Problem Strength", weight: 14 },
  { key: "customerClarity", name: "Customer Clarity", weight: 10 },
  { key: "marketOpportunity", name: "Market Opportunity", weight: 12 },
  { key: "solutionStrength", name: "Solution Strength", weight: 12 },
  { key: "businessModel", name: "Business Model", weight: 10 },
  { key: "competition", name: "Competition", weight: 8 },
  { key: "differentiation", name: "Differentiation", weight: 10 },
  { key: "scalability", name: "Scalability", weight: 8 },
  { key: "timing", name: "Timing (Why Now)", weight: 6 },
  { key: "completeness", name: "Completeness Score", weight: 10 },
];

const POSITIVE_SIGNALS = {
  problem: ["urgent", "pain", "expensive", "costly", "manual", "slow", "frustrat", "risk", "critical", "frequent", "recurring"],
  customer: ["founder", "startup", "smb", "enterprise", "manager", "developer", "student", "parent", "professional", "team", "company", "buyer"],
  solution: ["platform", "software", "app", "service", "automate", "automation", "workflow", "dashboard", "marketplace", "api", "tool"],
  timing: ["ai", "automation", "regulation", "trend", "remote", "mobile", "digital", "cloud", "change", "shift", "new technology"],
};

const text = (value) => (value == null ? "" : String(value).trim());
const lower = (value) => text(value).toLowerCase();
const hasValue = (value) => text(value).length > 0;
const wordCount = (value) => text(value).split(/\s+/).filter(Boolean).length;
const hasSignal = (value, signals) => signals.some((signal) => lower(value).includes(signal));
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value) => Math.round(value * 100) / 100;

const scoreText = ({ value, base, maxBonus, signals = [], evidenceBonus = 0 }) => {
  const count = wordCount(value);
  let score = base;
  if (count >= 8) score += Math.min(maxBonus * 0.5, (count - 7) * 2);
  if (count >= 25) score += maxBonus * 0.25;
  if (hasSignal(value, signals)) score += maxBonus * 0.25;
  if (evidenceBonus) score += evidenceBonus;
  return clamp(score);
};

const numeric = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const marketScore = (input, company) => {
  let score = 15;
  const market = input.marketDescription || input.market || input.tamDescription;
  if (wordCount(market) >= 8) score += 25;
  if (numeric(input.tam || company?.tam) > 0) score += 20;
  if (numeric(input.sam || company?.sam) > 0) score += 15;
  if (numeric(input.som || company?.som) > 0) score += 10;
  if (numeric(input.marketGrowthRate) > 0) score += 10;
  if (hasValue(input.geography)) score += 5;
  return clamp(score);
};

const businessModelScore = (input, company) => {
  let score = 10;
  if (hasValue(input.businessModel || company?.businessModel)) score += 30;
  if (hasValue(input.revenueModel || company?.revenueModel)) score += 30;
  if (numeric(input.pricePoint) > 0 || numeric(input.averageContractValue) > 0) score += 15;
  if (hasValue(input.unitEconomics)) score += 15;
  return clamp(score);
};

const competitionScore = (input) => {
  const competitors = input.competitors || input.competitorDescription;
  let score = 20;
  if (wordCount(competitors) >= 5) score += 35;
  if (wordCount(competitors) >= 20) score += 20;
  if (hasValue(input.competitorStrengths)) score += 10;
  if (hasValue(input.competitorWeaknesses)) score += 15;
  return clamp(score);
};

const completenessScore = (input, company) => {
  const required = [
    ["ideaDescription", input.ideaDescription],
    ["problemStatement", input.problemStatement],
    ["targetCustomer", input.targetCustomer || company?.targetAudience],
    ["solutionDescription", input.solutionDescription],
    ["businessModel", input.businessModel || company?.businessModel],
    ["revenueModel", input.revenueModel || company?.revenueModel],
    ["competitors", input.competitors || input.competitorDescription],
    ["differentiation", input.differentiation],
    ["scalabilityPlan", input.scalabilityPlan],
    ["timingRationale", input.timingRationale],
    ["validationEvidence", input.validationEvidence],
  ];
  const populated = required.filter(([, value]) => hasValue(value)).length;
  let score = (populated / required.length) * 80;
  if (numeric(input.tam || company?.tam) > 0) score += 5;
  if (numeric(input.sam || company?.sam) > 0) score += 5;
  if (numeric(input.som || company?.som) > 0) score += 5;
  if (hasValue(input.assumptions)) score += 5;
  return clamp(score);
};

const buildDimension = (key, score, rationale, evidence = []) => {
  const definition = DIMENSIONS.find((dimension) => dimension.key === key);
  return {
    key,
    name: definition.name,
    score: round(score),
    weight: definition.weight,
    rationale,
    evidence: evidence.filter(Boolean).slice(0, 4),
  };
};

const buildVerdict = (score) => {
  if (score < 45) return "IDEA_NOT_READY";
  if (score < 65) return "NEEDS_VALIDATION";
  if (score < 80) return "PROMISING";
  return "STRONG_OPPORTUNITY";
};

const buildInsights = (dimensions, input) => {
  const strongest = [...dimensions].sort((a, b) => b.score - a.score).slice(0, 3);
  const weakest = [...dimensions].sort((a, b) => a.score - b.score).slice(0, 3);

  const strengths = strongest
    .filter((dimension) => dimension.score >= 60)
    .map((dimension) => `${dimension.name} is a relative strength (${dimension.score}/100).`);

  const criticalVulnerabilities = weakest
    .filter((dimension) => dimension.score < 60)
    .map((dimension) => `${dimension.name} needs attention (${dimension.score}/100): ${dimension.rationale}`);

  const questions = [];
  if (!hasValue(input.validationEvidence)) questions.push("What real customer evidence proves the problem is painful enough to pay to solve?");
  if (!hasValue(input.competitors || input.competitorDescription)) questions.push("Who are the direct, indirect, and status-quo alternatives customers use today?");
  if (!hasValue(input.differentiation)) questions.push("Why will customers choose this solution instead of the strongest alternative?");
  if (!hasValue(input.revenueModel)) questions.push("Who pays, how much do they pay, and how often do they pay?");
  if (!hasValue(input.timingRationale)) questions.push("What changed now that makes this problem more urgent or solvable?");
  if (numeric(input.tam) <= 0) questions.push("What is the defensible TAM/SAM/SOM for the initial market?");

  const nextSteps = [];
  if (weakest.some((item) => item.key === "problemStrength" && item.score < 65)) nextSteps.push("Interview at least 10 target customers and quantify the problem frequency, cost, and urgency.");
  if (weakest.some((item) => item.key === "customerClarity" && item.score < 65)) nextSteps.push("Define one primary customer segment and its buyer, user, and triggering event.");
  if (weakest.some((item) => item.key === "marketOpportunity" && item.score < 65)) nextSteps.push("Build a bottom-up market estimate and document the assumptions behind TAM, SAM, and SOM.");
  if (weakest.some((item) => item.key === "competition" && item.score < 65)) nextSteps.push("Create a competitor matrix covering direct, indirect, and status-quo alternatives.");
  if (weakest.some((item) => item.key === "differentiation" && item.score < 65)) nextSteps.push("Write a measurable value proposition that is difficult for the leading alternative to copy.");
  if (weakest.some((item) => item.key === "businessModel" && item.score < 65)) nextSteps.push("Define pricing, payer, revenue model, and the first unit-economics assumptions.");
  if (weakest.some((item) => item.key === "scalability" && item.score < 65)) nextSteps.push("Identify the main operational bottleneck that could prevent growth and design a scalable process around it.");
  if (weakest.some((item) => item.key === "timing" && item.score < 65)) nextSteps.push("Document the market, technology, regulatory, or behavior change that creates the current window of opportunity.");
  if (nextSteps.length === 0) nextSteps.push("Run a focused customer validation experiment and update the analysis with evidence.");

  return {
    strengths: strengths.slice(0, 3),
    criticalVulnerabilities: criticalVulnerabilities.slice(0, 3),
    unansweredQuestions: questions.slice(0, 6),
    immediateNextSteps: [...new Set(nextSteps)].slice(0, 6),
  };
};

export const IDEA_ANALYZER_DIMENSIONS = DIMENSIONS;

export const analyzeStartupIdea = (input = {}, company = {}) => {
  const normalized = {
    ...input,
    targetCustomer: input.targetCustomer || company.targetAudience,
    marketDescription: input.marketDescription || input.market,
    businessModel: input.businessModel || company.businessModel,
    revenueModel: input.revenueModel || company.revenueModel,
  };

  const dimensions = [
    buildDimension(
      "problemStrength",
      scoreText({ value: normalized.problemStatement, base: 15, maxBonus: 70, signals: POSITIVE_SIGNALS.problem, evidenceBonus: hasValue(normalized.validationEvidence) ? 10 : 0 }),
      hasValue(normalized.problemStatement) ? "The problem description was evaluated for specificity, pain signals, and supporting evidence." : "No sufficiently detailed problem statement was supplied.",
      [normalized.problemStatement, normalized.validationEvidence],
    ),
    buildDimension(
      "customerClarity",
      scoreText({ value: normalized.targetCustomer, base: 15, maxBonus: 70, signals: POSITIVE_SIGNALS.customer, evidenceBonus: hasValue(normalized.buyer) ? 10 : 0 }),
      hasValue(normalized.targetCustomer) ? "The target customer was evaluated for specificity and buyer clarity." : "The target customer is not clearly defined.",
      [normalized.targetCustomer, normalized.buyer],
    ),
    buildDimension(
      "marketOpportunity",
      marketScore(normalized, company),
      "Market opportunity is scored from market definition, TAM/SAM/SOM evidence, growth assumptions, and geographic focus.",
      [normalized.marketDescription, normalized.tam ? `TAM: ${normalized.tam}` : "", normalized.sam ? `SAM: ${normalized.sam}` : "", normalized.som ? `SOM: ${normalized.som}` : ""],
    ),
    buildDimension(
      "solutionStrength",
      scoreText({ value: normalized.solutionDescription, base: 15, maxBonus: 70, signals: POSITIVE_SIGNALS.solution, evidenceBonus: hasValue(normalized.prototypeOrMvp) ? 10 : 0 }),
      hasValue(normalized.solutionDescription) ? "The solution was evaluated for clarity, mechanism, outcome, and implementation evidence." : "No sufficiently detailed solution description was supplied.",
      [normalized.solutionDescription, normalized.prototypeOrMvp],
    ),
    buildDimension(
      "businessModel",
      businessModelScore(normalized, company),
      "Business model is scored from the operating model, revenue model, pricing evidence, and unit economics.",
      [normalized.businessModel, normalized.revenueModel, normalized.unitEconomics],
    ),
    buildDimension(
      "competition",
      competitionScore(normalized),
      hasValue(normalized.competitors || normalized.competitorDescription) ? "The analysis rewards a concrete understanding of alternatives and their strengths and weaknesses." : "Competition is not documented; lack of competitors should not be treated as proof of an uncontested market.",
      [normalized.competitors || normalized.competitorDescription, normalized.competitorStrengths, normalized.competitorWeaknesses],
    ),
    buildDimension(
      "differentiation",
      scoreText({ value: normalized.differentiation, base: 10, maxBonus: 75, signals: ["unique", "different", "advantage", "moat", "proprietary", "exclusive", "faster", "cheaper", "better"] }),
      hasValue(normalized.differentiation) ? "Differentiation is evaluated for specificity and evidence of a durable advantage." : "The idea does not yet explain why customers will choose it over alternatives.",
      [normalized.differentiation, normalized.moat],
    ),
    buildDimension(
      "scalability",
      scoreText({ value: normalized.scalabilityPlan, base: 10, maxBonus: 75, signals: ["automate", "software", "self-serve", "platform", "network", "repeatable", "low marginal", "api"] }),
      hasValue(normalized.scalabilityPlan) ? "The scalability plan is evaluated for repeatability, automation, and marginal-cost characteristics." : "A clear path to repeatable growth is not documented.",
      [normalized.scalabilityPlan, normalized.operationalBottleneck],
    ),
    buildDimension(
      "timing",
      scoreText({ value: normalized.timingRationale, base: 10, maxBonus: 75, signals: POSITIVE_SIGNALS.timing }),
      hasValue(normalized.timingRationale) ? "Timing is evaluated from concrete market, technology, regulatory, and behavior changes." : "The reason this idea is timely is not documented.",
      [normalized.timingRationale],
    ),
    buildDimension(
      "completeness",
      completenessScore(normalized, company),
      "Completeness measures how much of the evidence required for a meaningful idea decision has been supplied.",
      [normalized.validationEvidence, normalized.assumptions],
    ),
  ];

  const ideaScore = round(dimensions.reduce((total, dimension) => total + (dimension.score * dimension.weight) / 100, 0));
  const insights = buildInsights(dimensions, normalized);

  return {
    dimensions,
    ideaScore,
    verdict: buildVerdict(ideaScore),
    ...insights,
  };
};
