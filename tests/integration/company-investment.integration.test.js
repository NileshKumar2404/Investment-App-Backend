import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import http from "node:http";

import mongoose from "mongoose";

const TEST_MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/investment_os_ci";

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
const { default: CompanyMember } =
  await import("../../src/models/CompanyMember.js");
const { Investment } = await import("../../src/models/investment.js");

let server;
let baseUrl;

let owner;
let viewer;
let investor;
let outsider;
let company;
let ownerToken;
let viewerToken;
let investorToken;
let outsiderToken;
let createdInvestment;

const login = async (email, password) => {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-device-name": "GitHub Actions Authorization Test",
    },
    body: JSON.stringify({ email, password }),
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.data.accessToken);

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
  const body = text ? JSON.parse(text) : null;

  return { response, body };
};

const createUser = async ({ email, fullName, role }) => {
  return User.create({
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
};

before(async () => {
  await mongoose.connect(TEST_MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  await mongoose.connection.dropDatabase();

  owner = await createUser({
    email: "ci-owner@example.com",
    fullName: "CI Company Owner",
    role: "founder",
  });

  viewer = await createUser({
    email: "ci-viewer@example.com",
    fullName: "CI Company Viewer",
    role: "founder",
  });

  investor = await createUser({
    email: "ci-investor@example.com",
    fullName: "CI Investor",
    role: "investor",
  });

  outsider = await createUser({
    email: "ci-outsider@example.com",
    fullName: "CI Outsider",
    role: "founder",
  });

  company = await Company.create({
    userId: owner._id,
    ticker: "CITEST",
    companyName: "CI Test Ventures",
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
    {
      companyId: company._id,
      userId: owner._id,
      roleOnCompany: "OWNER",
      status: "ACTIVE",
    },
    {
      companyId: company._id,
      userId: viewer._id,
      roleOnCompany: "VIEWER",
      status: "ACTIVE",
    },
  ]);

  server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;

  ownerToken = await login(owner.email, "StrongPassword123!");
  viewerToken = await login(viewer.email, "StrongPassword123!");
  investorToken = await login(investor.email, "StrongPassword123!");
  outsiderToken = await login(outsider.email, "StrongPassword123!");
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("company authorization", () => {
  it("allows an active member to read the company", async () => {
    const { response, body } = await request("/api/v1/companies/CITEST", {
      token: ownerToken,
    });

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.ticker, "CITEST");
  });

  it("allows a viewer to read the company", async () => {
    const { response, body } = await request("/api/v1/companies/CITEST", {
      token: viewerToken,
    });

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
  });

  it("denies an authenticated user with no membership", async () => {
    const { response, body } = await request("/api/v1/companies/CITEST", {
      token: outsiderToken,
    });

    assert.equal(response.status, 403);
    assert.equal(body.success, false);
    assert.match(body.message, /do not have access to this company/i);
  });

  it("denies an inactive or missing membership from company access", async () => {
    await CompanyMember.updateOne(
      {
        companyId: company._id,
        userId: viewer._id,
      },
      {
        $set: { status: "SUSPENDED" },
      },
    );

    const { response, body } = await request("/api/v1/companies/CITEST", {
      token: viewerToken,
    });

    assert.equal(response.status, 403);
    assert.equal(body.success, false);

    await CompanyMember.updateOne(
      {
        companyId: company._id,
        userId: viewer._id,
      },
      {
        $set: { status: "ACTIVE" },
      },
    );
  });
});

describe("investment authorization and persistence", () => {
  it("allows an owner to create an investment", async () => {
    const { response, body } = await request("/api/v1/investments/CITEST", {
      method: "POST",
      token: ownerToken,
      body: JSON.stringify({
        investorId: investor._id.toString(),
        amount: 100000,
        equity: 5,
        investmentDate: "2026-08-25T00:00:00.000Z",
        currentValue: 120000,
        status: "Active",
        round: "Seed",
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.companyId.toString(), company._id.toString());
    assert.equal(body.data.investorId.toString(), investor._id.toString());
    assert.equal(body.data.amount, 100000);
    assert.equal(body.data.currentValue, 120000);
    assert.equal(body.data.roi, 20);

    createdInvestment = body.data;

    const stored = await Investment.findById(createdInvestment._id);
    assert.ok(stored);
    assert.equal(stored.roi, 20);
  });

  it("denies a viewer from creating an investment", async () => {
    const { response, body } = await request("/api/v1/investments/CITEST", {
      method: "POST",
      token: viewerToken,
      body: JSON.stringify({
        investorId: investor._id.toString(),
        amount: 50000,
        equity: 2,
        currentValue: 50000,
      }),
    });

    assert.equal(response.status, 403);
    assert.equal(body.success, false);
    assert.match(body.message, /permission/i);
  });

  it("allows the investor to retrieve only their investments", async () => {
    const { response, body } = await request("/api/v1/investments/my", {
      token: investorToken,
    });

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].companyId._id.toString(), company._id.toString());
  });

  it("allows company members to view company investments", async () => {
    const { response, body } = await request(
      "/api/v1/investments/company/CITEST",
      {
        token: viewerToken,
      },
    );

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].amount, 100000);
  });

  it("denies non-members from viewing company investments", async () => {
    const { response, body } = await request(
      "/api/v1/investments/company/CITEST",
      {
        token: outsiderToken,
      },
    );

    assert.equal(response.status, 403);
    assert.equal(body.success, false);
  });
});
