# Architecture

## Request lifecycle

```
POST /screen { counterparty }
      │
      ▼
 store.createRequest()  ──▶  status: "pending"   (returned to caller immediately, HTTP 202)
      │
      ▼ (async, doesn't block the HTTP response)
 screeningStub.stubScreen(counterparty)
      │
      ▼
 registryClient.writeAttestation({ counterparty, status, referenceId })
      │
      ▼
 store.updateRequest()  ──▶  status: "clear" | "flagged" | "pending", registryTxHash
```

The `POST /screen` response is deliberately fast (202 Accepted with a
`referenceId`) rather than waiting for the on-chain write to confirm — a
Soroban transaction can take several seconds to finalize, and a screening
API shouldn't hold an HTTP connection open for that. Callers poll
`GET /status/:reference` for the final result, same pattern as most
async-processing webhooks/APIs.

## Dry-run mode

`registryClient.js` looks for generated Soroban contract bindings at
`../generated/attestation-registry-client`. These aren't checked into this
repo (they're derived from a specific deployed contract instance) — you
generate them yourself:

```bash
soroban contract bindings typescript \
  --contract-id $ATTESTATION_REGISTRY_CONTRACT_ID \
  --network testnet \
  --output-dir ./generated/attestation-registry-client
```

Without them, `registryClient` runs in **dry-run mode**: it logs the
attestation it would have written instead of submitting a real transaction.
This means the full `/screen` → `/status` flow, and the dashboard that
consumes it, work out of the box for local development without requiring a
funded testnet issuer key — you only need the real bindings + a funded key
once you want actual on-chain writes.

## Why an in-memory store (and its limit)

`src/store.js` is a `Map`, not a database. This is fine for local dev and
demoing the pipeline, but it means:

- Restarting the service loses all request history (the on-chain
  attestations themselves are NOT lost — those live in the registry
  contract regardless of what this service's memory holds).
- It can't be horizontally scaled (multiple instances wouldn't share state).

Swapping in Postgres (or reusing the `soroban-indexer` project's Postgres
instance) is a natural "harden this for production" issue — the store
module's interface (`createRequest`, `updateRequest`, `getRequest`,
`listRequests`) is intentionally small so that swap doesn't ripple into
`index.js`.

## Security-relevant design choices

- The service holds an issuer secret key (`ISSUER_SECRET_KEY`) to sign
  on-chain writes. This is a reference-implementation simplification —
  see the `TODO` in `registryClient.js` about replacing this with proper
  key management (HSM/KMS/multisig) before any real deployment.
- `counterparty` is expected to be a Stellar address, not a name or other
  identifying string. See `docs/DATA_SOURCES.md` for why real screening
  eventually needs more than an address, and how that tension should be
  resolved without this service becoming a PII store.
