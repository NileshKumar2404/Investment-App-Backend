import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import http from "node:http";
import mongoose from "mongoose";

const TEST_MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/investment_os_ci";

process.env.NODE_ENV = "test";
process.env.MONGO_URI = TEST_MONGO_URI;
process.env.JWT_SECRET = "ci-only-investment-backend-test-secret";
process.env.JWT_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_DAYS = "1";
process.env.AUTH_RATE_LIMIT = "1000";
process.env.API_RATE_LIMIT = "1000";
process.env.FRONTEND_URL = "http://localhost:3000";

const { default: app } = await import("../../src/app.js");
const { default: User } = await import("../../src/models/User.js");
const { default: Company } = await import("../../src/models/Company.js");
const { default: CompanyMember } = await import("../../src/models/CompanyMember.js");
const { default: Assessment } = await import("../../src/models/Assessment.js");
const { default: MarketingChannel } = await import("../../src/models/MarketingChannel.js");

let server;
let baseUrl;
let owner;
let viewer;
let analyst;
let outsider;
let company;
let ownerToken;
let viewerToken;
let analystToken;
let outsiderToken;
let assessmentId;
let channelId;

const login = async (email) => {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-device-name": "Assessment Marketing CI" },
    body: JSON.stringify({ email, password: "StrongPassword123!" }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  return body.data.accessToken;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
};

const createUser = async ({ email, fullName, role }) => User.create({
  email,
  password: "StrongPassword123!",
  fullName,
  phone: "9999999999",
  country: "India",
  language: "English",
  currency: "INR",
  role,
  accountStatus: "Active",
  verified: true,
});

before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.dropDatabase();

  owner = await createUser({ email: "assessment-owner@example.com", fullName: "Assessment Owner", role: "founder" });
  viewer = await createUser({ email: "assessment-viewer@example.com", fullName: "Assessment Viewer", role: "founder" });
  analyst = await createUser({ email: "assessment-analyst@example.com", fullName: "Assessment Analyst", role: "analyst" });
  outsider = await createUser({ email: "assessment-outsider@example.com", fullName: "Assessment Outsider", role: "founder" });

  company = await Company.create({
    userId: owner._id,
    ticker: "AMTEST",
    companyName: "Assessment Marketing Test Ventures",
    currentRevenue: 100,
    revenueGrowthRate: 15,
    ebitdaMargin: 20,
    grossMargin: 50,
    cashBalance: 20,
    totalDebt: 10,
    discountRate: 10,
    terminalGrowthRate: 3,
    currentSharePrice: 50,
    sharesOutstanding: 10,
    status: "INVESTMENT_READY",
  });

  await CompanyMember.create([
    { companyId: company._id, userId: owner._id, roleOnCompany: "OWNER", status: "ACTIVE" },
    { companyId: company._id, userId: viewer._id, roleOnCompany: "VIEWER", status: "ACTIVE" },
    { companyId: company._id, userId: analyst._id, roleOnCompany: "ANALYST", status: "ACTIVE" },
  ]);

  server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to determine test server address");
  baseUrl = `http://127.0.0.1:${address.port}`;

  ownerToken = await login(owner.email);
  viewerToken = await login(viewer.email);
  analystToken = await login(analyst.email);
  outsiderToken = await login(outsider.email);
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
});

describe("Assessment module", () => {
  it("creates an assessment and calculates its score", async () => {
    const result = await request("/api/v1/assessments/AMTEST", {
      method: "POST",
      token: ownerToken,
      body: JSON.stringify({
        domainScores: { strategy: 80, operations: 70, finance: 90, leadership: 80, marketing: 80 },
        answers: { q1: "yes", q2: "no" },
      }),
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.body.data.score, 80);
    assert.equal(result.body.data.archetype, "Strategic Visionary");
    assessmentId = result.body.data._id;
  });

  it("allows a company member to list assessments", async () => {
    const result = await request("/api/v1/assessments/AMTEST", { token: viewerToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.pagination.total, 1);
  });

  it("returns only the current user's assessments from my endpoint", async () => {
    const result = await request("/api/v1/assessments/AMTEST/my", { token: ownerToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.length, 1);
    assert.equal(result.body.data[0].userId, owner._id.toString());
  });

  it("rejects assessment access for an outsider", async () => {
    const result = await request("/api/v1/assessments/AMTEST", { token: outsiderToken });
    assert.equal(result.response.status, 403);
  });

  it("prevents a viewer from updating an assessment", async () => {
    const result = await request(`/api/v1/assessments/AMTEST/${assessmentId}`, {
      method: "PATCH",
      token: viewerToken,
      body: JSON.stringify({ score: 50 }),
    });
    assert.equal(result.response.status, 403);
  });

  it("allows the analyst role to review an assessment", async () => {
    const result = await request(`/api/v1/assessments/AMTEST/${assessmentId}/review`, {
      method: "PATCH",
      token: analystToken,
      body: JSON.stringify({ reviewStatus: "APPROVED", reviewNotes: "Reviewed by analyst" }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.reviewStatus, "APPROVED");
  });

  it("prevents editing an approved assessment", async () => {
    const result = await request(`/api/v1/assessments/AMTEST/${assessmentId}`, {
      method: "PATCH",
      token: ownerToken,
      body: JSON.stringify({ score: 90 }),
    });
    assert.equal(result.response.status, 400);
  });
});

describe("Marketing module", () => {
  it("creates a marketing channel with analytics", async () => {
    const result = await request("/api/v1/marketing/AMTEST", {
      method: "POST",
      token: ownerToken,
      body: JSON.stringify({
        channelName: "Google Ads",
        budget: 10000,
        spend: 5000,
        impressions: 100000,
        clicks: 2000,
        leads: 200,
        customers: 50,
        revenue: 15000,
      }),
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.body.data.analytics.ctr, 2);
    assert.equal(result.body.data.analytics.roas, 3);
    channelId = result.body.data._id;
  });

  it("lists marketing channels for company members", async () => {
    const result = await request("/api/v1/marketing/AMTEST", { token: viewerToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.length, 1);
  });

  it("returns the aggregated marketing summary", async () => {
    const result = await request("/api/v1/marketing/AMTEST/summary", { token: viewerToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.spend, 5000);
    assert.equal(result.body.data.revenue, 15000);
    assert.equal(result.body.data.roas, 3);
  });

  it("prevents a viewer from creating a marketing channel", async () => {
    const result = await request("/api/v1/marketing/AMTEST", {
      method: "POST",
      token: viewerToken,
      body: JSON.stringify({ channelName: "LinkedIn Ads", budget: 1000 }),
    });
    assert.equal(result.response.status, 403);
  });

  it("allows the owner to update a marketing channel", async () => {
    const result = await request(`/api/v1/marketing/AMTEST/${channelId}`, {
      method: "PATCH",
      token: ownerToken,
      body: JSON.stringify({ spend: 6000, customers: 60 }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.spend, 6000);
    assert.equal(result.body.data.analytics.customerAcquisitionCost, 100);
  });

  it("prevents an outsider from reading a marketing channel", async () => {
    const result = await request(`/api/v1/marketing/AMTEST/${channelId}`, { token: outsiderToken });
    assert.equal(result.response.status, 403);
  });

  it("allows the owner to delete the marketing channel", async () => {
    const result = await request(`/api/v1/marketing/AMTEST/${channelId}`, {
      method: "DELETE",
      token: ownerToken,
    });
    assert.equal(result.response.status, 200);
    assert.equal(await MarketingChannel.countDocuments({ companyId: company._id }), 0);
    assert.equal(await Assessment.countDocuments({ companyId: company._id }), 1);
  });
});
