# Travel-Rule Screening Service

Repo: `TravelRule/screening-service`

An off-chain reference service that accepts a counterparty identifier,
runs a (currently stubbed) sanctions/PEP screening check, and writes the
result to the on-chain `attestation-registry` contract.

> **The sanctions-list matching in this repo is a stub.** It does not check
> any real data source. See [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md)
> before using this for anything beyond local development/demo.

## Documentation

| Doc | Covers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Request lifecycle, dry-run mode, how this talks to the registry |
| [`docs/API.md`](docs/API.md) | Every endpoint, request/response shapes |
| [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) | Exactly what's stubbed and what a real integration needs |

## Quickstart

```bash
cp .env.example .env
# edit .env: set ATTESTATION_REGISTRY_CONTRACT_ID to your deployed registry
npm install
npm test
npm start
```

By default, without generated Soroban bindings present (see
`docs/ARCHITECTURE.md`), this runs in **DRY-RUN mode**: it performs the stub
screening and logs what it would have written on-chain, without submitting
a transaction. This is intentional — it lets you exercise the full request
flow (`POST /screen` → `GET /status/:reference`) without needing a funded
testnet issuer key on hand.

## Endpoints

- `POST /screen` — start a screening check
- `GET /status/:reference` — poll the result
- `GET /requests` — recent requests (used by the dashboard)
- `GET /health`

Full request/response shapes in [`docs/API.md`](docs/API.md).

## Relationship to the other travel-rule repos

```
attestation-registry   -- this service writes attestations here
screening-service       <- you are here (this repo)
api                     -- separate concern: IVMS101 messaging
dashboard               -- reads from this service's /requests
```
