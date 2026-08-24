import mongoose from "mongoose";
import {Investment} from "../models/investment.js";
import Company from "../models/Company.js";
import CompanyMember from "../models/CompanyMember.js";
import CompanyActivity from "../models/CompanyActivity.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const INVESTOR_ROLE = "investor";

const ACTIVITY_MEMBERSHIP = "ACTIVE";

const ALLOWED_STATUSES = ["Active", "Exited", "Pending"];

const COMPANY_ROLES_ALLOWED_TO_MANAGE_INVESTMENTS = [
  "OWNER",
  "FOUNDER",
  "CO_FOUNDER",
  "FINANCE",
];

const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toLowerCase();
};

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
    console.error("Investment activity log error:", error);
  }
};

const validateObjectId = (value, message) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, message);
  }
};

const findCompanyByTicker = async (ticker) => {
  if (!ticker || typeof ticker !== "string") {
    throw new ApiError(400, "Company ticker is required.");
  }

  const normalizedTicker = ticker.trim().toUpperCase();

  const company = await Company.findOne({
    ticker: normalizedTicker,
  });

  if (!company) {
    throw new ApiError(400, "Company ticker is required.");
  }

  return company;
};

const findActiveMembership = async (userId, companyId) => {
  const membership = await CompanyMember.findOne({
    userId,
    companyId,
    status: ACTIVE_MEMBERSHIP,
  });

  if (!membership) {
    throw new ApiError(400, "Company ticker is required.");
  }

  return membership;
};

const requireInvestorRole = (user) => {
  if (!user) {
    throw new ApiError(400, "Authentication required.");
  }

  if (normalizeRole(user.role) !== INVESTOR_ROLE) {
    throw new ApiError(400, "Only investors users can access this portfolio.");
  }
};

const requireInvestmentManagementRole = (membership) => {
  const role = String(membership?.roleOnCompany || "")
    .trim()
    .toUpperCase();

  if (!COMPANY_ROLES_ALLOWED_TO_MANAGE_INVESTMENTS.includes(role)) {
    throw new ApiError(
      400,
      "You do not have permission to manage investments for this company.",
    );
  }

  return role;
};

const normalizeStatus = (status) => {
  if (status === undefined || status === null || String(status).trim() === "") {
    return "Active";
  }

  const normalized = String(status).trim();

  const matched = ALLOWED_STATUSES.find(
    (item) => item.toLowerCase() === normalized.toLowerCase(),
  );

  return matched || null;
};

const normalizedDate = (value, fieldName) => {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid date.`);
  }

  return date;
};

const validateInvestmentInput = ({
  amount,
  equity,
  investmentDate,
  currentValue,
  status,
  round,
}) => {
  if (amount === undefined || amount === null) {
    throw new ApiError(400, "Investment amount is required.");
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    throw new ApiError(400, "Investment amount must be a valid number.");
  }

  if (numericAmount <= 0) {
    throw new ApiError(400, "Company ticker is required.");
  }

  if (equity === undefined || equity === null) {
    throw new ApiError(400, "Equity is required.");
  }

  const numericEquity = Number(equity);

  if (!Number.isFinite(numericEquity)) {
    throw new ApiError(400, "Equity must be a valid number.");
  }

  if (numericEquity < 0 || numericEquity > 100) {
    throw new ApiError(400, "Equity must be between 0 and 100.");
  }

  if (currentValue === undefined || currentValue === null) {
    throw new ApiError(400, "Current value is required.");
  }

  const numericCurrentValue = Number(currentValue);

  if (!Number.isFinite(numericCurrentValue)) {
    throw new ApiError(400, "Current value must be a valid number.");
  }

  if (numericCurrentValue < 0) {
    throw new ApiError(400, "Current value cannot be negative.");
  }

  // ----------------------------------------------------------
  // Status
  // ----------------------------------------------------------

  const normalizedStatus = normalizeStatus(status);

  if (!normalizedStatus) {
    throw new ApiError(400, "Invalid investment status.");
  }

  // ----------------------------------------------------------
  // Investment date
  // ----------------------------------------------------------

  const normalizedInvestmentDate = normalizeDate(
    investmentDate,
    "Investment date",
  );

  // ----------------------------------------------------------
  // Round
  // ----------------------------------------------------------

  const normalizedRound =
    round === undefined || round === null ? "" : String(round).trim();

  return {
    numericAmount,
    numericEquity,
    numericCurrentValue,
    normalizedStatus,
    normalizedInvestmentDate,
    normalizedRound,
  };
};

// ============================================================
// CALCULATE ROI
// ============================================================
//
// ROI = ((Current Value - Investment Amount)
//        / Investment Amount) * 100
//
// We calculate this on the server instead of trusting
// a value supplied by the client.
//
// ============================================================

const calculateROI = (amount, currentValue) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const roi = ((currentValue - amount) / amount) * 100;

  return Number(roi.toFixed(2));
};

export const getMyInvestments = asyncHandler(async (req, res) => {
  requireInvestorRole(req.user);

  const { status, companyId } = req.query;

  const filter = {
    investorId: req.user._id,
  };

  // --------------------------------------------------------
  // Optional status filter
  // --------------------------------------------------------

  if (status) {
    const normalizedStatus = normalizeStatus(status);

    if (!normalizedStatus) {
      throw new ApiError(400, "Invalid investment status.");
    }

    filter.status = normalizedStatus;
  }

  // --------------------------------------------------------
  // Optional company filter
  // --------------------------------------------------------

  if (companyId) {
    validateObjectId(companyId, "Invalid company identifier.");

    /**
     * Important:
     *
     * We do NOT accept an arbitrary
     * investorId from the client.
     *
     * investorId always comes from
     * req.user.
     */
    filter.companyId = companyId;
  }

  const investments = await Investment.find(filter)
    .populate("companyId", "companyName ticker sector logoUrl")
    .sort({
      investmentDate: -1,
      createdAt: -1,
    });

  return res
    .status(200)
    .json(
      new ApiResponse(200, investments, "Investments retrieved successfully."),
    );
});

// ============================================================
// GET MY PORTFOLIO SUMMARY
// ============================================================

// @desc    Get authenticated investor portfolio summary
// @route   GET /api/v1/investments/my/portfolio
// @access  Protected + Investor

export const getMyPortfolio = asyncHandler(async (req, res) => {
  requireInvestorRole(req.user);

  const investments = await Investment.find({
    investorId: req.user._id,
  });

  let totalInvested = 0;

  let currentPortfolioValue = 0;

  let activeInvestments = 0;

  let exitedInvestments = 0;

  let pendingInvestments = 0;

  for (const investment of investments) {
    totalInvested += Number(investment.amount || 0);

    currentPortfolioValue += Number(investment.currentValue || 0);

    if (investment.status === "Active") {
      activeInvestments += 1;
    }

    if (investment.status === "Exited") {
      exitedInvestments += 1;
    }

    if (investment.status === "Pending") {
      pendingInvestments += 1;
    }
  }

  const totalROI =
    totalInvested > 0
      ? Number(
          (
            ((currentPortfolioValue - totalInvested) / totalInvested) *
            100
          ).toFixed(2),
        )
      : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalInvested: Number(totalInvested.toFixed(2)),

        currentPortfolioValue: Number(currentPortfolioValue.toFixed(2)),

        totalROI,

        investmentCount: investments.length,

        activeInvestments,

        exitedInvestments,

        pendingInvestments,
      },
      "Portfolio summary retrieved successfully.",
    ),
  );
});

// ============================================================
// GET INVESTMENTS FOR A COMPANY
// ============================================================

// @desc    Get investments belonging to a company
// @route   GET /api/v1/investments/company/:ticker
// @access  Protected + Company Member

export const getCompanyInvestments = asyncHandler(async (req, res) => {
  const company = await findCompanyByTicker(req.params.ticker);

  /**
   * Company access is checked here as an
   * object-level authorization check.
   */
  await findActiveMembership(req.user._id, company._id);

  const investments = await Investment.find({
    companyId: company._id,
  })
    .populate("investorId", "fullName email avatarUrl")
    .sort({
      investmentDate: -1,
      createdAt: -1,
    });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        investments,
        "Company investments retrieved successfully.",
      ),
    );
});

// ============================================================
// CREATE INVESTMENT
// ============================================================

// @desc    Create an investment
// @route   POST /api/v1/investments/:ticker
// @access  Protected + Company Investment Management

export const createInvestment = asyncHandler(async (req, res) => {
  const company = await findCompanyByTicker(req.params.ticker);

  const membership = await findActiveMembership(req.user._id, company._id);

  requireInvestmentManagementRole(membership);

  const {
    investorId,
    amount,
    equity,
    investmentDate,
    currentValue,
    status,
    round,
  } = req.body;

  // --------------------------------------------------------
  // Investor must be specified
  // --------------------------------------------------------

  validateObjectId(investorId, "Valid investor ID is required.");

  // --------------------------------------------------------
  // Validate target investor
  // --------------------------------------------------------

  const User = (await import("../models/User.js")).default;

  const investor = await User.findOne({
    _id: investorId,
    role: "investor",
    accountStatus: "Active",
  });

  if (!investor) {
    throw new ApiError(
      400,
      "The selected investor is not a valid active investor.",
    );
  }

  // --------------------------------------------------------
  // Validate investment data
  // --------------------------------------------------------

  const {
    numericAmount,
    numericEquity,
    numericCurrentValue,
    normalizedStatus,
    normalizedInvestmentDate,
    normalizedRound,
  } = validateInvestmentInput({
    amount,
    equity,
    investmentDate,
    currentValue,
    status,
    round,
  });

  // --------------------------------------------------------
  // Calculate ROI server-side
  // --------------------------------------------------------

  const roi = calculateROI(numericAmount, numericCurrentValue);

  // --------------------------------------------------------
  // Create investment
  // --------------------------------------------------------

  const investment = await Investment.create({
    investorId,
    companyId: company._id,
    amount: numericAmount,
    equity: numericEquity,
    investmentDate: normalizedInvestmentDate,
    currentValue: numericCurrentValue,
    roi,
    status: normalizedStatus,
    round: normalizedRound,
  });

  // --------------------------------------------------------
  // Activity log
  // --------------------------------------------------------

  await logActivity(
    company._id,
    req.user._id,
    "INVESTMENT_CREATED",
    "INVESTMENT",
    `Investment created for investor ${investor.email}. Amount: ${numericAmount}.`,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, investment, "Investment created successfully."));
});

// ============================================================
// UPDATE INVESTMENT
// ============================================================

// @desc    Update an investment
// @route   PUT /api/v1/investments/:id
// @access  Protected + Company Investment Management

export const updateInvestment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  validateObjectId(id, "Invalid investment ID.");

  const investment = await Investment.findById(id);

  if (!investment) {
    throw new ApiError(404, "Investment not found.");
  }

  // --------------------------------------------------------
  // Verify company access
  // --------------------------------------------------------

  const membership = await findActiveMembership(
    req.user._id,
    investment.companyId,
  );

  requireInvestmentManagementRole(membership);

  const { amount, equity, investmentDate, currentValue, status, round } =
    req.body;

  // --------------------------------------------------------
  // Use existing values for omitted fields
  // --------------------------------------------------------

  const nextAmount = amount !== undefined ? amount : investment.amount;

  const nextEquity = equity !== undefined ? equity : investment.equity;

  const nextInvestmentDate =
    investmentDate !== undefined ? investmentDate : investment.investmentDate;

  const nextCurrentValue =
    currentValue !== undefined ? currentValue : investment.currentValue;

  const nextStatus = status !== undefined ? status : investment.status;

  const nextRound = round !== undefined ? round : investment.round;

  const {
    numericAmount,
    numericEquity,
    numericCurrentValue,
    normalizedStatus,
    normalizedInvestmentDate,
    normalizedRound,
  } = validateInvestmentInput({
    amount: nextAmount,

    equity: nextEquity,

    investmentDate: nextInvestmentDate,

    currentValue: nextCurrentValue,

    status: nextStatus,

    round: nextRound,
  });

  // --------------------------------------------------------
  // Recalculate ROI
  // --------------------------------------------------------

  const roi = calculateROI(numericAmount, numericCurrentValue);

  // --------------------------------------------------------
  // Update
  // --------------------------------------------------------

  investment.amount = numericAmount;

  investment.equity = numericEquity;

  investment.investmentDate = normalizedInvestmentDate;

  investment.currentValue = numericCurrentValue;

  investment.roi = roi;

  investment.status = normalizedStatus;

  investment.round = normalizedRound;

  await investment.save();

  // --------------------------------------------------------
  // Activity log
  // --------------------------------------------------------

  await logActivity(
    investment.companyId,
    req.user._id,
    "INVESTMENT_UPDATED",
    "INVESTMENT",
    `Investment ${investment._id} was updated.`,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, investment, "Investment updated successfully."));
});

// ============================================================
// DELETE INVESTMENT
// ============================================================

// @desc    Delete an investment
// @route   DELETE /api/v1/investments/:id
// @access  Protected + Company Investment Management

export const deleteInvestment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  validateObjectId(id, "Invalid investment ID.");

  const investment = await Investment.findById(id);

  if (!investment) {
    throw new ApiError(404, "Investment not found.");
  }

  // --------------------------------------------------------
  // Verify company membership
  // --------------------------------------------------------

  const membership = await findActiveMembership(
    req.user._id,
    investment.companyId,
  );

  requireInvestmentManagementRole(membership);

  // --------------------------------------------------------
  // Delete
  // --------------------------------------------------------

  await Investment.findByIdAndDelete(investment._id);

  // --------------------------------------------------------
  // Activity log
  // --------------------------------------------------------

  await logActivity(
    investment.companyId,
    req.user._id,
    "INVESTMENT_DELETED",
    "INVESTMENT",
    `Investment ${investment._id} was deleted.`,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Investment deleted successfully."));
});
