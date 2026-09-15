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

const ticker = "MREX";
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

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
  });
  return response;
};

test("metric relationship service returns expected relationship graph", async () => {
  const { buildMetricRelationships } = await import("../../src/services/metricRelationshipService.js");
  const result = buildMetricRelationships({
    monthlyRevenue: 100000,
    customers: 100,
    cac: 500,
    ltv: 2000,
    churnRate: 6,
    grossMargin: 40,
    monthlyBurn: 80000,
    cashAvailable: 300000,
    arpu: 1000,
    ltvCacRatio: 4,
    netBurn: 40000,
    runway: 7.5,
    cacPaybackMonths: 1.25,
  });

  assert.equal(result.relationshipCount, 10);
  assert.equal(result.currentState.monthlyRevenue, 100000);
  assert.equal(result.relationships.find((item) => item.key === "burn-runway").effect, "NEGATIVE");
  assert.equal(result.relationships.find((item) => item.key === "cash-runway").effect, "POSITIVE");
  assert.ok(result.insights.some((item) => item.key === "retention"));
  assert.ok(result.insights.some((item) => item.key === "gross-margin"));
});

test("metric relationship endpoint is protected by authentication", async () => {
  const response = await request(`/api/v1/metric-relationships/${ticker}`);
  assert.equal(response.status, 401);
});
