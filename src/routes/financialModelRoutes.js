import express from "express";
import {
  createFinancialModel,
  listFinancialModels,
  getFinancialModel,
  getFinancialModelSummary,
} from "../controllers/financialModelController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireCompanyAccess, requireCompanyPermission } from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();
router.use(protect);

router.post("/:ticker", requireCompanyAccess(), requireCompanyPermission("EDIT"), createFinancialModel);
router.get("/:ticker", requireCompanyAccess(), requireCompanyPermission("VIEW"), listFinancialModels);
router.get("/:ticker/summary", requireCompanyAccess(), requireCompanyPermission("VIEW"), getFinancialModelSummary);
router.get("/:ticker/:modelId", requireCompanyAccess(), requireCompanyPermission("VIEW"), getFinancialModel);

export default router;
