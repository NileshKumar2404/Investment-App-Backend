import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireCompanyAccess, requireCompanyPermission } from "../middleware/companyAuthorization.js";
import { getMetricRelationships } from "../controllers/metricRelationshipController.js";

const router = express.Router();

router.get(
  "/:ticker",
  protect,
  requireCompanyAccess,
  requireCompanyPermission("VIEW"),
  getMetricRelationships,
);

export default router;
