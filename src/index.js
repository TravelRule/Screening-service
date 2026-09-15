import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { stubScreen } from "./screeningStub.js";
import { createRequest, updateRequest, getRequest, listRequests } from "./store.js";
import { createRegistryClient } from "./registryClient.js";

const PORT = process.env.PORT || 4100;
const app = express();
app.use(express.json());

const registryClient = createRegistryClient();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", registryDryRun: registryClient.dryRun });
});

/**
 * POST /screen
 * body: { counterparty: "<Stellar address>", metadata?: object }
 *
 * Runs the (stub) screening check, writes the result to the on-chain
 * attestation registry, and returns a reference ID the caller can poll
 * via GET /status/:reference.
 */
app.post("/screen", async (req, res) => {
  const { counterparty } = req.body ?? {};

  if (!counterparty || typeof counterparty !== "string") {
    return res.status(400).json({ error: "counterparty (Stellar address) is required" });
  }

  const referenceId = crypto.randomUUID();
  createRequest({ referenceId, counterpartyIdentifier: counterparty });

  // Respond immediately with "pending" and do the screening + on-chain
  // write asynchronously — screening services in general shouldn't block
  // an HTTP response on an on-chain transaction's confirmation time.
  res.status(202).json({ referenceId, status: "pending" });

  processScreening(referenceId, counterparty).catch((err) => {
    console.error(`[screening] unhandled error processing ${referenceId}:`, err);
    updateRequest(referenceId, { status: "error", error: err.message });
  });
});

async function processScreening(referenceId, counterparty) {
  const { status } = stubScreen(counterparty);

  // Map the stub's lowercase status to the contract's ScreeningStatus enum
  // casing. Keeping this mapping explicit (rather than just capitalizing)
  // means a future real screening source with different status naming only
  // needs to update this one line.
  const contractStatus = { clear: "Clear", flagged: "Flagged", pending: "Pending" }[status];

  const { txHash, dryRun } = await registryClient.writeAttestation({
    counterparty,
    status: contractStatus,
    referenceId,
  });

  updateRequest(referenceId, { status, registryTxHash: txHash, dryRun });
}

/**
 * GET /status/:reference
 */
app.get("/status/:reference", (req, res) => {
  const record = getRequest(req.params.reference);
  if (!record) {
    return res.status(404).json({ error: "not_found" });
  }
  res.json({ data: record });
});

/**
 * GET /requests — recent screening requests, used by the dashboard.
 * Not in the original 3-endpoint spec, but small and useful; kept separate
 * so it's obvious this is an addition beyond the MVP's minimum surface.
 */
app.get("/requests", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  res.json({ data: listRequests({ limit }) });
});

app.use((_req, res) => res.status(404).json({ error: "not_found" }));

app.listen(PORT, () => {
  console.log(`[screening-service] listening on port ${PORT} (registry dry-run: ${registryClient.dryRun})`);
});
