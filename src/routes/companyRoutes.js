import express from "express";

import {
  getCompanies,
  searchCompanies,
  getCompanyByTicker,
  saveCompany,
  deleteCompany,
  getKyc,
  updateKyc,
  getFunding,
  updateFunding,
  updateSwot,
  updatePestle,
  submitAssessment,
  getTeamMembers,
  addTeamMember,
  getTimeline,
  updateTeamRoster,
} from "../controllers/companyController.js";

import { protect } from "../middleware/authMiddleware.js";
import {
  cacheMiddleware,
  invalidateCacheMiddleware,
} from "../middleware/cacheMiddleware.js";

import {
  requireCompanyAccess,
  requireCompanyManagement,
  requireCompanyOwner,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

// Get companies accessible to the logged-in user (cached for 2 min per user)
router.get("/", protect, cacheMiddleware(120), getCompanies);

// Search companies accessible to the logged-in user
router.get("/search", protect, cacheMiddleware(60), searchCompanies);

// Get single company by ticker (cached for 5 min)
router.get("/:ticker", protect, requireCompanyAccess(), cacheMiddleware(300), getCompanyByTicker);

// Create or update company -> invalidate company lists & ticker cache
router.post(
  "/",
  protect,
  invalidateCacheMiddleware((req) => [
    "companies:user:*",
    `company:${req.body?.ticker}*`,
    "route:*/companies*",
    `route:*/startup-profile/${req.body?.ticker}*`,
    `route:*/startup-health/${req.body?.ticker}*`
  ]),
  saveCompany
);

router.delete(
  "/:ticker",
  protect,
  requireCompanyOwner,
  invalidateCacheMiddleware((req) => [
    "companies:user:*",
    `company:${req.params?.ticker}*`,
    "route:*/companies*",
    `route:*/startup-profile/${req.params?.ticker}*`
  ]),
  deleteCompany
);

// View KYC (cached 5 min)
router.get("/:ticker/kyc", protect, requireCompanyAccess(), cacheMiddleware(300), getKyc);

router.put(
  "/:ticker/kyc",
  protect,
  requireCompanyManagement,
  invalidateCacheMiddleware((req) => [
    `company:${req.params?.ticker}*`,
    `route:*/companies/${req.params?.ticker}*`
  ]),
  updateKyc
);

router.get("/:ticker/funding", protect, requireCompanyAccess(), cacheMiddleware(300), getFunding);

router.put(
  "/:ticker/funding",
  protect,
  requireCompanyManagement,
  invalidateCacheMiddleware((req) => [
    `company:${req.params?.ticker}*`,
    `route:*/companies/${req.params?.ticker}*`
  ]),
  updateFunding
);

// Update SWOT
router.post(
  "/:ticker/swot",
  protect,
  requireCompanyPermission("EDIT_ANALYSIS"),
  invalidateCacheMiddleware((req) => [
    `company:${req.params?.ticker}*`,
    `route:*/companies/${req.params?.ticker}*`
  ]),
  updateSwot
);

// Update PESTLE
router.post(
  "/:ticker/pestle",
  protect,
  requireCompanyPermission("EDIT_ANALYSIS"),
  invalidateCacheMiddleware((req) => [
    `company:${req.params?.ticker}*`,
    `route:*/companies/${req.params?.ticker}*`
  ]),
  updatePestle
);

router.post(
  "/:ticker/assessment",
  protect,
  requireCompanyPermission("EDIT"),
  invalidateCacheMiddleware((req) => [
    `company:${req.params?.ticker}*`,
    `route:*/companies/${req.params?.ticker}*`
  ]),
  submitAssessment
);

router.get("/:ticker/members", protect, requireCompanyAccess(), cacheMiddleware(120), getTeamMembers);

router.post(
  "/:ticker/members",
  protect,
  requireCompanyManagement,
  invalidateCacheMiddleware((req) => [
    `route:*/companies/${req.params?.ticker}/members*`
  ]),
  addTeamMember
);

router.put(
  "/:ticker/team",
  protect,
  requireCompanyManagement,
  invalidateCacheMiddleware((req) => [
    `route:*/companies/${req.params?.ticker}/members*`
  ]),
  updateTeamRoster
);

router.get("/:ticker/timeline", protect, requireCompanyAccess(), cacheMiddleware(120), getTimeline);

export default router;
