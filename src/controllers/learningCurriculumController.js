import { ApiResponse } from "../utils/ApiResponse.js";
import {
  getCurriculumSummary,
  getLearningCategories,
  getLessonById,
  getLessons,
} from "../services/learningCurriculumService.js";

export const listLessons = (req, res) => {
  const lessons = getLessons({
    category: req.query.category,
    difficulty: req.query.difficulty,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        lessons,
        count: lessons.length,
        summary: getCurriculumSummary(),
      },
      "Learning lessons fetched successfully",
    ),
  );
};

export const getLesson = (req, res) => {
  const lesson = getLessonById(req.params.lessonId);

  if (!lesson) {
    return res.status(404).json(
      new ApiResponse(404, null, "Learning lesson not found"),
    );
  }

  return res.status(200).json(
    new ApiResponse(200, lesson, "Learning lesson fetched successfully"),
  );
};

export const listCategories = (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      getLearningCategories(),
      "Learning categories fetched successfully",
    ),
  );
};

export const getSummary = (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      getCurriculumSummary(),
      "Learning curriculum summary fetched successfully",
    ),
  );
};
