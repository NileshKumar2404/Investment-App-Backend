import LearningProgress from "../models/LearningProgress.js";
import { getLessonById, getLessons } from "./learningCurriculumService.js";

const buildSummary = (records) => {
  const totalLessons = getLessons().length;
  const completedLessons = records.filter((item) => item.status === "COMPLETED").length;
  const inProgressLessons = records.filter((item) => item.status === "IN_PROGRESS").length;
  const startedLessons = records.length;
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  return { totalLessons, startedLessons, completedLessons, inProgressLessons, remainingLessons: Math.max(totalLessons - completedLessons, 0), progressPercent };
};

export const getLearningProgress = async ({ companyId, userId }) => {
  const records = await LearningProgress.find({ companyId, userId }).sort({ lastAccessedAt: -1 }).lean();
  return { summary: buildSummary(records), lessons: records.map((record) => ({ ...record, lesson: getLessonById(record.lessonId) })) };
};

export const updateLessonProgress = async ({ companyId, userId, lessonId, status, progressPercent }) => {
  const lesson = getLessonById(lessonId);
  if (!lesson) return null;
  const nextStatus = status || (Number(progressPercent) >= 100 ? "COMPLETED" : "IN_PROGRESS");
  const nextProgress = nextStatus === "COMPLETED" ? 100 : Math.min(99, Math.max(0, Number(progressPercent ?? 0)));
  const now = new Date();
  const update = { status: nextStatus, progressPercent: nextProgress, lastAccessedAt: now, updatedAt: now };
  if (nextStatus === "COMPLETED") update.completedAt = now;
  else if (nextStatus === "IN_PROGRESS") update.completedAt = null;

  const collection = LearningProgress.collection;
  const filter = { companyId, userId, lessonId };
  await collection.updateOne(filter, { $set: update, $setOnInsert: { companyId, userId, lessonId, startedAt: now, createdAt: now } }, { upsert: true });
  const record = await collection.findOne(filter);
  if (!record) throw new Error("Learning progress was not persisted");
  return { ...record, lesson };
};

export const getLessonProgress = async ({ companyId, userId, lessonId }) => {
  const lesson = getLessonById(lessonId);
  if (!lesson) return null;
  const progress = await LearningProgress.findOne({ companyId, userId, lessonId }).lean();
  return { lesson, progress: progress || { lessonId, status: "NOT_STARTED", progressPercent: 0, startedAt: null, completedAt: null, lastAccessedAt: null } };
};
