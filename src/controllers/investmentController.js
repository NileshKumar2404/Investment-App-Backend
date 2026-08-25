import mongoose from "mongoose";
import { Investment } from "../models/investment.js";
import Company from "../models/Company.js";
import CompanyMember from "../models/CompanyMember.js";
import CompanyActivity from "../models/CompanyActivity.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const INVESTOR_ROLE = "investor";
const ACTIVE_MEMBERSHIP = "ACTIVE";
const ALLOWED_STATUSES = ["Active", "Exited", "Pending"];
const COMPANY_ROLES_ALLOWED_TO_MANAGE_INVESTMENTS = [
  "OWNER",
  "FOUNDER",
  "CO_FOUNDER",
  "FINANCE",
];

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase();

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

  const company = await Company.findOne({
    ticker: ticker.trim().toUpperCase(),
  });

  if (!company) {
    throw new ApiError(404, "Company not found.");
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
    throw new ApiError(403, "You do not have access to this company.");
  }

  return membership;
};

const requireInvestorRole = (user) => {
  if (!user) {
    throw new ApiError(401, "Authentication required.");
  }

  if (normalizeRole(user.role) !== INVESTOR_ROLE) {
    throw new ApiError(403, "Only investors can access this portfolio.");
  }
};

const requireInvestmentManagementRole = (membership) => {
  const role = String(membership?.roleOnCompany || "")
    .trim()
    .toUpperCase();

  if (!COMPANY_ROLES_ALLOWED_TO_MANAGE_INVESTMENTS.includes(role)) {
    throw new ApiError(
      403,
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
  return (
    ALLOWED_STATUSES.find(
      (item) => item.toLowerCase() === normalized.toLowerCase(),
    ) || null
  );
};

const normalizeDate = (value, fieldName) => {
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
    throw new ApiError(400, "Investment amount must be greater than zero.");
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

  const normalizedStatus = normalizeStatus(status);
  if (!normalizedStatus) {
    throw new ApiError(400, "Invalid investment status.");
  }

  const normalizedInvestmentDate = normalizeDate(
    investmentDate,
    "Investment date",
  );

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

const calculateROI = (amount, currentValue) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Number((((currentValue - amount) / amount) * 100).toFixed(2));
};

export const getMyInvestments = asyncHandler(async (req, res) => {
  requireInvestorRole(req.user);

  const { status, companyId } = req.query;
  const filter = { investorId: req.user._id };

  if (status) {
    const normalizedStatus = normalizeStatus(status);
    if (!normalizedStatus) {
      throw new ApiError(400, "Invalid investment status.");
    }
    filter.status = normalizedStatus;
  }

  if (companyId) {
    validateObjectId(companyId, "Invalid company identifier.");
    filter.companyId = companyId;
  }

  const investments = await Investment.find(filter)
    .populate("companyId", "companyName ticker sector logoUrl")
    .sort({ investmentDate: -1, createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, investments, "Investments retrieved successfully."),
    );
});

export const getMyPortfolio = asyncHandler(async (req, res) => {
  requireInvestorRole(req.user);

  const investments = await Investment.find({ investorId: req.user._id });

  let totalInvested = 0;
  let currentPortfolioValue = 0;
  let activeInvestments = 0;
  let exitedInvestments = 0;
  let pendingInvestments = 0;

  for (const investment of investments) {
    totalInvested += Number(investment.amount || 0);
    currentPortfolioValue += Number(investment.currentValue || 0);

    if (investment.status === "Active") activeInvestments += 1;
    if (investment.status === "Exited") exitedInvestments += 1;
    if (investment.status === "Pending") pendingInvestments += 1;
  }

  const totalROI =
    totalInvested > 0
      ? Number(
          (((currentPortfolioValue - totalInvested) / totalInvested) * 100).toFixed(
            2,
          ),
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

export const getCompanyInvestments = asyncHandler(async (req, res) => {
  const company = await findCompanyByTicker(req.params.ticker);
  await findActiveMembership(req.user._id, company._id);

  const investments = await Investment.find({ companyId: company._id })
    .populate("investorId", "fullName email avatarUrl")
    .sort({ investmentDate: -1, createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      investments,
      "Company investments retrieved successfully.",
    ),
  );
});

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

  validateObjectId(investorId, "Valid investor ID is required.");

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

  const investment = await Investment.create({
    investorId,
    companyId: company._id,
    amount: numericAmount,
    equity: numericEquity,
    investmentDate: normalizedInvestmentDate,
    currentValue: numericCurrentValue,
    roi: calculateROI(numericAmount, numericCurrentValue),
    status: normalizedStatus,
    round: normalizedRound,
  });

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

export const updateInvestment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, "Invalid investment ID.");

  const investment = await Investment.findById(id);
  if (!investment) {
    throw new ApiError(404, "Investment not found.");
  }

  const membership = await findActiveMembership(
    req.user._id,
    investment.companyId,
  );
  requireInvestmentManagementRole(membership);

  const { amount, equity, investmentDate, currentValue, status, round } =
    req.body;

  const values = validateInvestmentInput({
    amount: amount !== undefined ? amount : investment.amount,
    equity: equity !== undefined ? equity : investment.equity,
    investmentDate:
      investmentDate !== undefined
        ? investmentDate
        : investment.investmentDate,
    currentValue:
      currentValue !== undefined ? currentValue : investment.currentValue,
    status: status !== undefined ? status : investment.status,
    round: round !== undefined ? round : investment.round,
  });

  investment.amount = values.numericAmount;
  investment.equity = values.numericEquity;
  investment.investmentDate = values.normalizedInvestmentDate;
  investment.currentValue = values.numericCurrentValue;
  investment.roi = calculateROI(
    values.numericAmount,
    values.numericCurrentValue,
  );
  investment.status = values.normalizedStatus;
  investment.round = values.normalizedRound;

  await investment.save();

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

export const deleteInvestment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateObjectId(id, "Invalid investment ID.");

  const investment = await Investment.findById(id);
  if (!investment) {
    throw new ApiError(404, "Investment not found.");
  }

  const membership = await findActiveMembership(
    req.user._id,
    investment.companyId,
  );
  requireInvestmentManagementRole(membership);

  await Investment.findByIdAndDelete(investment._id);

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
