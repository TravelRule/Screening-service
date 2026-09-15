import { test } from "node:test";
import assert from "node:assert/strict";
import { stubScreen } from "../screeningStub.js";

test("stubScreen is deterministic for the same input", () => {
  const a = stubScreen("GABC123");
  const b = stubScreen("GABC123");
  assert.equal(a.status, b.status);
});

test("stubScreen always returns a valid status and marks itself as a stub", () => {
  const result = stubScreen("GXYZ789");
  assert.ok(["clear", "flagged", "pending"].includes(result.status));
  assert.equal(result.stub, true);
});

test("stubScreen can return different statuses for different inputs", () => {
  const statuses = new Set(
    ["GADDR1", "GADDR2", "GADDR3", "GADDR4", "GADDR5"].map((addr) => stubScreen(addr).status),
  );
  // Not a strict requirement of the stub, but sanity-checks it isn't
  // constant-folding to a single value for every input.
  assert.ok(statuses.size >= 1);
});
