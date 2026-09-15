import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";
import { getActionPlan } from "../controllers/actionPlanController.js";

const router = express.Router();

router.use(protect);
router.use("/:ticker", requireCompanyAccess());

router.get(
  "/:ticker",
  requireCompanyPermission("VIEW"),
  getActionPlan,
);

export default router;
