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

const ticker = "AIPB";
const { default: app } = await import("../../src/app.js");

let server;
let baseUrl;

before(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await mongoose.disconnect();
});

const request = async (path, options = {}) => fetch(`${baseUrl}${path}`, {
  method: options.method || "GET",
  headers: options.body ? { "Content-Type": "application/json" } : undefined,
  body: options.body ? JSON.stringify(options.body) : undefined,
});

test("AI prompt builder creates structured founder prompt", async () => {
  const { buildAIPrompt } = await import("../../src/services/aiPromptBuilderService.js");
  const result = buildAIPrompt({
    company: {
      companyName: "Acme",
      ticker: "AIPB",
      industry: "SaaS",
      stage: "seed",
      businessModel: "B2B SaaS",
      targetCustomer: "SMBs",
    },
    metrics: {
      monthlyRevenue: 100000,
      ltvCacRatio: 2.4,
      churnRate: 6,
      runway: 5,
    },
    type: "growth",
    context: {
      goal: "Increase MRR without increasing CAC",
      audience: "founder",
      desiredOutput: "three experiments",
    },
  });

  assert.equal(result.type, "growth");
  assert.equal(result.typeLabel, "Growth");
  assert.equal(result.metrics.monthlyRevenue, 100000);
  assert.match(result.prompt, /Increase MRR without increasing CAC/);
  assert.match(result.prompt, /ltvCacRatio/);
  assert.ok(result.completenessScore > 0);
});

test("AI prompt builder exposes prompt types without authentication", async () => {
  const response = await request("/api/v1/ai-prompt-builder/types");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.length, 6);
  assert.ok(body.data.some((item) => item.key === "strategy"));
  assert.ok(body.data.some((item) => item.key === "custom"));
});

test("AI prompt builder company endpoint is protected", async () => {
  const response = await request(`/api/v1/ai-prompt-builder/${ticker}`, {
    method: "POST",
    body: { type: "strategy", context: { goal: "Improve growth" } },
  });
  assert.equal(response.status, 401);
});
