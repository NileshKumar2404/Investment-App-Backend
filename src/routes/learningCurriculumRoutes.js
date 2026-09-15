import express from "express";
import {
  getLesson,
  getSummary,
  listCategories,
  listLessons,
} from "../controllers/learningCurriculumController.js";

const router = express.Router();

// Curriculum content is static educational metadata and does not expose company data.
router.get("/categories", listCategories);
router.get("/summary", getSummary);
router.get("/lessons", listLessons);
router.get("/lessons/:lessonId", getLesson);

export default router;
