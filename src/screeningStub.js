/**
 * STUB sanctions/PEP screening.
 *
 * This is NOT real sanctions screening. It exists so the rest of the
 * pipeline (registry write, API, dashboard) can be built and tested end to
 * end before a real data source is wired in.
 *
 * ## What "real" would require
 *
 * A production screening service needs to check the counterparty against
 * actual sanctions/PEP data — e.g. OFAC's SDN list, EU consolidated list,
 * or a commercial KYC/AML data provider (ComplyAdvantage, Chainalysis,
 * Refinitiv World-Check, etc). None of that is implemented here. Wiring one
 * in involves:
 *
 *   1. Choosing a data source and getting API access / a data feed.
 *   2. Deciding what identifier you're actually matching against (wallet
 *      address alone is NOT sufficient for real sanctions screening in most
 *      jurisdictions — you typically need name/entity data from the
 *      counterparty, which raises its own PII-handling requirements this
 *      reference implementation deliberately avoids; see docs/DATA_SOURCES.md).
 *   3. Handling false positives / manual review workflows — real screening
 *      is not a clean boolean in practice.
 *
 * ## What this stub actually does
 *
 * Deterministically maps a counterparty identifier to one of the three
 * ScreeningStatus values, purely so the pipeline has *something* to write
 * to the registry. The mapping has no relationship to real risk and must
 * not be treated as such.
 */

const STUB_STATUSES = ["clear", "flagged", "pending"];

/**
 * @param {string} counterpartyIdentifier - wallet address + optional off-chain reference
 * @returns {{ status: "clear" | "flagged" | "pending", stub: true }}
 */
export function stubScreen(counterpartyIdentifier) {
  // Deterministic-but-arbitrary: hash the identifier to pick a status, so
  // the same input always produces the same output during testing/demo,
  // without pretending to encode any real screening logic.
  const hash = simpleHash(counterpartyIdentifier);
  const status = STUB_STATUSES[hash % STUB_STATUSES.length];

  return { status, stub: true };
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}
