import Company from "../models/Company.js";
import FinancialModel from "../models/FinancialModel.js";
import { buildFinancialModel } from "../services/financialModelService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getCompany = async (ticker) => {
  const company = await Company.findOne({ ticker: ticker.toUpperCase() });
  if (!company) throw new ApiError(404, "Company not found");
  return company;
};

export const createFinancialModel = asyncHandler(async (req, res) => {
  const company = await getCompany(req.params.ticker);
  const model = buildFinancialModel(company, req.body || {});
  const created = await FinancialModel.create({ companyId: company._id, createdBy: req.user._id, ...model });
  return res.status(201).json(new ApiResponse(201, created, "Financial model generated successfully"));
});

export const listFinancialModels = asyncHandler(async (req, res) => {
  const company = await getCompany(req.params.ticker);
  const models = await FinancialModel.find({ companyId: company._id }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, models, "Financial models fetched successfully"));
});

export const getFinancialModel = asyncHandler(async (req, res) => {
  const company = await getCompany(req.params.ticker);
  const model = await FinancialModel.findOne({ _id: req.params.modelId, companyId: company._id });
  if (!model) throw new ApiError(404, "Financial model not found");
  return res.status(200).json(new ApiResponse(200, model, "Financial model fetched successfully"));
});

export const getFinancialModelSummary = asyncHandler(async (req, res) => {
  const company = await getCompany(req.params.ticker);
  const model = await FinancialModel.findOne({ companyId: company._id }).sort({ createdAt: -1 });
  if (!model) throw new ApiError(404, "No financial model exists for this company");
  return res.status(200).json(new ApiResponse(200, { assumptions: model.assumptions, summary: model.summary, forecast: model.forecast }, "Financial model summary fetched successfully"));
});
