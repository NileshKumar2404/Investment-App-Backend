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
  "/:ticker",
  requireCompanyPermission("VIEW"),
  getFounderLearningProgress,
);

router.get(
  "/:ticker/:lessonId",
  requireCompanyPermission("VIEW"),
  getFounderLessonProgress,
);

router.patch(
  "/:ticker/:lessonId",
  requireCompanyPermission("VIEW"),
  updateFounderLessonProgress,
);

export default router;
