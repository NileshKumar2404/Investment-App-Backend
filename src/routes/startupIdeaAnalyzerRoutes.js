import express from "express";

import {
  analyzeIdea,
  getIdeaAnalysis,
  getIdeaAnalysisHistory,
} from "../controllers/startupIdeaAnalyzerController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('founder', 'advisor', 'admin', 'super_admin'));

router.post(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("CREATE"),
  analyzeIdea,
);

router.get(
  "/:ticker/history",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getIdeaAnalysisHistory,
);

router.get(
  "/:ticker/:analysisId",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getIdeaAnalysis,
);

export default router;
