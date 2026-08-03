import Company from '../models/Company.js';
import { InvestmentCalcEngine } from '../services/calcEngine.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// @desc    Get all saved companies (user specific + presets)
// @route   GET /api/v1/companies
export const getCompanies = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user._id : null;
  const query = userId ? { $or: [{ userId }, { isPreset: true }] } : {};

  const companies = await Company.find(query).sort({ updatedAt: -1 });
  return res.status(200).json(new ApiResponse(200, companies, 'Companies retrieved successfully'));
});

// @desc    Search companies by query (name, ticker, sector)
// @route   GET /api/v1/companies/search
export const searchCompanies = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === '') {
    const userId = req.user ? req.user._id : null;
    const query = userId ? { $or: [{ userId }, { isPreset: true }] } : {};
    const companies = await Company.find(query).sort({ updatedAt: -1 });
    return res.status(200).json(new ApiResponse(200, companies, 'Companies retrieved successfully'));
  }

  const regex = new RegExp(q.trim(), 'i');
  const searchFilter = {
    $or: [
      { ticker: regex },
      { companyName: regex },
      { sector: regex }
    ]
  };

  const companies = await Company.find(searchFilter).sort({ updatedAt: -1 });
  return res.status(200).json(new ApiResponse(200, companies, 'Company search results fetched successfully'));
});

// @desc    Get single company by ticker
// @route   GET /api/v1/companies/:ticker
export const getCompanyByTicker = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const company = await Company.findOne({ ticker: ticker.toUpperCase() });

  if (!company) {
    throw new ApiError(404, `Company with ticker ${ticker} not found`);
  }

  return res.status(200).json(new ApiResponse(200, company, 'Company fetched successfully'));
});

// @desc    Create or update company valuation model
// @route   POST /api/v1/companies
export const saveCompany = asyncHandler(async (req, res) => {
  const inputData = req.body;
  const userId = req.user ? req.user._id : null;

  if (!inputData.ticker || !inputData.companyName) {
    throw new ApiError(400, 'Company ticker and company name are required');
  }

  // Calculate valuation outputs via backend calculation engine
  const calculated = InvestmentCalcEngine.calculate(inputData);

  const companyData = {
    ...inputData,
    ...calculated,
    userId: userId,
    ticker: (inputData.ticker || 'NEW').toUpperCase(),
  };

  // Upsert company by ticker
  const company = await Company.findOneAndUpdate(
    { ticker: companyData.ticker },
    companyData,
    { new: true, upsert: true, runValidators: true }
  );

  return res.status(200).json(new ApiResponse(200, company, 'Company valuation saved successfully'));
});

// @desc    Delete company by ticker
// @route   DELETE /api/v1/companies/:ticker
export const deleteCompany = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const company = await Company.findOneAndDelete({ ticker: ticker.toUpperCase() });

  if (!company) {
    throw new ApiError(404, `Company with ticker ${ticker} not found`);
  }

  return res.status(200).json(new ApiResponse(200, null, `Company ${ticker} deleted successfully`));
});
