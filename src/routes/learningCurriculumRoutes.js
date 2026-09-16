import express from "express";
import {
  getLesson,
  getSummary,
  listCategories,
  listLessons,
} from "../controllers/learningCurriculumController.js";
import {
  getProgress,
  getLessonProgressController,
  updateLessonProgressController,
} from "../controllers/learningProgressController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

// Curriculum content is static educational metadata and does not expose company data.
router.get("/categories", listCategories);
router.get("/summary", getSummary);
router.get("/lessons", listLessons);
router.get("/lessons/:lessonId", getLesson);

// Learning progress is private company/user data.
router.use(protect);

router.get(
  "/:ticker/progress",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getProgress,
);

router.get(
  "/:ticker/progress/:lessonId",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  getLessonProgressController,
);

router.patch(
  "/:ticker/progress/:lessonId",
  requireCompanyAccess(),
  requireCompanyPermission("EDIT"),
  updateLessonProgressController,
);

export default router;
