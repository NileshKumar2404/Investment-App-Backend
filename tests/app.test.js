import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import http from "node:http";

import app from "../src/app.js";

let server;
let baseUrl;

before(async () => {
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
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
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

describe("health and platform endpoints", () => {
  it("returns a healthy response from /health", async () => {
    const { response, body } = await request("/health");
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, "online");
  });

  it("returns a healthy response from /api/v1/health", async () => {
    const { response, body } = await request("/api/v1/health");
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, "online");
    assert.equal(body.data.version, "1.0.0");
  });

  it("returns the expected JSON 404 response", async () => {
    const { response, body } = await request("/api/v1/does-not-exist");
    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 404);
    assert.equal(body.data, null);
  });
});

describe("authentication boundary", () => {
  it("rejects registration without required fields", async () => {
    const { response, body } = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.match(body.message, /email, password and full name/i);
  });

  it("rejects login without credentials", async () => {
    const { response, body } = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.match(body.message, /email and password/i);
  });

  it("rejects protected auth endpoints without a token", async () => {
    const { response, body } = await request("/api/v1/auth/me");
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.match(body.message, /authentication required/i);
  });

  it("rejects malformed bearer tokens", async () => {
    const { response, body } = await request("/api/v1/auth/me", {
      headers: { Authorization: "Bearer invalid-token" },
    });
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });
});

describe("protected investment and company APIs", () => {
  it("protects investment listing", async () => {
    const { response, body } = await request("/api/v1/investments/my");
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });

  it("protects investment creation", async () => {
    const { response, body } = await request("/api/v1/investments/ABC", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });

  it("protects company listing", async () => {
    const { response, body } = await request("/api/v1/companies");
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });

  it("protects company access by ticker", async () => {
    const { response, body } = await request("/api/v1/companies/ABC");
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });
});
