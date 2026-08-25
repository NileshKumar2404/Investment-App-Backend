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
const { default: Session } = await import("../../src/models/session.js");

let server;
let baseUrl;

const TEST_EMAIL = "ci-auth-user@example.com";
const TEST_PASSWORD = "StrongPassword123!";

before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.dropDatabase();

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
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
};

describe("MongoDB-backed authentication flow", () => {
  it("registers a user and creates a session", async () => {
    const { response, body } = await request("/api/v1/auth/register", {
      method: "POST",
      headers: { "X-Device-Name": "GitHub Actions CI" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        fullName: "CI Integration User",
        country: "India",
        language: "English",
        currency: "INR",
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);
    assert.ok(body.data.sessionId);
    assert.equal(body.data.user.email, TEST_EMAIL);
    assert.equal(body.data.user.role, "founder");
    assert.equal(body.data.user.accountStatus, "Active");

    const user = await User.findOne({ email: TEST_EMAIL }).select("+password");
    assert.ok(user);
    assert.equal(user.fullName, "CI Integration User");
    assert.notEqual(user.password, TEST_PASSWORD);

    const session = await Session.findById(body.data.sessionId);
    assert.ok(session);
    assert.equal(session.userId.toString(), user._id.toString());
    assert.equal(session.revokedAt, null);
  });

  it("rejects duplicate registration", async () => {
    const { response, body } = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        fullName: "Duplicate User",
      }),
    });
    assert.equal(response.status, 409);
    assert.equal(body.success, false);
    assert.match(body.message, /already exists/i);
  });

  it("logs in and authenticates /me", async () => {
    const { response: loginResponse, body: loginBody } = await request("/api/v1/auth/login", {
      method: "POST",
      headers: { "X-Device-Name": "GitHub Actions Login Test" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    assert.equal(loginResponse.status, 200);
    assert.equal(loginBody.success, true);
    assert.ok(loginBody.data.accessToken);
    assert.ok(loginBody.data.refreshToken);
    assert.ok(loginBody.data.sessionId);

    const { response: meResponse, body: meBody } = await request("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${loginBody.data.accessToken}` },
    });

    assert.equal(meResponse.status, 200);
    assert.equal(meBody.success, true);
    assert.equal(meBody.data.email, TEST_EMAIL);
    assert.equal(meBody.data.fullName, "CI Integration User");
  });

  it("rejects an incorrect password", async () => {
    const { response, body } = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL, password: "WrongPassword123!" }),
    });
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.match(body.message, /invalid email or password/i);
  });

  it("revokes a session on logout", async () => {
    const { body: loginBody } = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    const { response: logoutResponse, body: logoutBody } = await request("/api/v1/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${loginBody.data.accessToken}` },
    });

    assert.equal(logoutResponse.status, 200);
    assert.equal(logoutBody.success, true);

    const revokedSession = await Session.findById(loginBody.data.sessionId);
    assert.ok(revokedSession);
    assert.ok(revokedSession.revokedAt);

    const { response: meResponse, body: meBody } = await request("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${loginBody.data.accessToken}` },
    });

    assert.equal(meResponse.status, 401);
    assert.equal(meBody.success, false);
    assert.match(meBody.message, /revoked/i);
  });
});
