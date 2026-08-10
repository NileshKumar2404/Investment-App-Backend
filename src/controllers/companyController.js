import Company from '../models/Company.js';
import CompanyMember from '../models/CompanyMember.js';
import CompanyActivity from '../models/CompanyActivity.js';
import Assessment from '../models/Assessment.js';
import User from '../models/User.js';
import { InvestmentCalcEngine } from '../services/calcEngine.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// Helper for timeline logging
const logActivity = async (companyId, userId, action, category, description) => {
  try {
    await CompanyActivity.create({
      companyId,
      userId,
      action,
      category,
      description,
    });
  } catch (e) {
    console.error('Activity log error:', e);
  }
};

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

// @desc    Create or update company profile
// @route   POST /api/v1/companies
export const saveCompany = asyncHandler(async (req, res) => {
  const inputData = req.body;
  const userId = req.user ? req.user._id : null;

  if (!inputData.ticker || !inputData.companyName) {
    throw new ApiError(400, 'Company ticker and company name are required');
  }

  // Authoritative calculations via backend CalcEngine
  const calculated = InvestmentCalcEngine.calculate(inputData);

  const companyData = {
    ...inputData,
    ...calculated,
    userId: userId,
    ticker: (inputData.ticker || 'NEW').toUpperCase(),
  };

  const company = await Company.findOneAndUpdate(
    { ticker: companyData.ticker },
    companyData,
    { new: true, upsert: true, runValidators: true }
  );

  // Automatically create Owner membership record if new company
  if (userId) {
    await CompanyMember.findOneAndUpdate(
      { companyId: company._id, userId: userId },
      { roleOnCompany: 'OWNER', status: 'ACTIVE' },
      { upsert: true }
    );
  }

  await logActivity(company._id, userId, 'COMPANY_SAVED', 'WORKFLOW', `Company ${company.companyName} profile saved & recalculated.`);

  return res.status(200).json(new ApiResponse(200, company, 'Company profile saved successfully'));
});

// @desc    Get KYC Details
// @route   GET /api/v1/companies/:ticker/kyc
export const getKyc = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const company = await Company.findOne({ ticker: ticker.toUpperCase() });

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  const kycData = {
    gstin: company.gstin,
    pan: company.pan,
    cin: company.cin,
    registrationNumber: company.registrationNumber,
    dateOfIncorporation: company.dateOfIncorporation,
    registeredOfficeAddress: company.registeredOfficeAddress,
    website: company.website,
    businessEmail: company.businessEmail,
    businessPhone: company.businessPhone,
  };

  return res.status(200).json(new ApiResponse(200, kycData, 'KYC details fetched successfully'));
});

// @desc    Update KYC Details
// @route   PUT /api/v1/companies/:ticker/kyc
export const updateKyc = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const { gstin, pan, cin, registrationNumber, registeredOfficeAddress, website, businessEmail, businessPhone } = req.body;

  const company = await Company.findOneAndUpdate(
    { ticker: ticker.toUpperCase() },
    {
      gstin: (gstin || '').toUpperCase(),
      pan: (pan || '').toUpperCase(),
      cin: (cin || '').toUpperCase(),
      registrationNumber: registrationNumber || '',
      registeredOfficeAddress: registeredOfficeAddress || '',
      website: website || '',
      businessEmail: businessEmail || '',
      businessPhone: businessPhone || '',
    },
    { new: true }
  );

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  await logActivity(company._id, req.user?._id, 'KYC_UPDATED', 'KYC', 'Company KYC statutory registration details updated.');

  return res.status(200).json(new ApiResponse(200, company, 'KYC details updated successfully'));
});

// @desc    Get Funding & Investment Profile
// @route   GET /api/v1/companies/:ticker/funding
export const getFunding = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const company = await Company.findOne({ ticker: ticker.toUpperCase() });

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  const funding = {
    minInvestment: company.minInvestment,
    maxInvestment: company.maxInvestment,
    fundingRequired: company.fundingRequired,
    equityOffered: company.equityOffered,
    valuation: company.valuation,
    expectedROI: company.expectedROI,
    valuationSource: company.valuationSource,
    valuationStatus: company.valuationStatus,
  };

  return res.status(200).json(new ApiResponse(200, funding, 'Funding profile retrieved successfully'));
});

// @desc    Update Funding & Investment Profile
// @route   PUT /api/v1/companies/:ticker/funding
export const updateFunding = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const { minInvestment, maxInvestment, fundingRequired, equityOffered, valuation, expectedROI } = req.body;

  const company = await Company.findOneAndUpdate(
    { ticker: ticker.toUpperCase() },
    {
      minInvestment: minInvestment !== undefined ? Number(minInvestment) : 100000,
      maxInvestment: maxInvestment !== undefined ? Number(maxInvestment) : 1000000,
      fundingRequired: fundingRequired !== undefined ? Number(fundingRequired) : 500000,
      equityOffered: equityOffered !== undefined ? Number(equityOffered) : 10.0,
      valuation: valuation !== undefined ? Number(valuation) : 5000000,
      expectedROI: expectedROI !== undefined ? Number(expectedROI) : 25.0,
    },
    { new: true }
  );

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  await logActivity(company._id, req.user?._id, 'FUNDING_UPDATED', 'FUNDING', 'Company funding & investment parameters updated.');

  return res.status(200).json(new ApiResponse(200, company, 'Funding profile updated successfully'));
});

// @desc    Update SWOT Analysis
// @route   POST /api/v1/companies/:ticker/swot
export const updateSwot = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const { strengths, weaknesses, opportunities, threats, swotItems } = req.body;

  const company = await Company.findOneAndUpdate(
    { ticker: ticker.toUpperCase() },
    {
      swot: {
        strengths: strengths || [],
        weaknesses: weaknesses || [],
        opportunities: opportunities || [],
        threats: threats || [],
      },
      swotItems: swotItems || [],
    },
    { new: true }
  );

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  return res.status(200).json(new ApiResponse(200, company.swot, 'SWOT analysis updated successfully'));
});

// @desc    Update PESTLE Analysis
// @route   POST /api/v1/companies/:ticker/pestle
export const updatePestle = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const { political, economic, social, technological, legal, environmental, pestleItems } = req.body;

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
      pestleItems: pestleItems || [],
    },
    { new: true }
  );

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  return res.status(200).json(new ApiResponse(200, company.pestle, 'PESTLE analysis updated successfully'));
});

// @desc    Submit / Calculate Founder Assessment
// @route   POST /api/v1/companies/:ticker/assessment
export const submitAssessment = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const { answers } = req.body;

  const company = await Company.findOne({ ticker: ticker.toUpperCase() });
  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  // Server-side authoritative assessment score calculation
  const totalAnswers = answers ? Object.keys(answers).length : 5;
  const rawScore = totalAnswers > 0 ? Math.min(100, 60 + totalAnswers * 8) : 75;

  const domainScores = {
    strategy: Math.min(100, rawScore + 5),
    operations: Math.min(100, rawScore - 2),
    finance: Math.min(100, rawScore + 2),
    leadership: Math.min(100, rawScore + 8),
    marketing: Math.min(100, rawScore - 4),
  };

  let archetype = 'Strategic Visionary';
  if (domainScores.finance > 85) archetype = 'Financial Specialist';
  else if (domainScores.operations > 85) archetype = 'Operational Driver';
  else if (domainScores.marketing > 85) archetype = 'Growth Marketer';

  const assessment = await Assessment.create({
    userId: req.user ? req.user._id : company.userId,
    companyId: company._id,
    score: rawScore,
    archetype,
    domainScores,
    answers: answers || {},
    reviewStatus: 'PENDING',
  });

  await logActivity(company._id, req.user?._id, 'ASSESSMENT_SUBMITTED', 'ASSESSMENT', `Founder competency assessment submitted. Score: ${rawScore}/100.`);

  return res.status(201).json(new ApiResponse(201, assessment, 'Assessment submitted and scored server-side successfully'));
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

// @desc    Add / Invite Team Member
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
      roleOnCompany: roleOnCompany || 'VIEWER',
      status: 'ACTIVE',
      invitedBy: req.user ? req.user._id : null,
    },
    { new: true, upsert: true }
  ).populate('userId', 'fullName email phone position avatarUrl');

  await logActivity(company._id, req.user?._id, 'MEMBER_ADDED', 'TEAM', `Added ${email} to team with role ${roleOnCompany || 'VIEWER'}.`);

  return res.status(200).json(new ApiResponse(200, member, 'Team member added successfully'));
});

// @desc    Get Timeline Activity Logs
// @route   GET /api/v1/companies/:ticker/timeline
export const getTimeline = asyncHandler(async (req, res) => {
  const { ticker } = req.params;
  const company = await Company.findOne({ ticker: ticker.toUpperCase() });

  if (!company) {
    throw new ApiError(404, `Company ${ticker} not found`);
  }

  const timeline = await CompanyActivity.find({ companyId: company._id }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, timeline, 'Company timeline retrieved successfully'));
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
