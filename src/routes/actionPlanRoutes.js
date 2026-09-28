import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";
import { getActionPlan, verifyTaskProof } from "../controllers/actionPlanController.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('founder', 'advisor', 'admin', 'super_admin'));
router.use("/:ticker", requireCompanyAccess());

router.get(
  "/:ticker",
  requireCompanyPermission("VIEW"),
  getActionPlan,
);

router.post(
  "/:ticker/verify-task",
  requireCompanyPermission("EDIT"),
  verifyTaskProof,
);

export default router;
