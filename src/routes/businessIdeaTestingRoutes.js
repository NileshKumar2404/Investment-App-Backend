import express from "express";

import {
  createHypothesis,
  listHypotheses,
  getHypothesis,
  updateHypothesis,
  createExperiment,
  listExperiments,
  getExperiment,
  updateExperiment,
  getTestingSummary,
  getValidationReadiness,
} from "../controllers/businessIdeaTestingController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('founder', 'advisor', 'admin', 'super_admin'));
router.use("/:ticker", requireCompanyAccess());

router.post("/:ticker/hypotheses", requireCompanyPermission("CREATE"), createHypothesis);
router.get("/:ticker/hypotheses", requireCompanyPermission("VIEW"), listHypotheses);
router.get("/:ticker/hypotheses/:hypothesisId", requireCompanyPermission("VIEW"), getHypothesis);
router.patch("/:ticker/hypotheses/:hypothesisId", requireCompanyPermission("UPDATE"), updateHypothesis);

router.post("/:ticker/experiments", requireCompanyPermission("CREATE"), createExperiment);
router.get("/:ticker/experiments", requireCompanyPermission("VIEW"), listExperiments);
router.get("/:ticker/experiments/:experimentId", requireCompanyPermission("VIEW"), getExperiment);
router.patch("/:ticker/experiments/:experimentId", requireCompanyPermission("UPDATE"), updateExperiment);

router.get("/:ticker/summary", requireCompanyPermission("VIEW"), getTestingSummary);
router.get("/:ticker/readiness", requireCompanyPermission("VIEW"), getValidationReadiness);

export default router;
