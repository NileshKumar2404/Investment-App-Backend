import Company from "../models/Company.js";
import CompanyActivity from "../models/CompanyActivity.js";
import { calculateStartupMetrics } from "../services/startupMetricsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const STARTUP_PROFILE_FIELDS = [
  "companyName", "logo", "industry", "sector", "foundingYear", "dateOfIncorporation", "website", "businessEmail", "businessPhone", "country", "city", "founderName", "coFounderNames", "headcount", "businessExperience", "productsServices", "targetAudience", "currentRevenue", "monthlyRevenue", "mrr", "monthlyExpenses", "monthlyBurn", "assets", "liabilities", "cashFlow", "revenueGrowthRate", "growthRate", "ebitdaMargin", "grossMargin", "cashBalance", "cashAvailable", "totalDebt", "customers", "leads", "cac", "ltv", "churnRate", "customerChurnRate", "conversionRate", "tam", "sam", "som", "marketingBudget", "marketingSpend",
];

const NUMERIC_FIELDS = new Set([
  "foundingYear", "headcount", "currentRevenue", "monthlyRevenue", "mrr", "monthlyExpenses", "monthlyBurn", "assets", "liabilities", "cashFlow", "revenueGrowthRate", "growthRate", "ebitdaMargin", "grossMargin", "cashBalance", "cashAvailable", "totalDebt", "customers", "leads", "cac", "ltv", "churnRate", "customerChurnRate", "conversionRate", "tam", "sam", "som", "marketingBudget", "marketingSpend",
]);

const POSITIVE_NUMERIC_FIELDS = new Set([
  "headcount", "currentRevenue", "monthlyRevenue", "mrr", "monthlyExpenses", "monthlyBurn", "assets", "liabilities", "cashFlow", "cashBalance", "cashAvailable", "totalDebt", "customers", "leads", "cac", "ltv", "conversionRate", "tam", "sam", "som", "marketingBudget", "marketingSpend",
]);

const PERCENT_FIELDS = new Set([
  "revenueGrowthRate", "growthRate", "ebitdaMargin", "grossMargin", "churnRate", "customerChurnRate", "conversionRate",
]);

const normalizeBody = (body = {}) => {
  const updates = {};

  for (const field of STARTUP_PROFILE_FIELDS) {
    if (body[field] === undefined) continue;

    if (NUMERIC_FIELDS.has(field)) {
      const value = Number(body[field]);
      if (!Number.isFinite(value)) throw new ApiError(400, `${field} must be a valid number.`);
      if (POSITIVE_NUMERIC_FIELDS.has(field) && value < 0) throw new ApiError(400, `${field} cannot be negative.`);
      if (PERCENT_FIELDS.has(field) && (value < 0 || value > 100)) throw new ApiError(400, `${field} must be between 0 and 100.`);
      updates[field] = value;
      continue;
    }

    if (field === "coFounderNames") {
      if (!Array.isArray(body[field])) throw new ApiError(400, "coFounderNames must be an array.");
      updates[field] = body[field].map((name) => String(name).trim()).filter(Boolean);
      continue;
    }

    if (field === "dateOfIncorporation") {
      const date = new Date(body[field]);
      if (Number.isNaN(date.getTime())) throw new ApiError(400, "dateOfIncorporation must be a valid date.");
      updates[field] = date;
      continue;
    }

    updates[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
  }

  return updates;
};

const applyAliases = (updates) => {
  const next = { ...updates };

  if (next.monthlyRevenue !== undefined && next.currentRevenue === undefined) next.currentRevenue = next.monthlyRevenue;
  if (next.currentRevenue !== undefined && next.monthlyRevenue === undefined) next.monthlyRevenue = next.currentRevenue;
  if (next.growthRate !== undefined && next.revenueGrowthRate === undefined) next.revenueGrowthRate = next.growthRate;
  if (next.revenueGrowthRate !== undefined && next.growthRate === undefined) next.growthRate = next.revenueGrowthRate;
  if (next.monthlyBurn !== undefined && next.monthlyExpenses === undefined) next.monthlyExpenses = next.monthlyBurn;
  if (next.monthlyExpenses !== undefined && next.monthlyBurn === undefined) next.monthlyBurn = next.monthlyExpenses;
  if (next.cashAvailable !== undefined && next.cashBalance === undefined) next.cashBalance = next.cashAvailable;
  if (next.cashBalance !== undefined && next.cashAvailable === undefined) next.cashAvailable = next.cashBalance;
  if (next.churnRate !== undefined && next.customerChurnRate === undefined) next.customerChurnRate = next.churnRate;
  if (next.customerChurnRate !== undefined && next.churnRate === undefined) next.churnRate = next.customerChurnRate;

  return next;
};

const buildProfilePayload = (company) => ({
  company: {
    id: company._id,
    ticker: company.ticker,
    companyName: company.companyName,
    industry: company.industry,
    sector: company.sector,
    foundingYear: company.foundingYear,
    website: company.website,
    businessEmail: company.businessEmail,
    businessPhone: company.businessPhone,
    country: company.country,
    city: company.city,
    founderName: company.founderName,
    coFounderNames: company.coFounderNames,
    headcount: company.headcount,
    businessExperience: company.businessExperience,
    productsServices: company.productsServices,
    targetAudience: company.targetAudience,
    currentRevenue: company.currentRevenue,
    monthlyExpenses: company.monthlyExpenses,
    revenueGrowthRate: company.revenueGrowthRate,
    grossMargin: company.grossMargin,
    cashBalance: company.cashBalance,
    customers: company.customers,
    leads: company.leads,
    cac: company.cac,
    ltv: company.ltv,
    conversionRate: company.conversionRate,
    tam: company.tam,
    sam: company.sam,
    som: company.som,
    marketingBudget: company.marketingBudget,
    marketingSpend: company.marketingSpend,
    churnRate: company.churnRate,
    updatedAt: company.updatedAt,
  },
  metrics: calculateStartupMetrics(company),
});

const logActivity = async (companyId, userId, action, description, metadata = {}) => {
  try {
    await CompanyActivity.create({ companyId, userId, action, category: "FINANCIAL", description, metadata });
  } catch (error) {
    console.error("Startup profile activity log error:", error);
  }
};

export const getStartupProfile = asyncHandler(async (req, res) => {
  const payload = buildProfilePayload(req.company);
  return res.status(200).json(new ApiResponse(200, payload, "Startup profile retrieved successfully."));
});

export const updateStartupProfile = asyncHandler(async (req, res) => {
  const updates = applyAliases(normalizeBody(req.body || {}));

  if (Object.keys(updates).length === 0) throw new ApiError(400, "At least one startup profile field is required.");

  // Startup Profile accepts a few founder-facing metric aliases that are not
  // yet first-class Company schema paths. The request is validated above, so
  // allow these profile fields to persist instead of Mongoose silently
  // stripping them under strict update mode.
  const company = await Company.findByIdAndUpdate(
    req.company._id,
    { $set: updates },
    { new: true, runValidators: true, strict: false },
  );

  if (!company) throw new ApiError(404, "Company not found.");

  await logActivity(company._id, req.user._id, "STARTUP_PROFILE_UPDATED", `Startup profile for ${company.ticker} was updated.`, { fields: Object.keys(updates) });

  return res.status(200).json(new ApiResponse(200, buildProfilePayload(company), "Startup profile updated successfully."));
});

export const getStartupMetrics = asyncHandler(async (req, res) => {
  const metrics = calculateStartupMetrics(req.company);
  return res.status(200).json(new ApiResponse(200, metrics, "Startup metrics calculated successfully."));
});
