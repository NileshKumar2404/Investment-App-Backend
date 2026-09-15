import LearningProgress from "../models/LearningProgress.js";
import { getLessonById, getLessons } from "./learningCurriculumService.js";

const buildSummary = (records) => {
  const totalLessons = getLessons().length;
  const completedLessons = records.filter((item) => item.status === "COMPLETED").length;
  const inProgressLessons = records.filter((item) => item.status === "IN_PROGRESS").length;
  const startedLessons = records.length;
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  return {
    totalLessons,
    startedLessons,
    completedLessons,
    inProgressLessons,
    remainingLessons: Math.max(totalLessons - completedLessons, 0),
    progressPercent,
  };
};

export const getLearningProgress = async ({ companyId, userId }) => {
  const records = await LearningProgress.find({ companyId, userId })
    .sort({ lastAccessedAt: -1 })
    .lean();

  return {
    summary: buildSummary(records),
    lessons: records.map((record) => ({
      ...record,
      lesson: getLessonById(record.lessonId),
    })),
  };
};

export const updateLessonProgress = async ({ companyId, userId, lessonId, status, progressPercent }) => {
  const lesson = getLessonById(lessonId);
  if (!lesson) return null;

  const nextStatus = status || (Number(progressPercent) >= 100 ? "COMPLETED" : "IN_PROGRESS");
  const nextProgress = nextStatus === "COMPLETED" ? 100 : Math.min(99, Math.max(0, Number(progressPercent ?? 0)));
  const now = new Date();

  const update = {
    status: nextStatus,
    progressPercent: nextProgress,
    lastAccessedAt: now,
  };

  if (nextStatus === "COMPLETED") {
    update.completedAt = now;
  } else if (nextStatus === "IN_PROGRESS") {
    update.completedAt = null;
  }

  // Persist through the document API instead of findOneAndUpdate/upsert.
  // This makes the write and the subsequent read use the same hydrated
  // document/connection path and avoids CI-only upsert visibility issues.
  let record = await LearningProgress.findOne({ companyId, userId, lessonId });

  if (!record) {
    record = new LearningProgress({
      companyId,
      userId,
      lessonId,
      startedAt: now,
      ...update,
    });
  } else {
    Object.assign(record, update);
  }

  await record.save();

  return {
    ...record.toObject(),
    lesson,
  };
};

export const getLessonProgress = async ({ companyId, userId, lessonId }) => {
  const lesson = getLessonById(lessonId);
  if (!lesson) return null;

  const progress = await LearningProgress.findOne({ companyId, userId, lessonId }).lean();

  return {
    lesson,
    progress: progress || {
      lessonId,
      status: "NOT_STARTED",
      progressPercent: 0,
      startedAt: null,
      completedAt: null,
      lastAccessedAt: null,
    },
  };
};
