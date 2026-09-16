import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import http from "node:http";

process.env.NODE_ENV = "test";

const configuredMongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/investment_os_ci";
const TEST_DB_NAME = "investment_os_learning_progress_ci";

process.env.MONGO_URI = configuredMongoUri;
process.env.JWT_SECRET = process.env.JWT_SECRET || "ci-only-investment-backend-test-secret";
process.env.API_RATE_LIMIT = "1000";
process.env.FRONTEND_URL = "http://localhost:3000";

// Connect to the CI MongoDB server first, while selecting a dedicated database
// explicitly. This keeps the default Mongoose connection and the test database
// unambiguous across GitHub Actions workers.
await mongoose.connect(configuredMongoUri, {
  dbName: TEST_DB_NAME,
  serverSelectionTimeoutMS: 10000,
});

await mongoose.connection.db.command({ ping: 1 });

const { default: app } = await import("../../src/app.js");
const { default: LearningProgress } = await import("../../src/models/LearningProgress.js");
const {
  getLearningProgress,
  getLessonProgress,
  updateLessonProgress,
} = await import("../../src/services/learningProgressService.js");

let server;
let baseUrl;

const createScope = () => ({
  companyId: new mongoose.Types.ObjectId(),
  userId: new mongoose.Types.ObjectId(),
});

const cleanupScope = async ({ companyId, userId }) => {
  await LearningProgress.deleteMany({ companyId, userId });
};

before(async () => {
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
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
});

test("learning progress returns not-started state for a valid lesson", async () => {
  const scope = createScope();
  try {
    const result = await getLessonProgress({ ...scope, lessonId: "lesson-14" });

    assert.equal(result.lesson.title, "Unit Economics");
    assert.equal(result.progress.status, "NOT_STARTED");
    assert.equal(result.progress.progressPercent, 0);
  } finally {
    await cleanupScope(scope);
  }
});

test("learning progress rejects unknown lessons without creating data", async () => {
  const scope = createScope();
  try {
    const result = await getLessonProgress({ ...scope, lessonId: "lesson-999" });

    assert.equal(result, null);
    assert.equal(await LearningProgress.countDocuments(scope), 0);
  } finally {
    await cleanupScope(scope);
  }
});

test("learning progress can start and complete a lesson", async () => {
  const scope = createScope();
  try {
    const started = await updateLessonProgress({
      ...scope,
      lessonId: "lesson-14",
      progressPercent: 40,
    });

    assert.equal(started.status, "IN_PROGRESS");
    assert.equal(started.progressPercent, 40);

    const completed = await updateLessonProgress({
      ...scope,
      lessonId: "lesson-14",
      status: "COMPLETED",
    });

    assert.equal(completed.status, "COMPLETED");
    assert.equal(completed.progressPercent, 100);
    assert.ok(completed.completedAt);
  } finally {
    await cleanupScope(scope);
  }
});

test("learning progress summary counts completed and in-progress lessons", async () => {
  const scope = createScope();
  try {
    await updateLessonProgress({ ...scope, lessonId: "lesson-1", progressPercent: 25 });
    await updateLessonProgress({ ...scope, lessonId: "lesson-2", status: "COMPLETED" });

    const storedCount = await LearningProgress.countDocuments({
      companyId: scope.companyId,
      userId: scope.userId,
    });
    assert.equal(storedCount, 2);

    const result = await getLearningProgress(scope);

    assert.equal(result.summary.totalLessons, 30);
    assert.equal(result.summary.startedLessons, 2);
    assert.equal(result.summary.inProgressLessons, 1);
    assert.equal(result.summary.completedLessons, 1);
    assert.equal(result.summary.remainingLessons, 29);
    assert.equal(result.summary.progressPercent, 3);
    assert.equal(result.lessons.length, 2);
  } finally {
    await cleanupScope(scope);
  }
});

test("learning progress uses company and user scope", async () => {
  const scope = createScope();
  const otherScope = createScope();

  try {
    await updateLessonProgress({ ...scope, lessonId: "lesson-3", status: "COMPLETED" });

    const isolated = await getLearningProgress(otherScope);
    assert.equal(isolated.summary.startedLessons, 0);
    assert.equal(isolated.summary.completedLessons, 0);
    assert.equal(isolated.lessons.length, 0);
  } finally {
    await cleanupScope(scope);
    await cleanupScope(otherScope);
  }
});

test("learning progress endpoint requires authentication", async () => {
  const response = await fetch(`${baseUrl}/api/v1/learning/TESTIQ/progress`);
  assert.equal(response.status, 401);
});