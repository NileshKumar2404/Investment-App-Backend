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
  requireCompanyAccess,
  requireCompanyManagement,
  requireCompanyOwner,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

// Get companies accessible to the logged-in user
router.get("/", protect, getCompanies);

// Search companies accessible to the logged-in user
router.get("/search", protect, searchCompanies);
router.get("/:ticker", protect, requireCompanyAccess(), getCompanyByTicker);
router.post("/", protect, saveCompany);

router.delete("/:ticker", protect, requireCompanyOwner, deleteCompany);


// View KYC
router.get("/:ticker/kyc", protect, requireCompanyAccess(), getKyc);

router.put("/:ticker/kyc", protect, requireCompanyManagement, updateKyc);

router.get("/:ticker/funding", protect, requireCompanyAccess(), getFunding);

router.put(
  "/:ticker/funding",
  protect,
  requireCompanyManagement,
  updateFunding,
);

// Update SWOT
router.post(
  "/:ticker/swot",
  protect,
  requireCompanyPermission("EDIT_ANALYSIS"),
  updateSwot,
);

// Update PESTLE
router.post(
  "/:ticker/pestle",
  protect,
  requireCompanyPermission("EDIT_ANALYSIS"),
  updatePestle,
);
router.post(
  "/:ticker/assessment",
  protect,
  requireCompanyPermission("EDIT"),
  submitAssessment,
);
router.get("/:ticker/members", protect, requireCompanyAccess(), getTeamMembers);
router.post(
  "/:ticker/members",
  protect,
  requireCompanyManagement,
  addTeamMember,
);
router.put(
  "/:ticker/team",
  protect,
  requireCompanyManagement,
  updateTeamRoster,
);
router.get("/:ticker/timeline", protect, requireCompanyAccess(), getTimeline);

export default router;
