import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";
import { getStartupHealthScore } from "../controllers/startupHealthScoreController.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('founder', 'analyst', 'advisor', 'admin', 'super_admin'));
router.use("/:ticker", requireCompanyAccess());

router.get(
  "/:ticker",
  requireCompanyPermission("VIEW"),
  getStartupHealthScore,
);

export default router;
