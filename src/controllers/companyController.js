import Company from '../models/Company.js';
import CompanyMember from '../models/CompanyMember.js';
import User from '../models/User.js';
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

// @desc    Update SWOT Analysis Matrix
// @route   POST /api/v1/companies/:ticker/swot
export const updateSwot = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const { strengths, weaknesses, opportunities, threats } = req.body;

  const company = await Company.findOneAndUpdate(
    { ticker: ticker.toUpperCase() },
    {
      swot: {
        strengths: strengths || [],
        weaknesses: weaknesses || [],
        opportunities: opportunities || [],
        threats: threats || [],
      },
    },
    { new: true }
  );

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  return res.status(200).json(new ApiResponse(200, company.swot, 'SWOT analysis updated successfully'));
});

// @desc    Update PESTLE Analysis Matrix
// @route   POST /api/v1/companies/:ticker/pestle
export const updatePestle = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const { political, economic, social, technological, legal, environmental } = req.body;

  const company = await Company.findOneAndUpdate(
    { ticker: ticker.toUpperCase() },
    {
      pestle: {
        political: political || [],
        economic: economic || [],
        social: social || [],
        technological: technological || [],
        legal: legal || [],
        environmental: environmental || [],
      },
    },
    { new: true }
  );

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  return res.status(200).json(new ApiResponse(200, company.pestle, 'PESTLE analysis updated successfully'));
});

// @desc    Get Team Members for Company
// @route   GET /api/v1/companies/:ticker/members
export const getTeamMembers = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const company = await Company.findOne({ ticker: ticker.toUpperCase() });

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  const members = await CompanyMember.find({ companyId: company._id }).populate('userId', 'fullName email phone position avatarUrl');
  return res.status(200).json(new ApiResponse(200, members, 'Team members retrieved successfully'));
});

// @desc    Add / Invite Team Member to Company
// @route   POST /api/v1/companies/:ticker/members
export const addTeamMember = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const { email, roleOnCompany } = req.body;

  if (!email) {
    throw new ApiError(400, 'User email is required to add team member');
  }

  const company = await Company.findOne({ ticker: ticker.toUpperCase() });
  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  let user = await User.findOne({ email });
  if (!user) {
    // Auto-create user placeholder if inviting new team member
    user = await User.create({
      email,
      fullName: email.split('@')[0],
      password: 'DefaultUserPassword123!',
      role: 'founder',
    });
  }

  const member = await CompanyMember.findOneAndUpdate(
    { companyId: company._id, userId: user._id },
    {
      roleOnCompany: roleOnCompany || 'Viewer',
      status: 'Active',
      invitedBy: req.user ? req.user._id : null,
    },
    { new: true, upsert: true }
  ).populate('userId', 'fullName email phone position avatarUrl');

  return res.status(200).json(new ApiResponse(200, member, 'Team member added successfully'));
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
