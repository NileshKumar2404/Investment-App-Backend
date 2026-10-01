import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";
import { getStartupHealthScore } from "../controllers/startupHealthScoreController.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('founder', 'analyst', 'advisor', 'admin', 'super_admin'));
router.use("/:ticker", requireCompanyAccess());

// Cache health score calculations for 2 minutes (120s)
router.get(
  "/:ticker",
  requireCompanyPermission("VIEW"),
  cacheMiddleware(120),
  getStartupHealthScore,
);

export default router;
