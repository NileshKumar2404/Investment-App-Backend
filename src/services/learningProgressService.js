import LearningProgress from "../models/LearningProgress.js";
import {
  getLessonById,
  getLessons,
} from "./learningCurriculumService.js";

const normalizePercent = (value) => {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, Math.round(percent)));
};

const toProgressPayload = (record, lesson) => ({
  lessonId: lesson.id,
  lesson,
  status: record?.status || "NOT_STARTED",
  progressPercent: record?.progressPercent ?? 0,
  startedAt: record?.startedAt || null,
  completedAt: record?.completedAt || null,
});

export const getLessonProgress = async ({ companyId, userId, lessonId }) => {
  const lesson = getLessonById(lessonId);
  if (!lesson) return null;

  const record = await LearningProgress.findOne({ companyId, userId, lessonId }).lean();
  return toProgressPayload(record, lesson);
};

export const updateLessonProgress = async ({
  companyId,
  userId,
  lessonId,
  progressPercent,
  status,
}) => {
  const lesson = getLessonById(lessonId);
  if (!lesson) return null;

  const existing = await LearningProgress.findOne({ companyId, userId, lessonId });
  const now = new Date();
  const nextStatus = status === "COMPLETED"
    ? "COMPLETED"
    : status === "IN_PROGRESS"
      ? "IN_PROGRESS"
      : progressPercent !== undefined
        ? (normalizePercent(progressPercent) >= 100 ? "COMPLETED" : "IN_PROGRESS")
        : (existing?.status || "IN_PROGRESS");

  const nextPercent = nextStatus === "COMPLETED"
    ? 100
    : progressPercent !== undefined
      ? normalizePercent(progressPercent)
      : (existing?.progressPercent || 0);

  const record = await LearningProgress.findOneAndUpdate(
    { companyId, userId, lessonId },
    {
      $set: {
        status: nextStatus,
        progressPercent: nextPercent,
        completedAt: nextStatus === "COMPLETED" ? (existing?.completedAt || now) : null,
      },
      $setOnInsert: {
        companyId,
        userId,
        lessonId,
        startedAt: now,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return toProgressPayload(record, lesson);
};

export const getLearningProgress = async ({ companyId, userId }) => {
  const lessons = getLessons();
  const records = await LearningProgress.find({ companyId, userId })
    .sort({ updatedAt: -1 })
    .lean();

  const recordByLesson = new Map(records.map((record) => [record.lessonId, record]));
  const startedLessons = records.filter((record) => record.status !== "NOT_STARTED").length;
  const completedLessons = records.filter((record) => record.status === "COMPLETED").length;
  const inProgressLessons = records.filter((record) => record.status === "IN_PROGRESS").length;
  const totalLessons = lessons.length;
  const progressPercent = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  return {
    summary: {
      totalLessons,
      startedLessons,
      inProgressLessons,
      completedLessons,
      remainingLessons: Math.max(totalLessons - completedLessons, 0),
      progressPercent,
    },
    lessons: records.map((record) => {
      const lesson = getLessonById(record.lessonId);
      return lesson ? toProgressPayload(recordByLesson.get(record.lessonId), lesson) : null;
    }).filter(Boolean),
  };
};
