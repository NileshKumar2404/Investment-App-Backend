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
  cacheMiddleware,
  invalidateCacheMiddleware,
} from "../middleware/cacheMiddleware.js";
import {
  requireCompanyAccess,
  requireCompanyPermission,
} from "../middleware/companyAuthorization.middleware.js";

const router = express.Router();

// Curriculum content is static educational metadata - cache heavily in Redis (1 hour = 3600s)
router.get("/categories", cacheMiddleware(3600), listCategories);
router.get("/summary", cacheMiddleware(3600), getSummary);
router.get("/lessons", cacheMiddleware(3600), listLessons);
router.get("/lessons/:lessonId", cacheMiddleware(3600), getLesson);

// Learning progress is private company/user data.
router.use(protect);

router.get(
  "/:ticker/progress",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  cacheMiddleware(120),
  getProgress,
);

router.get(
  "/:ticker/progress/:lessonId",
  requireCompanyAccess(),
  requireCompanyPermission("VIEW"),
  cacheMiddleware(120),
  getLessonProgressController,
);

router.patch(
  "/:ticker/progress/:lessonId",
  requireCompanyAccess(),
  requireCompanyPermission("EDIT"),
  invalidateCacheMiddleware((req) => [
    `route:*/learning/${req.params.ticker}/progress*`
  ]),
  updateLessonProgressController,
);

export default router;
