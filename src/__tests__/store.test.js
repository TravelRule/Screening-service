import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createRequest, updateRequest, getRequest, listRequests, _resetStoreForTests } from "../store.js";

beforeEach(() => {
  _resetStoreForTests();
});

test("createRequest stores a pending record", () => {
  const record = createRequest({ referenceId: "ref-1", counterpartyIdentifier: "GABC" });
  assert.equal(record.status, "pending");
  assert.equal(getRequest("ref-1").referenceId, "ref-1");
});

test("updateRequest merges fields and bumps updatedAt", async () => {
  createRequest({ referenceId: "ref-2", counterpartyIdentifier: "GABC" });
  const before = getRequest("ref-2");

  await new Promise((r) => setTimeout(r, 5));
  const updated = updateRequest("ref-2", { status: "clear", registryTxHash: "abc" });

  assert.equal(updated.status, "clear");
  assert.equal(updated.registryTxHash, "abc");
  assert.notEqual(updated.updatedAt, before.updatedAt);
});

test("updateRequest on a missing reference returns null", () => {
  assert.equal(updateRequest("does-not-exist", { status: "clear" }), null);
});

test("listRequests returns most recent first and respects limit", () => {
  createRequest({ referenceId: "ref-a", counterpartyIdentifier: "G1" });
  createRequest({ referenceId: "ref-b", counterpartyIdentifier: "G2" });
  createRequest({ referenceId: "ref-c", counterpartyIdentifier: "G3" });

  const results = listRequests({ limit: 2 });
  assert.equal(results.length, 2);
});
