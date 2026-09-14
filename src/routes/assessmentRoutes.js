import express from "express";

import {
  createAssessment,
  getAssessments,
  getMyAssessments,
  getAssessmentById,
  updateAssessment,
  reviewAssessment,
  deleteAssessment,
} from "../controllers/assessmentController.js";

import { protect } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
  requireCompanyManagement,
  requireCompanyRole,
  COMPANY_ROLES,
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

router.use(protect);

// Company assessment collection.
router.get(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getAssessments,
);

router.post(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("CREATE"),
  createAssessment,
);

// Current user's assessments. Keep this before /:ticker/:id.
router.get(
  "/:ticker/my",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getMyAssessments,
);

router.get(
  "/:ticker/:id",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getAssessmentById,
);

router.patch(
  "/:ticker/:id",
  requireCompanyAccess(),
  requireCompanyPermission("EDIT"),
  updateAssessment,
);

router.patch(
  "/:ticker/:id/review",
  requireCompanyAccess(),
  requireCompanyRole(
    COMPANY_ROLES.OWNER,
    COMPANY_ROLES.FOUNDER,
    COMPANY_ROLES.CO_FOUNDER,
    COMPANY_ROLES.ANALYST,
    COMPANY_ROLES.ADVISOR,
  ),
  reviewAssessment,
);

router.delete(
  "/:ticker/:id",
  requireCompanyAccess(),
  requireCompanyManagement,
  deleteAssessment,
);

export default router;
