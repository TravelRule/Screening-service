# API reference

Base URL (local dev): `http://localhost:4100`

## `GET /health`

```json
{ "status": "ok", "registryDryRun": true }
```

## `POST /screen`

**Request body:**
```json
{ "counterparty": "GABC...STELLARADDRESS" }
```

**Response (202 Accepted):**
```json
{ "referenceId": "b3f1...uuid", "status": "pending" }
```

Errors:
- `400` if `counterparty` is missing or not a string.

## `GET /status/:reference`

**Response (200):**
```json
{
  "data": {
    "referenceId": "b3f1...uuid",
    "counterpartyIdentifier": "GABC...STELLARADDRESS",
    "status": "clear",
    "createdAt": "2026-09-14T10:00:00.000Z",
    "updatedAt": "2026-09-14T10:00:03.000Z",
    "registryTxHash": null,
    "dryRun": true
  }
}
```

`status` is one of: `pending` (screening in progress or awaiting on-chain
confirmation), `clear`, `flagged`, or `error` (something went wrong during
processing — check server logs; this is a reference implementation without
a retry queue).

`registryTxHash` is `null` while in dry-run mode (see
`docs/ARCHITECTURE.md`), or when the request is still pending.

Errors:
- `404` if `reference` doesn't match any known request.

## `GET /requests?limit=`

Recent requests, most recent first. Used by the dashboard.

```json
{ "data": [ /* array of the same shape as GET /status/:reference's "data" */ ] }
```

`limit` defaults to 20, capped at 100.
