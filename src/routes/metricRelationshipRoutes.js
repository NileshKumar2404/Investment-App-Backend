import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireCompanyAccess, requireCompanyPermission } from "../middleware/companyAuthorization.middleware.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";
import { getMetricRelationships } from "../controllers/metricRelationshipController.js";

const router = express.Router();

router.use(protect);
router.use("/:ticker", requireCompanyAccess());

// Cache metric relationships causal graph for 5 minutes (300s)
router.get(
  "/:ticker",
  requireCompanyPermission("VIEW"),
  cacheMiddleware(300),
  getMetricRelationships,
);

export default router;
