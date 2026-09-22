import express from "express";

import {
  generateTest,
  submitTest,
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
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

router.use(protect);

// Test generation and submission endpoints
router.post(
  "/:ticker/generate-test",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  generateTest
);

router.post(
  "/:ticker/submit-test",
  requireCompanyAccess(),
  requireCompanyPermission("CREATE"),
  submitTest
);

// Company assessment collection
router.get(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getAssessments
);

router.post(
  "/:ticker",
  requireCompanyAccess(),
  requireCompanyPermission("CREATE"),
  createAssessment
);

// Current user's assessments
router.get(
  "/:ticker/my",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getMyAssessments
);

router.get(
  "/:ticker/:id",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getAssessmentById
);

router.patch(
  "/:ticker/:id",
  requireCompanyAccess(),
  requireCompanyPermission("EDIT"),
  updateAssessment
);

router.post(
  "/:ticker/:id/review",
  requireCompanyAccess(),
  requireCompanyManagement,
  reviewAssessment
);

router.delete(
  "/:ticker/:id",
  requireCompanyAccess(),
  requireCompanyManagement,
  deleteAssessment
);

export default router;
