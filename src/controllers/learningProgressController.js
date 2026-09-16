import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  getLearningProgress,
  getLessonProgress,
  updateLessonProgress,
} from "../services/learningProgressService.js";

const getScope = (req) => ({
  companyId: req.company._id,
  userId: req.user._id,
});

export const getProgress = asyncHandler(async (req, res) => {
  const progress = await getLearningProgress(getScope(req));
  return res.status(200).json(
    new ApiResponse(200, progress, "Learning progress fetched successfully"),
  );
});

export const getLessonProgressController = asyncHandler(async (req, res) => {
  const progress = await getLessonProgress({
    ...getScope(req),
    lessonId: req.params.lessonId,
  });

  if (!progress) throw new ApiError(404, "Learning lesson not found.");

  return res.status(200).json(
    new ApiResponse(200, progress, "Learning lesson progress fetched successfully"),
  );
});

export const updateLessonProgressController = asyncHandler(async (req, res) => {
  const { progressPercent, status } = req.body || {};

  if (progressPercent === undefined && status === undefined) {
    throw new ApiError(400, "Provide progressPercent or status.");
  }

  if (
    progressPercent !== undefined &&
    (!Number.isFinite(Number(progressPercent)) || Number(progressPercent) < 0 || Number(progressPercent) > 100)
  ) {
    throw new ApiError(400, "progressPercent must be a number between 0 and 100.");
  }

  if (status !== undefined && !["IN_PROGRESS", "COMPLETED"].includes(status)) {
    throw new ApiError(400, "status must be IN_PROGRESS or COMPLETED.");
  }

  const progress = await updateLessonProgress({
    ...getScope(req),
    lessonId: req.params.lessonId,
    progressPercent,
    status,
  });

  if (!progress) throw new ApiError(404, "Learning lesson not found.");

  return res.status(200).json(
    new ApiResponse(200, progress, "Learning lesson progress updated successfully"),
  );
});
