import assert from "node:assert/strict";
import test from "node:test";

import app from "../src/app.js";

const startTestServer = () =>
  new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });

test("GET /health returns a healthy response", async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, "online");
  assert.equal(body.message, "Health check passed");
});

test("GET /api/v1/health returns the v1 health response", async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, "online");
  assert.equal(body.data.version, "1.0.0");
});

test("unknown routes return the standard 404 response", async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/does-not-exist`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, "The requested resource was not found");
});
