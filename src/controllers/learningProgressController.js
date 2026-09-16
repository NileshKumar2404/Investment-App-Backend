import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  getLearningProgress,
  getLessonProgress,
  updateLessonProgress,
} from "../services/learningProgressService.js";

const getCompanyId = (req) => req.company?._id;
const getUserId = (req) => req.user?._id;

export const getFounderLearningProgress = asyncHandler(async (req, res) => {
  const data = await getLearningProgress({ companyId: getCompanyId(req), userId: getUserId(req) });
  return res.status(200).json(new ApiResponse(200, data, "Learning progress retrieved successfully."));
});

export const getFounderLessonProgress = asyncHandler(async (req, res) => {
  const data = await getLessonProgress({
    companyId: getCompanyId(req),
    userId: getUserId(req),
    lessonId: req.params.lessonId,
  });

  if (!data) throw new ApiError(404, "Learning lesson not found.");

  return res.status(200).json(new ApiResponse(200, data, "Lesson progress retrieved successfully."));
});

export const updateFounderLessonProgress = asyncHandler(async (req, res) => {
  const { status, progressPercent } = req.body || {};

  if (status !== undefined && !["IN_PROGRESS", "COMPLETED"].includes(status)) {
    throw new ApiError(400, "status must be IN_PROGRESS or COMPLETED.");
  }

  if (progressPercent !== undefined && (!Number.isFinite(Number(progressPercent)) || Number(progressPercent) < 0 || Number(progressPercent) > 100)) {
    throw new ApiError(400, "progressPercent must be a number between 0 and 100.");
  }

  const data = await updateLessonProgress({
    companyId: getCompanyId(req),
    userId: getUserId(req),
    lessonId: req.params.lessonId,
    status,
    progressPercent,
  });

  if (!data) throw new ApiError(404, "Learning lesson not found.");

  return res.status(200).json(new ApiResponse(200, data, "Lesson progress updated successfully."));
});
