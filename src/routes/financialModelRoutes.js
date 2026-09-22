import express from "express";
import {
  createFinancialModel,
  listFinancialModels,
  getFinancialModel,
  getFinancialModelSummary,
} from "../controllers/financialModelController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { requireCompanyAccess, requireCompanyPermission } from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();
router.use(protect);
router.use(authorizeRoles('founder', 'analyst', 'advisor', 'admin', 'super_admin'));

router.post("/:ticker", requireCompanyAccess(), requireCompanyPermission("EDIT"), createFinancialModel);
router.get("/:ticker", requireCompanyAccess(), requireCompanyPermission("VIEW"), listFinancialModels);
router.get("/:ticker/summary", requireCompanyAccess(), requireCompanyPermission("VIEW"), getFinancialModelSummary);
router.get("/:ticker/:modelId", requireCompanyAccess(), requireCompanyPermission("VIEW"), getFinancialModel);

export default router;
