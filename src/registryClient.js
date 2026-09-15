/**
 * Client for writing attestations to the on-chain attestation-registry
 * contract.
 *
 * ## Important: use generated bindings, don't hand-roll ScVal encoding
 *
 * Soroban's CLI can generate a typed JS/TS client directly from a deployed
 * contract's interface:
 *
 *   soroban contract bindings typescript \
 *     --contract-id $ATTESTATION_REGISTRY_CONTRACT_ID \
 *     --network testnet \
 *     --output-dir ./generated/attestation-registry-client
 *
 * That generated client handles argument encoding (addresses, the
 * ScreeningStatus enum, etc) correctly for whatever contract version is
 * actually deployed — which is safer than hand-writing ScVal construction
 * here, especially since enum encoding can vary by SDK version.
 *
 * This file expects that generated client to exist at
 * `../generated/attestation-registry-client` (see docs/ARCHITECTURE.md).
 * If it hasn't been generated yet, this module falls back to a DRY-RUN mode
 * so the rest of the service is still runnable for local development/demo
 * purposes — it logs what it *would* have submitted instead of failing.
 */

import { Keypair } from "@stellar/stellar-sdk";

let generatedClientModule = null;
try {
  // Dynamic import so a missing generated client doesn't crash the whole
  // service at boot — see DRY-RUN fallback below.
  generatedClientModule = await import(
    "../generated/attestation-registry-client/index.js"
  ).catch(() => null);
} catch {
  generatedClientModule = null;
}

export function createRegistryClient(env = process.env) {
  const {
    SOROBAN_RPC_URL,
    ATTESTATION_REGISTRY_CONTRACT_ID,
    ISSUER_SECRET_KEY,
    SOROBAN_NETWORK_PASSPHRASE,
  } = env;

  const dryRun = !generatedClientModule;

  if (dryRun) {
    console.warn(
      "[registryClient] No generated bindings found at " +
        "../generated/attestation-registry-client — running in DRY-RUN mode. " +
        "Attestations will be logged, not written on-chain. See this file's " +
        "top comment for how to generate real bindings."
    );
  }

  const issuerKeypair = ISSUER_SECRET_KEY?.startsWith("S")
    ? safeKeypairFromSecret(ISSUER_SECRET_KEY)
    : null;

  return {
    dryRun,

    /**
     * @returns {Promise<{ txHash: string | null, dryRun: boolean }>}
     */
    async writeAttestation({ counterparty, status, referenceId }) {
      if (dryRun || !issuerKeypair) {
        console.log(
          `[registryClient][DRY RUN] would write attestation: ` +
            `counterparty=${counterparty} status=${status} referenceId=${referenceId}`
        );
        return { txHash: null, dryRun: true };
      }

      const { Client } = generatedClientModule;
      const client = new Client({
        contractId: ATTESTATION_REGISTRY_CONTRACT_ID,
        networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
        rpcUrl: SOROBAN_RPC_URL,
        publicKey: issuerKeypair.publicKey(),
      });

      const tx = await client.write_attestation({
        issuer: issuerKeypair.publicKey(),
        counterparty,
        status, // "Clear" | "Flagged" | "Pending" — matches the generated enum binding
        reference_id: referenceId,
      });

      const sent = await tx.signAndSend({
        signTransaction: async (xdr) => {
          // TODO: for anything beyond local/testnet demo use, replace this
          // with a proper signing flow (hardware key, KMS, multisig) rather
          // than holding a raw secret key in the service's environment.
          const { TransactionBuilder } = await import("@stellar/stellar-sdk");
          const built = TransactionBuilder.fromXDR(xdr, SOROBAN_NETWORK_PASSPHRASE);
          built.sign(issuerKeypair);
          return built.toXDR();
        },
      });

      return { txHash: sent.sendTransactionResponse?.hash ?? null, dryRun: false };
    },
  };
}

function safeKeypairFromSecret(secret) {
  try {
    return Keypair.fromSecret(secret);
  } catch {
    console.warn("[registryClient] ISSUER_SECRET_KEY is not a valid secret key — falling back to dry-run.");
    return null;
  }
}
