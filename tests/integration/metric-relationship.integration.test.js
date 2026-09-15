import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../src/app.js";
import Company from "../../src/models/Company.js";

const ticker = "MREX";

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
});

after(async () => {
  await mongoose.disconnect();
});

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
  const response = await request(app).get(`/api/v1/metric-relationships/${ticker}`);
  assert.equal(response.status, 401);
});
