import express from "express";

import {
  getStartupProfile,
  updateStartupProfile,
  getStartupMetrics,
} from "../controllers/startupProfileController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('founder', 'analyst', 'advisor', 'admin', 'super_admin'));

router.get(
  "/:ticker/metrics",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getStartupMetrics,
);

router.get(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getStartupProfile,
);

router.patch(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("EDIT"),
  updateStartupProfile,
);

export default router;
