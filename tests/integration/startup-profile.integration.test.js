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
      "x-device-name": "Startup Profile CI",
    },
    body: JSON.stringify({ email, password: "StrongPassword123!" }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  return body.data.accessToken;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
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

  owner = await createUser({ email: "startup-owner@example.com", fullName: "Startup Owner", role: "founder" });
  viewer = await createUser({ email: "startup-viewer@example.com", fullName: "Startup Viewer", role: "founder" });
  outsider = await createUser({ email: "startup-outsider@example.com", fullName: "Startup Outsider", role: "founder" });

  company = await Company.create({
    userId: owner._id,
    ticker: "STARTIQ",
    companyName: "StartupIQ Test Ventures",
    currentRevenue: 100000,
    revenueGrowthRate: 15,
    ebitdaMargin: 20,
    grossMargin: 50,
    cashBalance: 600000,
    totalDebt: 100000,
    discountRate: 10,
    terminalGrowthRate: 3,
    currentSharePrice: 50,
    sharesOutstanding: 10,
    monthlyExpenses: 100000,
    customers: 100,
    cac: 500,
    ltv: 3000,
    conversionRate: 4,
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
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;

  ownerToken = await login(owner.email);
  viewerToken = await login(viewer.email);
  outsiderToken = await login(outsider.email);
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
});

describe("Startup Profile module", () => {
  it("returns the founder cockpit profile with derived metrics", async () => {
    const result = await request("/api/v1/startup-profile/STARTIQ", {
      token: ownerToken,
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.company.ticker, "STARTIQ");
    assert.equal(result.body.data.metrics.arpu, 1000);
    assert.equal(result.body.data.metrics.ltvCacRatio, 6);
    assert.equal(result.body.data.metrics.netBurn, 50000);
    assert.equal(result.body.data.metrics.runway, 12);
    assert.equal(result.body.data.metrics.cacPaybackMonths, 1);
  });

  it("returns the dedicated metrics endpoint", async () => {
    const result = await request("/api/v1/startup-profile/STARTIQ/metrics", {
      token: viewerToken,
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.arpu, 1000);
    assert.equal(result.body.data.ltvCacRatio, 6);
    assert.equal(result.body.data.runway, 12);
  });

  it("allows an owner to update the startup profile and synchronizes aliases", async () => {
    const result = await request("/api/v1/startup-profile/STARTIQ", {
      method: "PATCH",
      token: ownerToken,
      body: JSON.stringify({
        monthlyRevenue: 120000,
        monthlyBurn: 90000,
        cashAvailable: 480000,
        churnRate: 5,
        grossMargin: 60,
        targetAudience: "B2B SaaS founders",
      }),
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.company.currentRevenue, 120000);
    assert.equal(result.body.data.company.monthlyExpenses, 90000);
    assert.equal(result.body.data.company.grossMargin, 60);
    assert.equal(result.body.data.metrics.monthlyRevenue, 120000);
    assert.equal(result.body.data.metrics.monthlyBurn, 90000);
    assert.equal(result.body.data.metrics.cashAvailable, 480000);
    assert.equal(result.body.data.metrics.churnRate, 5);
  });

  it("prevents a viewer from editing the startup profile", async () => {
    const result = await request("/api/v1/startup-profile/STARTIQ", {
      method: "PATCH",
      token: viewerToken,
      body: JSON.stringify({ monthlyRevenue: 999999 }),
    });

    assert.equal(result.response.status, 403);
  });

  it("prevents a company outsider from reading the startup profile", async () => {
    const result = await request("/api/v1/startup-profile/STARTIQ", {
      token: outsiderToken,
    });

    assert.equal(result.response.status, 403);
  });

  it("rejects invalid percentages", async () => {
    const result = await request("/api/v1/startup-profile/STARTIQ", {
      method: "PATCH",
      token: ownerToken,
      body: JSON.stringify({ churnRate: 101 }),
    });

    assert.equal(result.response.status, 400);
  });
});
