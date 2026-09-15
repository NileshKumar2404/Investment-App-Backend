import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import http from "node:http";

process.env.NODE_ENV = "test";

const configuredMongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/investment_os_ci";
const mongoUrl = new URL(configuredMongoUri);
mongoUrl.pathname = "/investment_os_learning_progress_ci";
process.env.MONGO_URI = mongoUrl.toString();
process.env.JWT_SECRET = process.env.JWT_SECRET || "ci-only-investment-backend-test-secret";
process.env.API_RATE_LIMIT = "1000";
process.env.FRONTEND_URL = "http://localhost:3000";

const { default: app } = await import("../../src/app.js");
const { default: LearningProgress } = await import("../../src/models/LearningProgress.js");
const {
  getLearningProgress,
  getLessonProgress,
  updateLessonProgress,
} = await import("../../src/services/learningProgressService.js");

const TEST_MONGO_URI = process.env.MONGO_URI;
const companyId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
let server;
let baseUrl;

before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await LearningProgress.deleteMany({ companyId, userId });

  server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to determine test server address");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await LearningProgress.deleteMany({ companyId, userId });
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
});

test("learning progress returns not-started state for a valid lesson", async () => {
  const result = await getLessonProgress({ companyId, userId, lessonId: "lesson-14" });

  assert.equal(result.lesson.title, "Unit Economics");
  assert.equal(result.progress.status, "NOT_STARTED");
  assert.equal(result.progress.progressPercent, 0);
});

test("learning progress rejects unknown lessons without creating data", async () => {
  const result = await getLessonProgress({ companyId, userId, lessonId: "lesson-999" });

  assert.equal(result, null);
  assert.equal(await LearningProgress.countDocuments({ companyId, userId }), 0);
});

test("learning progress can start and complete a lesson", async () => {
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
  await LearningProgress.deleteMany({ companyId, userId });

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
});

test("learning progress uses company and user scope", async () => {
  const otherCompanyId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();

  await LearningProgress.deleteMany({ companyId, userId });
  await updateLessonProgress({ companyId, userId, lessonId: "lesson-3", status: "COMPLETED" });

  const isolated = await getLearningProgress({ companyId: otherCompanyId, userId: otherUserId });
  assert.equal(isolated.summary.startedLessons, 0);
  assert.equal(isolated.summary.completedLessons, 0);
  assert.equal(isolated.lessons.length, 0);

  await LearningProgress.deleteMany({ companyId: otherCompanyId, userId: otherUserId });
});

test("learning progress endpoint requires authentication", async () => {
  const response = await fetch(`${baseUrl}/api/v1/learning/TESTIQ/progress`);
  assert.equal(response.status, 401);
});
