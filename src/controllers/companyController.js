import Company from "../models/Company.js";
import CompanyMember from "../models/CompanyMember.js";
import CompanyActivity from "../models/CompanyActivity.js";
import Assessment from "../models/Assessment.js";
import User from "../models/User.js";
import { InvestmentCalcEngine } from "../services/calcEngine.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Helper for timeline logging
const logActivity = async (
  companyId,
  userId,
  action,
  category,
  description,
) => {
  try {
    await CompanyActivity.create({
      companyId,
      userId,
      action,
      category,
      description,
    });
  } catch (e) {
    console.error("Activity log error:", e);
  }
};

// @desc    Get all saved companies (user specific + presets)
// @route   GET /api/v1/companies
export const getCompanies = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const memberships = await CompanyMember.find({
    userId,
    status: "ACTIVE",
  }).select("companyId");

  const companyIds = memberships.map((membership) => membership.companyId);

  const companies = await Company.find({
    $or: [
      {
        _id: {
          $in: companyIds,
        },
      },
      {
        userId,
      },
      {
        isPreset: true,
      },
    ],
  }).sort({
    updatedAt: -1,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, companies, "Companies retrieved successfully"));
});

// @desc    Search companies by query (name, ticker, sector)
// @route   GET /api/v1/companies/search
export const searchCompanies = asyncHandler(async (req, res) => {
  const { q = "" } = req.query;
  const userId = req.user._id;

  const memberships = await CompanyMember.find({
    userId,
    status: "ACTIVE",
  }).select("companyId");

  const companyIds = memberships.map((membership) => membership.companyId);

  if (!q.trim()) {
    const companies = await Company.find({
      $or: [
        {
          _id: {
            $in: companyIds,
          },
        },
        {
          userId,
        },
        {
          isPreset: true,
        },
      ],
    }).sort({
      updatedAt: -1,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, companies, "Companies retrieved successfully"),
      );
  }

  const regex = new RegExp(q.trim(), "i");

  const companies = await Company.find({
    $and: [
      {
        $or: [
          {
            _id: {
              $in: companyIds,
            },
          },
          {
            userId,
          },
          {
            isPreset: true,
          },
        ],
      },
      {
        $or: [
          {
            ticker: regex,
          },
          {
            companyName: regex,
          },
          {
            sector: regex,
          },
        ],
      },
    ],
  }).sort({
    updatedAt: -1,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        companies,
        "Company search results fetched successfully",
      ),
    );
});

// @desc    Get single company by ticker
// @route   GET /api/v1/companies/:ticker
export const getCompanyByTicker = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, `Company with ticker ${ticker} not found`);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, company, "Company fetched successfully"));
});

// @desc    Create or update company profile
// @route   POST /api/v1/companies
export const saveCompany = asyncHandler(async (req, res) => {
  const inputData = req.body;

  const userId = req.user._id;

  if (!inputData.companyName?.trim()) {
    throw new ApiError(400, "Company name is required");
  }

  if (!inputData.ticker?.trim()) {
    throw new ApiError(400, "Ticker symbol is required");
  }

  const normalizedTicker = inputData.ticker.trim().toUpperCase();

  if (
    inputData.businessEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputData.businessEmail)
  ) {
    throw new ApiError(400, "Invalid business email");
  }

  const numericFields = [
    "currentRevenue",
    "monthlyExpenses",
    "assets",
    "liabilities",
    "cashFlow",
    "revenueGrowthRate",
    "ebitdaMargin",
    "grossMargin",
    "cashBalance",
    "totalDebt",
    "discountRate",
    "terminalGrowthRate",
    "currentSharePrice",
    "sharesOutstanding",
    "minInvestment",
    "maxInvestment",
    "fundingRequired",
    "equityOffered",
    "valuation",
    "expectedROI",
    "marketingBudget",
    "marketingSpend",
    "customers",
    "leads",
    "tam",
    "sam",
    "som",
  ];

  for (const field of numericFields) {
    if (
      inputData[field] !== undefined &&
      inputData[field] !== null &&
      Number.isNaN(Number(inputData[field]))
    ) {
      throw new ApiError(400, `${field} must be a valid number`);
    }
  }

  const calculated = InvestmentCalcEngine.calculate(inputData);

  const companyData = {
    ...inputData,

    ticker: normalizedTicker,

    // Never trust client calculated values.
    ...calculated,

    userId,

    updatedAt: new Date(),
  };

  const company = await Company.findOneAndUpdate(
    { ticker: normalizedTicker },
    companyData,
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  await CompanyMember.findOneAndUpdate(
    {
      companyId: company._id,

      userId,
    },

    {
      roleOnCompany: "OWNER",

      status: "ACTIVE",

      invitedBy: userId,
    },

    {
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  await logActivity(
    company._id,
    userId,
    "COMPANY_SAVED",
    "WORKFLOW",
    `Company ${company.companyName} profile saved and recalculated.`,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, company, "Company profile saved successfully"));
});

// @desc    Get KYC Details
// @route   GET /api/v1/companies/:ticker/kyc
export const getKyc = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
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

  return res
    .status(200)
    .json(new ApiResponse(200, kycData, "KYC details fetched successfully"));
});

// @desc    Update KYC Details
// @route   PUT /api/v1/companies/:ticker/kyc
export const updateKyc = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const {
    gstin,
    pan,
    cin,
    registrationNumber,
    registeredOfficeAddress,
    website,
    businessEmail,
    businessPhone,
  } = req.body;

  if (businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
    throw new ApiError(400, "Invalid business email");
  }

  company.gstin = gstin ? gstin.toUpperCase() : "";

  company.pan = pan ? pan.toUpperCase() : "";

  company.cin = cin ? cin.toUpperCase() : "";

  company.registrationNumber = registrationNumber || "";

  company.registeredOfficeAddress = registeredOfficeAddress || "";

  company.website = website || "";

  company.businessEmail = businessEmail || "";

  company.businessPhone = businessPhone || "";

  await company.save();

  await logActivity(
    company._id,
    req.user._id,
    "KYC_UPDATED",
    "KYC",
    "Company KYC statutory registration details updated.",
  );

  return res
    .status(200)
    .json(new ApiResponse(200, company, "KYC details updated successfully"));
});

// @desc    Get Funding & Investment Profile
// @route   GET /api/v1/companies/:ticker/funding
export const getFunding = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
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

  return res
    .status(200)
    .json(
      new ApiResponse(200, funding, "Funding profile retrieved successfully"),
    );
});

// @desc    Update Funding & Investment Profile
// @route   PUT /api/v1/companies/:ticker/funding
export const updateFunding = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const {
    minInvestment,
    maxInvestment,
    fundingRequired,
    equityOffered,
    valuation,
    expectedROI,
  } = req.body;

  const values = {
    minInvestment:
      minInvestment !== undefined
        ? Number(minInvestment)
        : company.minInvestment,

    maxInvestment:
      maxInvestment !== undefined
        ? Number(maxInvestment)
        : company.maxInvestment,

    fundingRequired:
      fundingRequired !== undefined
        ? Number(fundingRequired)
        : company.fundingRequired,

    equityOffered:
      equityOffered !== undefined
        ? Number(equityOffered)
        : company.equityOffered,

    valuation: valuation !== undefined ? Number(valuation) : company.valuation,

    expectedROI:
      expectedROI !== undefined ? Number(expectedROI) : company.expectedROI,
  };

  for (const [field, value] of Object.entries(values)) {
    if (Number.isNaN(value)) {
      throw new ApiError(400, `${field} must be a valid number`);
    }
  }

  Object.assign(company, values);

  await company.save();

  await logActivity(
    company._id,
    req.user._id,
    "FUNDING_UPDATED",
    "FUNDING",
    "Company funding & investment parameters updated.",
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, company, "Funding profile updated successfully"),
    );
});

// @desc    Update SWOT Analysis
// @route   POST /api/v1/companies/:ticker/swot
export const updateSwot = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const { strengths, weaknesses, opportunities, threats, swotItems } = req.body;

  company.swot = {
    strengths: Array.isArray(strengths) ? strengths : [],

    weaknesses: Array.isArray(weaknesses) ? weaknesses : [],

    opportunities: Array.isArray(opportunities) ? opportunities : [],

    threats: Array.isArray(threats) ? threats : [],
  };

  company.swotItems = Array.isArray(swotItems) ? swotItems : [];

  await company.save();

  await logActivity(
    company._id,
    req.user._id,
    "SWOT_UPDATED",
    "STRATEGY",
    "SWOT analysis updated.",
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, company.swot, "SWOT analysis updated successfully"),
    );
});

// @desc    Update PESTLE Analysis
// @route   POST /api/v1/companies/:ticker/pestle
export const updatePestle = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const {
    political,
    economic,
    social,
    technological,
    legal,
    environmental,
    pestleItems,
  } = req.body;

  company.pestle = {
    political: Array.isArray(political) ? political : [],

    economic: Array.isArray(economic) ? economic : [],

    social: Array.isArray(social) ? social : [],

    technological: Array.isArray(technological) ? technological : [],

    legal: Array.isArray(legal) ? legal : [],

    environmental: Array.isArray(environmental) ? environmental : [],
  };

  company.pestleItems = Array.isArray(pestleItems) ? pestleItems : [];

  await company.save();

  await logActivity(
    company._id,
    req.user._id,
    "PESTLE_UPDATED",
    "STRATEGY",
    "PESTLE analysis updated.",
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        company.pestle,
        "PESTLE analysis updated successfully",
      ),
    );
});

// @desc    Submit / Calculate Founder Assessment
// @route   POST /api/v1/companies/:ticker/assessment
export const submitAssessment = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const { answers } = req.body;

  if (
    !answers ||
    typeof answers !== "object" ||
    Object.keys(answers).length === 0
  ) {
    throw new ApiError(400, "Assessment answers are required");
  }

  const totalQuestions = Object.keys(answers).length;

  const positiveAnswers = Object.values(answers).filter(
    (answer) => Number(answer) >= 4,
  ).length;

  const rawScore = Math.min(
    100,
    Math.round((positiveAnswers / totalQuestions) * 100),
  );

  const domainScores = {
    strategy: rawScore,

    operations: rawScore,

    finance: rawScore,

    leadership: rawScore,

    marketing: rawScore,
  };

  let archetype = "Strategic Visionary";

  if (domainScores.finance >= 85) {
    archetype = "Financial Specialist";
  } else if (domainScores.operations >= 85) {
    archetype = "Operational Driver";
  } else if (domainScores.marketing >= 85) {
    archetype = "Growth Marketer";
  }

  const assessment = await Assessment.create({
    userId: req.user._id,

    companyId: company._id,

    score: rawScore,

    archetype,

    domainScores,

    answers,

    reviewStatus: "PENDING",
  });

  company.assessmentCompleted = true;

  company.assessmentScore = rawScore;

  company.assessmentArchetype = archetype;

  company.assessmentDomainScores = domainScores;

  company.completeness = {
    ...(company.completeness?.toObject?.() || company.completeness || {}),

    assessment: 100,
  };

  await company.save();

  await logActivity(
    company._id,
    req.user._id,
    "ASSESSMENT_SUBMITTED",
    "ASSESSMENT",
    `Founder competency assessment submitted. Score: ${rawScore}/100.`,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        assessment,
        "Founder assessment submitted successfully",
      ),
    );
});

// @desc    Get Team Members for Company
// @route   GET /api/v1/companies/:ticker/members
export const getTeamMembers = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const members = await CompanyMember.find({
    companyId: company._id,

    status: "ACTIVE",
  }).populate("userId", "fullName email phone position avatarUrl role");

  return res
    .status(200)
    .json(new ApiResponse(200, members, "Team members retrieved successfully"));
});

// @desc    Add / Invite Team Member
// @route   POST /api/v1/companies/:ticker/members
export const addTeamMember = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const { email, roleOnCompany } = req.body;

  if (!email?.trim()) {
    throw new ApiError(400, "User email is required to add team member");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const allowedRoles = [
    "FOUNDER",
    "CO_FOUNDER",
    "FINANCE",
    "ANALYST",
    "ADVISOR",
    "VIEWER",
  ];

  const normalizedRole = String(roleOnCompany || "VIEWER")
    .trim()
    .toUpperCase();

  if (!allowedRoles.includes(normalizedRole)) {
    throw new ApiError(400, "Invalid company role");
  }

  /**
   * Do not allow the requester to create
   * another OWNER through the invitation API.
   */
  if (normalizedRole === "OWNER") {
    throw new ApiError(
      403,
      "Owner role cannot be assigned through team invitation.",
    );
  }

  let user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
    /**
     * IMPORTANT:
     *
     * We should not create a fake user with a
     * hardcoded password.
     *
     * Instead create an invitation/pending account
     * flow later.
     *
     * For now, require the user to already exist.
     */
    throw new ApiError(
      404,
      "No user exists with this email. Ask the user to register first.",
    );
  }

  const member = await CompanyMember.findOneAndUpdate(
    {
      companyId: company._id,

      userId: user._id,
    },

    {
      roleOnCompany: normalizedRole,

      status: "ACTIVE",

      invitedBy: req.user._id,
    },

    {
      new: true,

      upsert: true,

      setDefaultsOnInsert: true,
    },
  ).populate("userId", "fullName email phone position avatarUrl role");

  await logActivity(
    company._id,
    req.user._id,
    "MEMBER_ADDED",
    "TEAM",
    `Added ${normalizedEmail} to team with role ${normalizedRole}.`,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, member, "Team member added successfully"));
});

// @desc    Get Timeline Activity Logs
// @route   GET /api/v1/companies/:ticker/timeline
export const getTimeline = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const timeline = await CompanyActivity.find({
    companyId: company._id,
  }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, timeline, "Company timeline retrieved successfully"),
    );
});

// @desc    Delete company by ticker
// @route   DELETE /api/v1/companies/:ticker
export const deleteCompany = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const ticker = company.ticker;

  await CompanyMember.deleteMany({
    companyId: company._id,
  });

  await CompanyActivity.deleteMany({
    companyId: company._id,
  });

  await Company.findByIdAndDelete(company._id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, `Company ${ticker} deleted successfully`));
});

export const updateTeamRoster = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const {
    founderName,
    coFounderNames,
    headcount,
    businessExperience,
    teamMembers,
  } = req.body;

  company.founderName = founderName || "";

  company.coFounderNames = Array.isArray(coFounderNames) ? coFounderNames : [];

  company.headcount = Number(headcount || 0);

  company.businessExperience = businessExperience || "";

  company.teamMembers = Array.isArray(teamMembers) ? teamMembers : [];

  await company.save();

  await logActivity(
    company._id,
    req.user._id,
    "TEAM_UPDATED",
    "TEAM",
    "Company founder and team roster updated.",
  );

  return res
    .status(200)
    .json(new ApiResponse(200, company, "Team roster updated successfully"));
});
