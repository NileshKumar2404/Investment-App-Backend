import express from "express";

import {
  getStartupProfile,
  updateStartupProfile,
  getStartupMetrics,
} from "../controllers/startupProfileController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  cacheMiddleware,
  invalidateCacheMiddleware,
} from "../middleware/cacheMiddleware.js";
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
  cacheMiddleware(180),
  getStartupMetrics,
);

router.get(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  cacheMiddleware(300),
  getStartupProfile,
);

router.patch(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("EDIT"),
  invalidateCacheMiddleware((req) => [
    `company:${req.params?.ticker}*`,
    `profile:${req.params?.ticker}*`,
    `health:${req.params?.ticker}*`,
    `route:*/startup-profile/${req.params?.ticker}*`,
    `route:*/startup-health/${req.params?.ticker}*`,
    `route:*/companies/${req.params?.ticker}*`,
    "companies:user:*",
    "route:*/companies*"
  ]),
  updateStartupProfile,
);

export default router;
