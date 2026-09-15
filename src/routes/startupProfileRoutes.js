import express from "express";

import {
  getStartupProfile,
  updateStartupProfile,
  getStartupMetrics,
} from "../controllers/startupProfileController.js";

import { protect } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getStartupProfile,
);

router.get(
  "/:ticker/metrics",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getStartupMetrics,
);

router.patch(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("EDIT"),
  updateStartupProfile,
);

export default router;
