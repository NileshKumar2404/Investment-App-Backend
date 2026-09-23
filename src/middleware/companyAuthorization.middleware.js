import mongoose from "mongoose";

import Company from "../models/Company.js";
import CompanyMember from "../models/CompanyMember.js";

import { ApiError } from "../utils/ApiError.js";

// ============================================================
// COMPANY ROLES
// ============================================================

export const COMPANY_ROLES = {
  OWNER: "OWNER",
  FOUNDER: "FOUNDER",
  CO_FOUNDER: "CO_FOUNDER",
  FINANCE: "FINANCE",
  ANALYST: "ANALYST",
  ADVISOR: "ADVISOR",
  VIEWER: "VIEWER",
};

// ============================================================
// ROLE PERMISSIONS
// ============================================================

const ROLE_PERMISSIONS = {
  OWNER: [
    "VIEW",
    "CREATE",
    "EDIT",
    "DELETE",
    "MANAGE_MEMBERS",
    "MANAGE_COMPANY",
  ],

  FOUNDER: [
    "VIEW",
    "CREATE",
    "EDIT",
    "DELETE",
    "MANAGE_MEMBERS",
    "MANAGE_COMPANY",
  ],

  CO_FOUNDER: ["VIEW", "CREATE", "EDIT", "MANAGE_MEMBERS"],

  FINANCE: ["VIEW", "CREATE", "EDIT_FINANCIALS"],

  ANALYST: ["VIEW", "CREATE", "EDIT_ANALYSIS"],

  ADVISOR: ["VIEW", "EDIT_ANALYSIS"],

  VIEWER: ["VIEW"],
};

// ============================================================
// NORMALIZE COMPANY ROLE
// ============================================================

const normalizeRole = (role) => {
  if (!role) {
    return null;
  }

  const normalized = String(role)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  switch (normalized) {
    case "FOUNDER":
      return COMPANY_ROLES.FOUNDER;

    case "CO_FOUNDER":
      return COMPANY_ROLES.CO_FOUNDER;

    case "FINANCE":
    case "FINANCE_DIRECTOR":
      return COMPANY_ROLES.FINANCE;

    case "ANALYST":
      return COMPANY_ROLES.ANALYST;

    case "ADVISOR":
      return COMPANY_ROLES.ADVISOR;

    case "VIEWER":
      return COMPANY_ROLES.VIEWER;

    case "OWNER":
      return COMPANY_ROLES.OWNER;

    default:
      return normalized;
  }
};

// ============================================================
// GET TICKER FROM REQUEST
// ============================================================

const getTickerFromRequest = (req) => {
  return req.params?.ticker || req.body?.ticker || req.query?.ticker || null;
};

// ============================================================
// FIND COMPANY
// ============================================================

const findCompany = async (ticker) => {
  if (!ticker || typeof ticker !== "string") {
    throw new ApiError(400, "Company ticker is required.");
  }

  const normalizedTicker = ticker.trim().toUpperCase();

  const company = await Company.findOne({
    ticker: normalizedTicker,
  });

  if (!company) {
    throw new ApiError(404, `Company ${normalizedTicker} not found`);
  }

  return company;
};

// ============================================================
// FIND ACTIVE MEMBERSHIP
// ============================================================

const findMembership = async (userId, companyId, company = null, userRole = "") => {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    throw new ApiError(400, "Invalid company identifier.");
  }

  const membership = await CompanyMember.findOne({
    userId,
    companyId,
    status: "ACTIVE",
  });

  if (membership) {
    return membership;
  }

  // If user is the registered owner of this company, auto-grant OWNER
  if (company && company.userId && String(company.userId) === String(userId)) {
    return {
      userId,
      companyId,
      roleOnCompany: COMPANY_ROLES.OWNER,
      status: "ACTIVE",
    };
  }

  // If company is a preset benchmark, or viewer is investor/analyst/advisor/admin, grant VIEWER
  if (company && (company.isPreset || ["investor", "analyst", "advisor", "admin", "super_admin"].includes(userRole))) {
    return {
      userId,
      companyId,
      roleOnCompany: COMPANY_ROLES.VIEWER,
      status: "ACTIVE",
    };
  }

  throw new ApiError(403, "You do not have access to this company.");
};

// ============================================================
// REQUIRE COMPANY ACCESS
// ============================================================

export const requireCompanyAccess = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ApiError(401, "Authentication required."));
      }

      const ticker = getTickerFromRequest(req);

      const company = await findCompany(ticker);

      const membership = await findMembership(
        req.user._id,
        company._id,
        company,
        req.user?.role,
      );

      const companyRole = normalizeRole(membership.roleOnCompany);

      req.company = company;

      req.companyId = company._id;

      req.companyMembership = membership;

      req.companyRole = companyRole;

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

// ============================================================
// REQUIRE COMPANY PERMISSION
// ============================================================

export const requireCompanyPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ApiError(401, "Authentication required."));
      }

      /**
       * If the previous middleware hasn't loaded
       * company information, load it now.
       */
      if (!req.company || !req.companyMembership) {
        const ticker = getTickerFromRequest(req);

        const company = await findCompany(ticker);

        const membership = await findMembership(
          req.user._id,
          company._id,
          company,
          req.user?.role,
        );

        req.company = company;

        req.companyId = company._id;

        req.companyMembership = membership;

        req.companyRole = normalizeRole(membership.roleOnCompany);
      }

      const role = req.companyRole;

      const permissions = ROLE_PERMISSIONS[role] || [];

      if (!permissions.includes(permission)) {
        return next(
          new ApiError(
            403,
            "You do not have permission to perform this action for this company.",
          ),
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

// ============================================================
// REQUIRE COMPANY ROLE
// ============================================================

export const requireCompanyRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ApiError(401, "Authentication required."));
      }

      if (!req.company || !req.companyMembership) {
        const ticker = getTickerFromRequest(req);

        const company = await findCompany(ticker);

        const membership = await findMembership(
          req.user._id,
          company._id,
          company,
          req.user?.role,
        );

        req.company = company;

        req.companyId = company._id;

        req.companyMembership = membership;

        req.companyRole = normalizeRole(membership.roleOnCompany);
      }

      const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

      if (!normalizedAllowedRoles.includes(req.companyRole)) {
        return next(
          new ApiError(403, "You do not have the required company role."),
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

// ============================================================
// COMMON ROLE HELPERS
// ============================================================

export const requireCompanyOwner = requireCompanyRole(COMPANY_ROLES.OWNER);

export const requireCompanyManagement = requireCompanyRole(
  COMPANY_ROLES.OWNER,
  COMPANY_ROLES.FOUNDER,
  COMPANY_ROLES.CO_FOUNDER,
);

// ============================================================
// EXPORT PERMISSIONS
// ============================================================

export { ROLE_PERMISSIONS };
