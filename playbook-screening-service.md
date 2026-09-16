# Playbook: `TravelRule/screening-service`

**Role in the toolkit:** off-chain service — runs (stub) screening, writes results to the registry contract
**Depends on:** `attestation-registry` (writes to it, via generated bindings once available)
**Depended on by:** `dashboard` (reads `/requests`)

---

## What this repo does

Accepts a counterparty address via `POST /screen`, runs a deterministic
stub screening check, and writes the result on-chain. Ships in a safe
**dry-run mode** by default until real contract bindings are generated, so
it's runnable without a funded testnet key.

## Current state (as built)

- ✅ Full request lifecycle: `POST /screen` → async processing → `GET
  /status/:reference`, plus `/requests` for the dashboard
- ✅ Dry-run fallback in `registryClient.js` — safe by default
- ✅ In-memory store (explicitly flagged as a v1 simplification, not durable)
- ✅ Dependency-free tests (screening stub + store logic) — **verified
  passing, 7/7**, in the sandbox before delivery
- ✅ Docs: README, ARCHITECTURE, API, DATA_SOURCES
- ❌ No CI workflow committed
- ❌ Never run against a real deployed `attestation-registry` (dry-run
  only, never exercised the real on-chain write path)
- ❌ No lockfile (`package-lock.json`) committed

## What's left before this repo is submission-ready

### Blocking
- [ ] Once `attestation-registry` is deployed and bindings are generated,
  point this at them and confirm a real (non-dry-run) `write_attestation`
  actually lands on testnet
- [ ] Add CI: `npm install && npm test` on push
- [ ] Commit `package-lock.json`

### Should-do
- [ ] Replace the in-memory store with Postgres (or point it at the
  `soroban-indexer` project's existing Postgres instance) — flagged in
  ARCHITECTURE.md as the natural hardening step
- [ ] Replace `ISSUER_SECRET_KEY` env-var signing with a real key-management
  approach before using this with anything beyond testnet demo funds
- [ ] Decide on a real data source per DATA_SOURCES.md (OFAC/PEP/commercial
  provider) if this is going beyond a Wave demo

### Nice-to-have
- [ ] Rate limiting on `/screen` (no abuse protection currently)
- [ ] Seed 3-5 issues: "swap in real OFAC data source," "add Postgres
  store," "add manual review queue for flagged results"

## Phased completion prompts

**Phase 1 — Wire up the real registry client**
```
Generate or obtain the TypeScript bindings for the deployed
attestation-registry contract (see that repo's docs). Place them where
registryClient.js expects them (../generated/attestation-registry-client)
or update the import path to match. Fund a testnet issuer key, add it to
attestation-registry's allowlist via add_issuer, set ISSUER_SECRET_KEY and
ATTESTATION_REGISTRY_CONTRACT_ID in .env, and confirm a real POST /screen
call results in a non-null registryTxHash in GET /status/:reference.
```

**Phase 2 — CI and lockfile**
```
Run `npm install` to generate package-lock.json and commit it. Add a
GitHub Actions workflow that runs `npm install && npm test` on push and
PR against a Node 22 runner.
```

**Phase 3 — Durable storage**
```
Replace src/store.js's in-memory Map with a Postgres-backed
implementation, keeping the same exported function signatures
(createRequest, updateRequest, getRequest, listRequests) so index.js
doesn't need to change. Add a migrations file or reuse the soroban-indexer
project's schema pattern. Update docker-compose.yml to include a Postgres
service if one isn't already assumed.
```

**Phase 4 — Issue-seeding**
```
Draft 5-8 GitHub issues covering: real sanctions-data-source integration,
manual review queue for flagged/ambiguous results, rate limiting on
/screen, replacing the raw secret-key signing with a KMS/HSM-backed
approach, and Postgres-backed storage if not already done in Phase 3.
```
