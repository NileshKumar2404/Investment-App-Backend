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
const { default: StartupIdeaAnalysis } = await import("../../src/models/StartupIdeaAnalysis.js");

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
    headers: {
      "content-type": "application/json",
      "x-device-name": "Startup Idea Analyzer CI",
    },
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

  owner = await createUser({ email: "idea-owner@example.com", fullName: "Idea Owner", role: "founder" });
  viewer = await createUser({ email: "idea-viewer@example.com", fullName: "Idea Viewer", role: "founder" });
  outsider = await createUser({ email: "idea-outsider@example.com", fullName: "Idea Outsider", role: "founder" });

  company = await Company.create({
    userId: owner._id,
    ticker: "IDEAIQ",
    companyName: "IdeaIQ Ventures",
    industry: "SaaS",
    sector: "Technology",
    targetAudience: "Small and mid-sized businesses with finance teams",
    currentRevenue: 100000,
    customers: 100,
    tam: 500000000,
    sam: 100000000,
    som: 10000000,
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
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
});

describe("Startup Idea Analyzer module", () => {
  it("analyzes an idea across all 10 dimensions and persists the result", async () => {
    const result = await request("/api/v1/startup-idea-analyzer/IDEAIQ", {
      method: "POST",
      token: ownerToken,
      body: JSON.stringify({
        ideaName: "Finance Copilot for SMBs",
        ideaDescription: "An AI finance platform that automates recurring finance workflows for small businesses and helps owners understand cash flow before decisions become urgent.",
        problemStatement: "Finance teams spend hours on manual reporting, reconciliation and forecasting. Errors are expensive and cash-flow decisions are often delayed, creating recurring operational pain.",
        targetCustomer: "Small and mid-sized businesses with finance teams and founders who need faster cash-flow visibility",
        buyer: "Founder or finance manager",
        marketDescription: "The initial market is digitally active SMBs that already pay for accounting and finance software.",
        geography: "India and English-speaking markets",
        tam: 500000000,
        sam: 100000000,
        som: 10000000,
        solutionDescription: "A cloud platform with automated workflows, dashboards, forecasting and API integrations that turns finance data into actionable decisions.",
        prototypeOrMvp: "Working MVP with five pilot customers",
        businessModel: "B2B SaaS subscription",
        revenueModel: "Monthly and annual subscriptions priced per company",
        pricePoint: "9999 INR per month",
        unitEconomics: "Subscription revenue with low marginal software delivery cost",
        competitors: "Accounting suites, spreadsheets, outsourced accountants and finance automation tools",
        competitorStrengths: "Established vendors have trust, integrations and distribution.",
        competitorWeaknesses: "Most alternatives require manual interpretation and do not focus on decision workflows.",
        differentiation: "Automated decision workflows with a founder-first interface and explainable recommendations built around cash-flow actions.",
        moat: "Workflow data, integrations and accumulated decision patterns",
        scalabilityPlan: "Self-serve onboarding, automated workflows, cloud infrastructure and repeatable sales enablement allow growth without proportional headcount.",
        timingRationale: "AI adoption, cloud software and increasing finance automation demand make the current window attractive.",
        validationEvidence: "Five pilot customers actively use the MVP and reported recurring manual finance work.",
        assumptions: "Customers will pay for time saved and faster financial decisions.",
      }),
    });

    assert.equal(result.response.status, 201);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.dimensions.length, 10);
    assert.ok(result.body.data.ideaScore >= 0 && result.body.data.ideaScore <= 100);
    assert.ok(["IDEA_NOT_READY", "NEEDS_VALIDATION", "PROMISING", "STRONG_OPPORTUNITY"].includes(result.body.data.verdict));
    assert.ok(result.body.data.strengths.length > 0);
    assert.ok(result.body.data.immediateNextSteps.length > 0);

    const stored = await StartupIdeaAnalysis.findById(result.body.data.id).lean();
    assert.ok(stored);
    assert.equal(stored.companyId.toString(), company._id.toString());
    assert.equal(stored.dimensions.length, 10);
  });

  it("returns analysis history for the company", async () => {
    const result = await request("/api/v1/startup-idea-analyzer/IDEAIQ/history", {
      token: viewerToken,
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.length, 1);
    assert.equal(result.body.data[0].ideaName, "Finance Copilot for SMBs");
  });

  it("allows a viewer to read a saved analysis but not create one", async () => {
    const analysis = await StartupIdeaAnalysis.findOne({ companyId: company._id });

    const readResult = await request(`/api/v1/startup-idea-analyzer/IDEAIQ/${analysis._id}`, {
      token: viewerToken,
    });
    assert.equal(readResult.response.status, 200);
    assert.equal(readResult.body.data.id, analysis._id.toString());

    const createResult = await request("/api/v1/startup-idea-analyzer/IDEAIQ", {
      method: "POST",
      token: viewerToken,
      body: JSON.stringify({
        ideaName: "Viewer Idea",
        ideaDescription: "A valid idea description.",
      }),
    });
    assert.equal(createResult.response.status, 403);
  });

  it("prevents a company outsider from accessing the analyzer", async () => {
    const result = await request("/api/v1/startup-idea-analyzer/IDEAIQ/history", {
      token: outsiderToken,
    });

    assert.equal(result.response.status, 403);
  });

  it("rejects an incomplete request without an idea description, problem, or solution", async () => {
    const result = await request("/api/v1/startup-idea-analyzer/IDEAIQ", {
      method: "POST",
      token: ownerToken,
      body: JSON.stringify({ ideaName: "Incomplete Idea" }),
    });

    assert.equal(result.response.status, 400);
  });
});
