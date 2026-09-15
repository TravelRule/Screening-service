/**
 * In-memory request store, keyed by reference ID.
 *
 * This is a reference-implementation simplification: a real deployment
 * needs a durable store (Postgres, etc) so screening history survives a
 * restart and can be queried/audited. Swapping this for a real DB is a
 * good first "harden this" issue — the interface below is small on purpose
 * so that swap is contained to this one file.
 */

const store = new Map();

export function createRequest({ referenceId, counterpartyIdentifier }) {
  const record = {
    referenceId,
    counterpartyIdentifier,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    registryTxHash: null,
  };
  store.set(referenceId, record);
  return record;
}

export function updateRequest(referenceId, updates) {
  const existing = store.get(referenceId);
  if (!existing) return null;

  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  store.set(referenceId, updated);
  return updated;
}

export function getRequest(referenceId) {
  return store.get(referenceId) ?? null;
}

export function listRequests({ limit = 50 } = {}) {
  return Array.from(store.values())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

// Test-only helper to reset state between test files.
export function _resetStoreForTests() {
  store.clear();
}
