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
const { default: GtmPersona } = await import("../../src/models/GtmPersona.js");
const { default: GtmChannel } = await import("../../src/models/GtmChannel.js");
const { default: GtmRoadmapItem } = await import("../../src/models/GtmRoadmapItem.js");

let server; let baseUrl; let owner; let viewer; let outsider; let ownerToken; let viewerToken; let company;
const login = async (email) => { const r = await fetch(`${baseUrl}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json", "x-device-name": "GTM CI" }, body: JSON.stringify({ email, password: "StrongPassword123!" }) }); const b = await r.json(); assert.equal(r.status, 200); return b.data.accessToken; };
const request = async (path, options = {}) => { const r = await fetch(`${baseUrl}${path}`, { method: options.method || "GET", headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) }, ...(options.body ? { body: options.body } : {}) }); const text = await r.text(); return { response: r, body: text ? JSON.parse(text) : null }; };
const createUser = async ({ email, fullName, role }) => User.create({ email, password: "StrongPassword123!", fullName, phone: "9999999999", country: "India", language: "English", currency: "INR", role, accountStatus: "Active", verified: true });

before(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.dropDatabase();
  owner = await createUser({ email: "gtm-owner@example.com", fullName: "GTM Owner", role: "founder" });
  viewer = await createUser({ email: "gtm-viewer@example.com", fullName: "GTM Viewer", role: "founder" });
  outsider = await createUser({ email: "gtm-outsider@example.com", fullName: "GTM Outsider", role: "founder" });
  company = await Company.create({ userId: owner._id, ticker: "GTMIQ", companyName: "GTMIQ Ventures", industry: "SaaS", targetAudience: "SMBs", currentRevenue: 100000, customers: 100, status: "INVESTMENT_READY" });
  await CompanyMember.create([{ companyId: company._id, userId: owner._id, roleOnCompany: "OWNER", status: "ACTIVE" }, { companyId: company._id, userId: viewer._id, roleOnCompany: "VIEWER", status: "ACTIVE" }]);
  server = http.createServer(app); await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address(); baseUrl = `http://127.0.0.1:${address.port}`;
  ownerToken = await login(owner.email); viewerToken = await login(viewer.email);
});
after(async () => { if (server) await new Promise((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); if (mongoose.connection.readyState === 1) await mongoose.connection.close(); });

describe("GTM Roadmap module", () => {
  it("creates and scores a target persona", async () => {
    const r = await request("/api/v1/gtm-roadmap/GTMIQ/personas", { method: "POST", token: ownerToken, body: JSON.stringify({ name: "SMB Founder", segment: "Tech-enabled SMBs", painPoints: ["Manual finance work"], buyingMotivations: ["Save time"], objections: ["Price"], decisionMaker: "Founder", marketSize: 1000000, problemSeverity: 90, abilityToPay: 80, reachability: 75, strategicFit: 90 }) });
    assert.equal(r.response.status, 201); assert.ok(r.body.data.priorityScore >= 0); assert.ok(["LOW", "MEDIUM", "HIGH", "TOP"].includes(r.body.data.priority));
  });
  it("creates and scores an acquisition channel", async () => {
    const r = await request("/api/v1/gtm-roadmap/GTMIQ/channels", { method: "POST", token: ownerToken, body: JSON.stringify({ name: "Founder Outbound", acquisitionMethod: "Outbound", expectedCac: 5000, estimatedReach: 10000, conversionExpectation: 8, estimatedCost: 50000, status: "TESTING" }) });
    assert.equal(r.response.status, 201); assert.ok(r.body.data.priorityScore >= 0 && r.body.data.priorityScore <= 100);
  });
  it("creates a 12-week roadmap item linked to company strategy", async () => {
    const persona = await GtmPersona.findOne({ companyId: company._id }); const channel = await GtmChannel.findOne({ companyId: company._id });
    const r = await request("/api/v1/gtm-roadmap/GTMIQ/roadmap-items", { method: "POST", token: ownerToken, body: JSON.stringify({ week: 1, title: "Interview target founders", objective: "Validate positioning", activities: ["Recruit 10 founders", "Run interviews"], deliverable: "Positioning notes", personaId: persona._id, channelId: channel._id }) });
    assert.equal(r.response.status, 201); assert.equal(r.body.data.week, 1);
  });
  it("returns summary and readiness", async () => {
    const r = await request("/api/v1/gtm-roadmap/GTMIQ/summary", { token: viewerToken });
    assert.equal(r.response.status, 200); assert.equal(r.body.data.personas.length, 1); assert.equal(r.body.data.channels.length, 1); assert.equal(r.body.data.roadmapItems.length, 1); assert.ok(r.body.data.readinessScore >= 0 && r.body.data.readinessScore <= 100);
    const readiness = await request("/api/v1/gtm-roadmap/GTMIQ/readiness", { token: viewerToken });
    assert.equal(readiness.response.status, 200); assert.ok(readiness.body.data.nextActions.length >= 0);
  });
  it("allows a viewer to read but not create GTM data", async () => {
    const read = await request("/api/v1/gtm-roadmap/GTMIQ/personas", { token: viewerToken }); assert.equal(read.response.status, 200);
    const create = await request("/api/v1/gtm-roadmap/GTMIQ/personas", { method: "POST", token: viewerToken, body: JSON.stringify({ name: "Blocked", segment: "Blocked" }) }); assert.equal(create.response.status, 403);
  });
  it("rejects invalid roadmap weeks", async () => {
    const r = await request("/api/v1/gtm-roadmap/GTMIQ/roadmap-items", { method: "POST", token: ownerToken, body: JSON.stringify({ week: 13, title: "Invalid", objective: "Invalid" }) }); assert.equal(r.response.status, 400);
  });
  it("prevents an outsider from accessing GTM data", async () => {
    const token = await login(outsider.email);
    const r = await request("/api/v1/gtm-roadmap/GTMIQ/summary", { token }); assert.equal(r.response.status, 403);
  });
  it("persists all GTM records under the company", async () => {
    assert.equal(await GtmPersona.countDocuments({ companyId: company._id }), 1); assert.equal(await GtmChannel.countDocuments({ companyId: company._id }), 1); assert.equal(await GtmRoadmapItem.countDocuments({ companyId: company._id }), 1);
  });
});
