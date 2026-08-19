import Company from "../models/Company.js";
import CompanyMember from "../models/CompanyMember.js";
import CompanyActivity from "../models/CompanyActivity.js";
import Assessment from "../models/Assessment.js";
import User from "../models/User.js";

import { InvestmentCalcEngine } from "../services/calcEngine.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// ============================================================
// ACTIVITY LOGGER
// ============================================================

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
  } catch (error) {
    /**
     * Activity logging should never make
     * the main business operation fail.
     */
    console.error("Activity log error:", error);
  }
};

// ============================================================
// ROLE HELPERS
// ============================================================

const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toUpperCase();
};

const isCompanyOwnerOrFounder = (role) => {
  const normalizedRole = normalizeRole(role);

  return ["OWNER", "FOUNDER"].includes(normalizedRole);
};

// ============================================================
// GET ALL COMPANIES
// ============================================================

// @desc    Get all saved companies for the current user
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

// ============================================================
// SEARCH COMPANIES
// ============================================================

// @desc    Search companies by name, ticker, or sector
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

// ============================================================
// GET COMPANY BY TICKER
// ============================================================

// @desc    Get single company by ticker
// @route   GET /api/v1/companies/:ticker
export const getCompanyByTicker = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, company, "Company fetched successfully"));
});

// ============================================================
// CREATE OR UPDATE COMPANY
// ============================================================

// @desc    Create a new company or update a company the user owns
// @route   POST /api/v1/companies
export const saveCompany = asyncHandler(async (req, res) => {
  const inputData = req.body;

  const userId = req.user._id;

  // --------------------------------------------------------
  // BASIC VALIDATION
  // --------------------------------------------------------

  if (!inputData.companyName?.trim()) {
    throw new ApiError(400, "Company name is required");
  }

  if (!inputData.ticker?.trim()) {
    throw new ApiError(400, "Ticker symbol is required");
  }

  const normalizedTicker = inputData.ticker.trim().toUpperCase();

  // --------------------------------------------------------
  // BUSINESS EMAIL VALIDATION
  // --------------------------------------------------------

  if (
    inputData.businessEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputData.businessEmail)
  ) {
    throw new ApiError(400, "Invalid business email");
  }

  // --------------------------------------------------------
  // NUMERIC FIELD VALIDATION
  // --------------------------------------------------------

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

  // --------------------------------------------------------
  // CHECK WHETHER COMPANY ALREADY EXISTS
  // --------------------------------------------------------

  const existingCompany = await Company.findOne({
    ticker: normalizedTicker,
  });

  // ========================================================
  // NEW COMPANY
  // ========================================================

  if (!existingCompany) {
    const calculated = InvestmentCalcEngine.calculate(inputData);

    const companyData = {
      ...inputData,

      ticker: normalizedTicker,

      // Never trust client-side calculated values.
      ...calculated,

      userId,

      updatedAt: new Date(),
    };

    const company = await Company.create(companyData);

    // ------------------------------------------------------
    // CREATE OWNER MEMBERSHIP
    // ------------------------------------------------------

    await CompanyMember.findOneAndUpdate(
      {
        companyId: company._id,

        userId,
      },

      {
        roleOnCompany: "OWNER",

        status: "ACTIVE",

        invitedBy: userId,

        joinedAt: new Date(),
      },

      {
        upsert: true,

        setDefaultsOnInsert: true,

        new: true,
      },
    );

    await logActivity(
      company._id,
      userId,
      "COMPANY_CREATED",
      "WORKFLOW",
      `Company ${company.companyName} was created.`,
    );

    return res
      .status(201)
      .json(new ApiResponse(201, company, "Company created successfully"));
  }

  // ========================================================
  // EXISTING COMPANY
  // ========================================================

  /**
   * IMPORTANT SECURITY RULE:
   *
   * Knowing a company's ticker is NOT enough
   * to modify the company.
   *
   * The current user must have an ACTIVE
   * CompanyMember record.
   */

  const membership = await CompanyMember.findOne({
    companyId: existingCompany._id,

    userId,

    status: "ACTIVE",
  });

  if (!membership) {
    throw new ApiError(403, "You do not have access to modify this company.");
  }

  const normalizedRole = normalizeRole(membership.roleOnCompany);

  /**
   * Saving the complete company profile is
   * an owner/founder-level operation.
   */
  if (!isCompanyOwnerOrFounder(normalizedRole)) {
    throw new ApiError(
      403,
      "You do not have permission to modify this company profile.",
    );
  }

  // --------------------------------------------------------
  // RECALCULATE FINANCIAL DATA
  // --------------------------------------------------------

  const calculated = InvestmentCalcEngine.calculate(inputData);

  /**
   * Do not allow a client to change
   * ownership fields through this endpoint.
   */
  const companyData = {
    ...inputData,

    ticker: normalizedTicker,

    ...calculated,

    /**
     * Existing company ownership remains
     * unchanged.
     */
    userId: existingCompany.userId,

    updatedAt: new Date(),
  };

  // --------------------------------------------------------
  // UPDATE EXISTING COMPANY
  // --------------------------------------------------------

  const company = await Company.findByIdAndUpdate(
    existingCompany._id,

    companyData,

    {
      new: true,

      runValidators: true,

      setDefaultsOnInsert: true,
    },
  );

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  await logActivity(
    company._id,
    userId,
    "COMPANY_UPDATED",
    "WORKFLOW",
    `Company ${company.companyName} profile was updated and recalculated.`,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, company, "Company profile updated successfully"),
    );
});

// ============================================================
// GET KYC DETAILS
// ============================================================

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

// ============================================================
// UPDATE KYC DETAILS
// ============================================================

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

// ============================================================
// GET FUNDING
// ============================================================

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

// ============================================================
// UPDATE FUNDING
// ============================================================

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

// ============================================================
// UPDATE SWOT
// ============================================================

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

// ============================================================
// UPDATE PESTLE
// ============================================================

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

// ============================================================
// SUBMIT FOUNDER ASSESSMENT
// ============================================================

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
    Array.isArray(answers) ||
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

// ============================================================
// GET TEAM MEMBERS
// ============================================================

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

// ============================================================
// ADD / INVITE TEAM MEMBER
// ============================================================

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
   * OWNER must never be assigned
   * through the normal invitation API.
   */
  if (normalizedRole === "OWNER") {
    throw new ApiError(
      403,
      "Owner role cannot be assigned through team invitation.",
    );
  }

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
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

      joinedAt: new Date(),
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

// ============================================================
// GET TIMELINE
// ============================================================

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

// ============================================================
// DELETE COMPANY
// ============================================================

// @desc    Delete company by ticker
// @route   DELETE /api/v1/companies/:ticker
export const deleteCompany = asyncHandler(async (req, res) => {
  const company = req.company;

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  // --------------------------------------------------------
  // Verify current user's membership
  // --------------------------------------------------------

  const membership = await CompanyMember.findOne({
    companyId: company._id,

    userId: req.user._id,

    status: "ACTIVE",
  });

  if (!membership) {
    throw new ApiError(403, "You do not have access to this company.");
  }

  // --------------------------------------------------------
  // Only OWNER / FOUNDER can delete company
  // --------------------------------------------------------

  if (!isCompanyOwnerOrFounder(membership.roleOnCompany)) {
    throw new ApiError(
      403,
      "Only the company owner or founder can delete the company.",
    );
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

// ============================================================
// UPDATE TEAM ROSTER
// ============================================================

// @desc    Update company founder and team roster
// @route   PUT /api/v1/companies/:ticker/team
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

  const numericHeadcount = Number(headcount || 0);

  if (!Number.isFinite(numericHeadcount) || numericHeadcount < 0) {
    throw new ApiError(400, "Headcount must be a valid non-negative number");
  }

  company.headcount = numericHeadcount;

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
