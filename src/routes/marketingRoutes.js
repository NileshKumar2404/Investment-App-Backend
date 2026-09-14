import express from "express";

import {
  getMarketingChannels,
  getMarketingSummary,
  getMarketingChannel,
  createMarketingChannel,
  updateMarketingChannel,
  deleteMarketingChannel,
} from "../controllers/marketingController.js";

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
  getMarketingChannels,
);

router.get(
  "/:ticker/summary",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getMarketingSummary,
);

router.post(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("CREATE"),
  createMarketingChannel,
);

router.get(
  "/:ticker/:id",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getMarketingChannel,
);

router.patch(
  "/:ticker/:id",
  requireCompanyAccess(),
  requireCompanyPermission("EDIT"),
  updateMarketingChannel,
);

router.delete(
  "/:ticker/:id",
  requireCompanyAccess(),
  requireCompanyPermission("DELETE"),
  deleteMarketingChannel,
);

export default router;
