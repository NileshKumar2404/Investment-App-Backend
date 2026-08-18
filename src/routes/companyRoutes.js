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
  updateTeamRoster
} from "../controllers/companyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireCompanyAccess, requireCompanyManagement, requireCompanyOwner, requireCompanyPermission } from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

router.get("/", protect, getCompanies);
router.get("/search", protect, searchCompanies);
router.get("/:ticker", protect, requireCompanyAccess(),  getCompanyByTicker);
router.post("/", protect, saveCompany);
router.delete("/:ticker", protect, requireCompanyOwner, deleteCompany);

// KYC Statutory Registration Routes
router.get("/:ticker/kyc", protect, requireCompanyAccess(), getKyc);
router.put("/:ticker/kyc", protect, requireCompanyAccess(), updateKyc);

// Funding & Investment Profile Routes
router.get("/:ticker/funding", protect, requireCompanyAccess(), getFunding);
router.put("/:ticker/funding", protect, requireCompanyManagement, updateFunding);

// Strategic Analysis Routes
router.post("/:ticker/swot", protect, requireCompanyPermission('EDIT_ANALYSIS'), updateSwot);
router.post("/:ticker/pestle", protect, requireCompanyPermission('EDIT_ANALYSIS'), updatePestle);

// Founder Competency Assessment Routes
router.post("/:ticker/assessment", protect, requireCompanyPermission('EDIT'), submitAssessment);

// Team Roster & Access Management Routes
router.get("/:ticker/members", protect, requireCompanyAccess(), getTeamMembers);
router.post("/:ticker/members", protect, requireCompanyManagement, addTeamMember);
router.put("/:ticker/team", protect, requireCompanyManagement, updateTeamRoster);

// Activity Timeline Log Route
router.get("/:ticker/timeline", protect, requireCompanyAccess(), getTimeline);

export default router;
