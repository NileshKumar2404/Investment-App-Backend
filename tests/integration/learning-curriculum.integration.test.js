import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";

import app from "../../src/app.js";
import {
  getCurriculumSummary,
  getLessonById,
  getLessons,
} from "../../src/services/learningCurriculumService.js";

const startServer = async () => {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
};

const request = async (baseUrl, path) => {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  return { response, body };
};

test("learning curriculum contains 30 structured lessons", () => {
  const lessons = getLessons();

  assert.equal(lessons.length, 30);
  assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, 30);
  assert.ok(lessons.every((lesson) => lesson.title));
  assert.ok(lessons.every((lesson) => lesson.category));
  assert.ok(lessons.every((lesson) => lesson.objectives.length >= 3));
  assert.ok(lessons.every((lesson) => lesson.exercise));
});

test("learning curriculum supports category and difficulty filters", () => {
  const financeLessons = getLessons({ category: "finance" });
  const advancedLessons = getLessons({ difficulty: "advanced" });

  assert.equal(financeLessons.length, 5);
  assert.ok(financeLessons.every((lesson) => lesson.category === "FINANCE"));
  assert.ok(advancedLessons.length > 0);
  assert.ok(advancedLessons.every((lesson) => lesson.difficulty === "ADVANCED"));
});

test("learning curriculum summary reports the complete catalog", () => {
  const summary = getCurriculumSummary();

  assert.equal(summary.totalLessons, 30);
  assert.equal(summary.categories.length, 6);
  assert.equal(
    summary.categories.reduce((sum, category) => sum + category.lessonCount, 0),
    30,
  );
  assert.equal(summary.difficultyCounts.BEGINNER, 10);
  assert.equal(summary.difficultyCounts.INTERMEDIATE, 14);
  assert.equal(summary.difficultyCounts.ADVANCED, 6);
});

test("learning curriculum returns a lesson by id and null for an unknown lesson", () => {
  const lesson = getLessonById("lesson-14");

  assert.equal(lesson.title, "Unit Economics");
  assert.equal(lesson.category, "BUSINESS_MODEL");
  assert.equal(getLessonById("lesson-999"), null);
});

test("learning curriculum endpoints are publicly readable", async () => {
  const { server, baseUrl } = await startServer();

  try {
    const categories = await request(baseUrl, "/api/v1/learning/categories");
    assert.equal(categories.response.status, 200);
    assert.equal(categories.body.data.length, 6);

    const lessons = await request(baseUrl, "/api/v1/learning/lessons");
    assert.equal(lessons.response.status, 200);
    assert.equal(lessons.body.data.count, 30);

    const filtered = await request(
      baseUrl,
      "/api/v1/learning/lessons?category=finance&difficulty=advanced",
    );
    assert.equal(filtered.response.status, 200);
    assert.ok(filtered.body.data.count > 0);
    assert.ok(
      filtered.body.data.lessons.every(
        (lesson) => lesson.category === "FINANCE" && lesson.difficulty === "ADVANCED",
      ),
    );

    const lesson = await request(baseUrl, "/api/v1/learning/lessons/lesson-14");
    assert.equal(lesson.response.status, 200);
    assert.equal(lesson.body.data.title, "Unit Economics");

    const missing = await request(baseUrl, "/api/v1/learning/lessons/lesson-999");
    assert.equal(missing.response.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
