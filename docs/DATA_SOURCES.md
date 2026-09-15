# Data sources: what's real, what's stubbed

## Current state: fully stubbed

`src/screeningStub.js` does not check any real sanctions or PEP list. It
deterministically derives a status from a hash of the counterparty
identifier, purely so the rest of the pipeline (registry write, API,
dashboard) has real data to work with end to end. **Do not present this
service's output as a real screening result to anyone.**

## What a real integration needs to decide

### 1. Which data source

Common options for a real deployment:

- **OFAC SDN list** (US) — free, but requires you to build/maintain your
  own matching logic (fuzzy name matching is non-trivial).
- **EU consolidated sanctions list** — similar tradeoffs.
- **Commercial KYC/AML providers** (e.g. ComplyAdvantage, Chainalysis,
  Refinitiv World-Check, Elliptic) — handle matching/fuzzy-search for you,
  at a cost, and often include PEP (politically exposed person) data OFAC
  alone doesn't cover.

This reference implementation takes no position on which to use — that's
a business/compliance decision for whoever operationalizes this, ideally
made with input from the "person owning compliance-domain accuracy" role
described in the top-level playbook.

### 2. What are you actually matching against?

This is the part that doesn't have a clean answer for a wallet-based
system, and is worth being explicit about:

- Real sanctions screening is normally done against a **name and other
  identity attributes** (date of birth, nationality, etc), not a wallet
  address. A Stellar address alone doesn't tell you who controls it.
- But storing that identity data anywhere in this pipeline — including in
  the screening service's own database — reintroduces exactly the PII risk
  the attestation registry was designed to avoid putting on-chain.

**This reference implementation deliberately does not solve this.** A real
deployment has a few paths, each with different tradeoffs:

- Require the _anchor_ (who already has KYC'd their own customer) to
  submit a screening result to this service, rather than having this
  service do primary screening itself — this service becomes an
  attestation _relay_, not a screener.
- Screen only the readily-available on-chain identifier (address,
  transaction pattern) against blockchain-specific risk data (e.g.
  Chainalysis-style address risk scoring) rather than named-entity
  sanctions lists — narrower coverage, but doesn't require handling PII
  at all.
- Have the anchor's own KYC system hold the PII and call this service
  with only a pass/fail result plus an opaque case reference — this is the
  model the current `reference_id` field is designed around.

Pick one explicitly before going to production; don't let this ambiguity
resolve itself accidentally by whichever field happens to be convenient to
pass in.

### 3. False positives and manual review

Real sanctions/PEP matching produces false positives, sometimes a lot of
them (common names, transliteration variants). A production system needs:

- A manual review queue for `flagged`/ambiguous results, not just an
  automatic `flagged` attestation.
- A process for correcting/overturning a wrong `flagged` status — this
  registry's overwrite-on-write design (see the registry's
  `docs/ARCHITECTURE.md`) supports this technically, but the _process_
  around who can request/approve a correction isn't defined here.

None of this is implemented in the stub. Treat `stubScreen`'s three-value
output as a placeholder for a much richer real system, not a template to
copy the shape of.
