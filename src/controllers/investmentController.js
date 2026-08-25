import mongoose from "mongoose";
import {Investment} from "../models/investment.js";
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
