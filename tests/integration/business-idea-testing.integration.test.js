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
const { default: BusinessIdeaHypothesis } = await import("../../src/models/BusinessIdeaHypothesis.js");
const { default: BusinessIdeaExperiment } = await import("../../src/models/BusinessIdeaExperiment.js");

let server;
let baseUrl;
let owner;
let viewer;
let outsider;
let company;
let ownerToken;
let viewerToken;
let outsiderToken;

const login = async (email) => {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-device-name": "Business Idea Testing CI" },
    body: JSON.stringify({ email, password: "StrongPassword123!" }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  return body.data.accessToken;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: options.body } : {}),
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

  owner = await createUser({ email: "testing-owner@example.com", fullName: "Testing Owner", role: "founder" });
  viewer = await createUser({ email: "testing-viewer@example.com", fullName: "Testing Viewer", role: "founder" });
  outsider = await createUser({ email: "testing-outsider@example.com", fullName: "Testing Outsider", role: "founder" });

  company = await Company.create({
    userId: owner._id,
    ticker: "TESTIQ",
    companyName: "TestIQ Ventures",
    industry: "SaaS",
    sector: "Technology",
    targetAudience: "SMB finance teams",
    status: "INVESTMENT_READY",
  });

  await CompanyMember.create([
    { companyId: company._id, userId: owner._id, roleOnCompany: "OWNER", status: "ACTIVE" },
    { companyId: company._id, userId: viewer._id, roleOnCompany: "VIEWER", status: "ACTIVE" },
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
  outsiderToken = await login(outsider.email);
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
});

describe("Business Idea Testing module", () => {
  it("creates and reads a hypothesis", async () => {
    const createResult = await request("/api/v1/business-idea-testing/TESTIQ/hypotheses", {
      method: "POST",
      token: ownerToken,
      body: JSON.stringify({
        title: "SMB founders will pay for automated finance decisions",
        statement: "At least 30% of interviewed SMB founders will say automated finance workflows solve a high-priority problem.",
        category: "CUSTOMER",
        assumption: "Founders experience recurring finance workflow pain and value automation.",
        expectedOutcome: "At least 30% of qualified interviews confirm the pain is urgent and valuable.",
        confidence: 55,
        riskLevel: "HIGH",
      }),
    });

    assert.equal(createResult.response.status, 201);
    assert.equal(createResult.body.success, true);
    assert.equal(createResult.body.data.status, "OPEN");
    assert.equal(createResult.body.data.decision, "INCONCLUSIVE");

    const listResult = await request("/api/v1/business-idea-testing/TESTIQ/hypotheses", { token: viewerToken });
    assert.equal(listResult.response.status, 200);
    assert.equal(listResult.body.data.length, 1);
  });

  it("creates an experiment and validates the hypothesis after strong success evidence", async () => {
    const hypothesis = await BusinessIdeaHypothesis.findOne({ companyId: company._id });

    const createResult = await request("/api/v1/business-idea-testing/TESTIQ/experiments", {
      method: "POST",
      token: ownerToken,
      body: JSON.stringify({
        hypothesisId: hypothesis._id.toString(),
        name: "Founder problem interviews",
        objective: "Test whether finance workflow pain is urgent enough to pay for.",
        method: "Conduct structured interviews with qualified SMB founders.",
        targetSample: 20,
        successCriteria: "At least 12 of 20 founders confirm the problem is urgent and worth paying to solve.",
        evidence: ["Interview transcript set", "Signed pilot interest forms"],
        evidenceQuality: "HIGH",
        resultStatus: "SUCCESS",
        actualResult: "15 of 20 founders confirmed the pain and 8 requested a pilot.",
      }),
    });

    assert.equal(createResult.response.status, 201);
    assert.equal(createResult.body.data.resultStatus, "SUCCESS");

    const updatedHypothesis = await BusinessIdeaHypothesis.findById(hypothesis._id);
    assert.equal(updatedHypothesis.status, "VALIDATED");
    assert.equal(updatedHypothesis.decision, "VALIDATE");
    assert.ok(updatedHypothesis.decisionConfidence > 0);

    const storedExperiment = await BusinessIdeaExperiment.findById(createResult.body.data.id);
    assert.ok(storedExperiment);
  });

  it("returns readiness and summary metrics", async () => {
    const readiness = await request("/api/v1/business-idea-testing/TESTIQ/readiness", { token: viewerToken });
    assert.equal(readiness.response.status, 200);
    assert.equal(readiness.body.data.totalHypotheses, 1);
    assert.equal(readiness.body.data.totalExperiments, 1);
    assert.equal(readiness.body.data.completedExperiments, 1);
    assert.ok(readiness.body.data.score >= 0 && readiness.body.data.score <= 100);

    const summary = await request("/api/v1/business-idea-testing/TESTIQ/summary", { token: viewerToken });
    assert.equal(summary.response.status, 200);
    assert.equal(summary.body.data.readiness.totalHypotheses, 1);
    assert.equal(summary.body.data.decisions.VALIDATE, 1);
  });

  it("allows a viewer to read but not update a hypothesis", async () => {
    const hypothesis = await BusinessIdeaHypothesis.findOne({ companyId: company._id });
    const readResult = await request(`/api/v1/business-idea-testing/TESTIQ/hypotheses/${hypothesis._id}`, { token: viewerToken });
    assert.equal(readResult.response.status, 200);

    const updateResult = await request(`/api/v1/business-idea-testing/TESTIQ/hypotheses/${hypothesis._id}`, {
      method: "PATCH",
      token: viewerToken,
      body: JSON.stringify({ confidence: 90 }),
    });
    assert.equal(updateResult.response.status, 403);
  });

  it("prevents an outsider from accessing the company testing workspace", async () => {
    const result = await request("/api/v1/business-idea-testing/TESTIQ/summary", { token: outsiderToken });
    assert.equal(result.response.status, 403);
  });

  it("rejects invalid hypothesis categories", async () => {
    const result = await request("/api/v1/business-idea-testing/TESTIQ/hypotheses", {
      method: "POST",
      token: ownerToken,
      body: JSON.stringify({
        title: "Invalid category",
        statement: "A statement",
        category: "INVALID",
        assumption: "An assumption",
        expectedOutcome: "An outcome",
      }),
    });
    assert.equal(result.response.status, 400);
  });
});
