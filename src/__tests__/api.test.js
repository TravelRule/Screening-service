import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import express from "express";
import request from "supertest";
import { stubScreen } from "../screeningStub.js";
import { createRequest, updateRequest, getRequest, listRequests, _resetStoreForTests } from "../store.js";
import { createRegistryClient } from "../registryClient.js";

function buildApp() {
  const app = express();
  app.use(express.json());

  const registryClient = createRegistryClient();

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", registryDryRun: registryClient.dryRun });
  });

  app.post("/screen", async (req, res) => {
    const { counterparty } = req.body ?? {};
    if (!counterparty || typeof counterparty !== "string") {
      return res.status(400).json({ error: "counterparty (Stellar address) is required" });
    }

    const referenceId = crypto.randomUUID();
    createRequest({ referenceId, counterpartyIdentifier: counterparty });
    res.status(202).json({ referenceId, status: "pending" });

    // Simulate async screening (skip actual registry write in tests)
    const { status } = stubScreen(counterparty);
    updateRequest(referenceId, { status, registryTxHash: null, dryRun: true });
  });

  app.get("/status/:reference", (req, res) => {
    const record = getRequest(req.params.reference);
    if (!record) {
      return res.status(404).json({ error: "not_found" });
    }
    res.json({ data: record });
  });

  app.get("/requests", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    res.json({ data: listRequests({ limit }) });
  });

  app.use((_req, res) => res.status(404).json({ error: "not_found" }));

  return app;
}

beforeEach(() => {
  _resetStoreForTests();
});

test("GET /health returns ok", async () => {
  const app = buildApp();
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(typeof res.body.registryDryRun, "boolean");
});

test("POST /screen accepts a valid counterparty", async () => {
  const app = buildApp();
  const res = await request(app)
    .post("/screen")
    .send({ counterparty: "GABC1234567890DEF" });

  assert.equal(res.status, 202);
  assert.equal(res.body.status, "pending");
  assert.ok(res.body.referenceId);
});

test("POST /screen rejects missing counterparty", async () => {
  const app = buildApp();
  const res = await request(app).post("/screen").send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "counterparty (Stellar address) is required");
});

test("POST /screen rejects non-string counterparty", async () => {
  const app = buildApp();
  const res = await request(app).post("/screen").send({ counterparty: 12345 });
  assert.equal(res.status, 400);
});

test("GET /status/:reference returns screening result after POST", async () => {
  const app = buildApp();
  const screenRes = await request(app)
    .post("/screen")
    .send({ counterparty: "GABC1234567890DEF" });
  const { referenceId } = screenRes.body;

  await new Promise((r) => setTimeout(r, 50));

  const statusRes = await request(app).get(`/status/${referenceId}`);
  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body.data.referenceId, referenceId);
  assert.ok(["clear", "flagged", "pending"].includes(statusRes.body.data.status));
});

test("GET /status/:reference returns 404 for unknown reference", async () => {
  const app = buildApp();
  const res = await request(app).get("/status/nonexistent");
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "not_found");
});

test("GET /requests returns recent screening requests", async () => {
  const app = buildApp();
  await request(app).post("/screen").send({ counterparty: "GABC" });
  await request(app).post("/screen").send({ counterparty: "GDEF" });

  const res = await request(app).get("/requests");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 2);
});

test("GET /requests respects limit parameter", async () => {
  const app = buildApp();
  await request(app).post("/screen").send({ counterparty: "G1" });
  await request(app).post("/screen").send({ counterparty: "G2" });
  await request(app).post("/screen").send({ counterparty: "G3" });

  const res = await request(app).get("/requests?limit=2");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 2);
});

test("GET /unknown-route returns 404", async () => {
  const app = buildApp();
  const res = await request(app).get("/nonexistent");
  assert.equal(res.status, 404);
});
