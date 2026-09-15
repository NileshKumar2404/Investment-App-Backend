import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/investment_os_ci";
process.env.JWT_SECRET = process.env.JWT_SECRET || "ci-only-investment-backend-test-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
process.env.REFRESH_TOKEN_EXPIRES_DAYS = process.env.REFRESH_TOKEN_EXPIRES_DAYS || "1";
process.env.AUTH_RATE_LIMIT = process.env.AUTH_RATE_LIMIT || "1000";
process.env.API_RATE_LIMIT = process.env.API_RATE_LIMIT || "1000";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const ticker = "ACTN";
const { default: app } = await import("../../src/app.js");

let server;
let baseUrl;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
  await mongoose.disconnect();
});

const request = async (path) => fetch(`${baseUrl}${path}`);

test("action plan prioritizes weak startup metrics", async () => {
  const { buildActionPlan } = await import("../../src/services/actionPlanService.js");
  const result = buildActionPlan({
    ltvCacRatio: 2,
    churnRate: 7,
    grossMargin: 40,
    cacPaybackMonths: 14,
    conversionRate: 1.5,
    runway: 4,
  });

  assert.equal(result.horizonDays, 30);
  assert.equal(result.weakMetricCount, 6);
  assert.equal(result.weeks.length, 4);
  assert.equal(result.weeks[0].days, "1-7");
  assert.equal(result.weeks[3].days, "22-28");
  assert.equal(result.nextBestActions.length, 5);
  assert.ok(result.weakMetrics.some((item) => item.metric === "runway" && item.priority === "CRITICAL"));
  assert.ok(result.weakMetrics.some((item) => item.metric === "ltvCacRatio"));
});

test("action plan uses a founder baseline when no weak metric is detected", async () => {
  const { buildActionPlan } = await import("../../src/services/actionPlanService.js");
  const result = buildActionPlan({
    ltvCacRatio: 4,
    churnRate: 3,
    grossMargin: 70,
    cacPaybackMonths: 6,
    conversionRate: 4,
    runway: 12,
  });

  assert.equal(result.weakMetricCount, 0);
  assert.equal(result.readinessScore, 100);
  assert.equal(result.weeks.length, 4);
  assert.match(result.nextBestActions[0].title, /Validate/);
});

test("action plan endpoint is protected by authentication", async () => {
  const response = await request(`/api/v1/action-plan/${ticker}`);
  assert.equal(response.status, 401);
});
