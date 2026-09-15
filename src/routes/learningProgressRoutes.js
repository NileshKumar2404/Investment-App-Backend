import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";
import {
  getFounderLearningProgress,
  getFounderLessonProgress,
  updateFounderLessonProgress,
} from "../controllers/learningProgressController.js";

const router = express.Router();

router.use(protect);
router.use("/:ticker", requireCompanyAccess());

router.get(
  "/:ticker/progress",
  requireCompanyPermission("VIEW"),
  getFounderLearningProgress,
);

router.get(
  "/:ticker/progress/:lessonId",
  requireCompanyPermission("VIEW"),
  getFounderLessonProgress,
);

router.patch(
  "/:ticker/progress/:lessonId",
  requireCompanyPermission("EDIT"),
  updateFounderLessonProgress,
);

export default router;
