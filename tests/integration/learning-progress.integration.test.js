import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import LearningProgress from "../../src/models/LearningProgress.js";
import {
  getLearningProgress,
  getLessonProgress,
  updateLessonProgress,
} from "../../src/services/learningProgressService.js";

const companyId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();

const cleanup = async () => {
  if (mongoose.connection.readyState === 1) {
    await LearningProgress.deleteMany({ companyId, userId });
  }
};

test("learning progress returns not-started state for a valid lesson", async () => {
  await cleanup();

  const result = await getLessonProgress({ companyId, userId, lessonId: "lesson-14" });

  assert.equal(result.lesson.title, "Unit Economics");
  assert.equal(result.progress.status, "NOT_STARTED");
  assert.equal(result.progress.progressPercent, 0);
});

test("learning progress rejects unknown lessons without creating data", async () => {
  await cleanup();

  const result = await getLessonProgress({ companyId, userId, lessonId: "lesson-999" });

  assert.equal(result, null);
});

test("learning progress can start and complete a lesson", async () => {
  await cleanup();

  const started = await updateLessonProgress({
    companyId,
    userId,
    lessonId: "lesson-14",
    progressPercent: 40,
  });

  assert.equal(started.status, "IN_PROGRESS");
  assert.equal(started.progressPercent, 40);

  const completed = await updateLessonProgress({
    companyId,
    userId,
    lessonId: "lesson-14",
    status: "COMPLETED",
  });

  assert.equal(completed.status, "COMPLETED");
  assert.equal(completed.progressPercent, 100);
  assert.ok(completed.completedAt);
});

test("learning progress summary counts completed and in-progress lessons", async () => {
  await cleanup();

  await updateLessonProgress({ companyId, userId, lessonId: "lesson-1", progressPercent: 25 });
  await updateLessonProgress({ companyId, userId, lessonId: "lesson-2", status: "COMPLETED" });

  const result = await getLearningProgress({ companyId, userId });

  assert.equal(result.summary.totalLessons, 30);
  assert.equal(result.summary.startedLessons, 2);
  assert.equal(result.summary.inProgressLessons, 1);
  assert.equal(result.summary.completedLessons, 1);
  assert.equal(result.summary.remainingLessons, 29);
  assert.equal(result.summary.progressPercent, 3);
  assert.equal(result.lessons.length, 2);

  await cleanup();
});

test("learning progress uses company and user scope", async () => {
  await cleanup();

  const otherCompanyId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();

  await updateLessonProgress({ companyId, userId, lessonId: "lesson-3", status: "COMPLETED" });

  const isolated = await getLearningProgress({ companyId: otherCompanyId, userId: otherUserId });
  assert.equal(isolated.summary.startedLessons, 0);
  assert.equal(isolated.summary.completedLessons, 0);
  assert.equal(isolated.lessons.length, 0);

  await LearningProgress.deleteMany({ companyId: otherCompanyId, userId: otherUserId });
  await cleanup();
});
