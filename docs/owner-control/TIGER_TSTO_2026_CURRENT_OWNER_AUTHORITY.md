# TIGER SOVEREIGN TRUST ORGANISM 2026 — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / BINDING OWNER AUTHORITY FOR TRUST AND CONTINUOUS AUTHORIZATION`

**Effective date:** 2026-08-23

**Program:** `TIGER SOVEREIGN TRUST ORGANISM 2026 (TSTO)`

**Architecture design:** `docs/superpowers/specs/2026-08-23-tiger-sovereign-trust-organism-design.md`

**M12 implementation plan:** `docs/superpowers/plans/2026-08-23-tsto-m12-sovereign-continuous-authority-core.md`

## 1. Owner adoption

The owner adopts **TSTO 2026** as the current base architecture for TIGER trust and continuous authorization.

TSTO is not an optional proposal and is not a parallel trust engine. `TSLTG` is the Genome subsystem inside TSTO, and `SCAE` is the deterministic continuous-authority decision equation inside TSTO.

The owner direction is also a scope-control law:

> **Do not propose or stack additional trust architectures outside TSTO merely for novelty. Extend TSTO only when implementation evidence proves a concrete security, correctness, interoperability, resilience, privacy, or compliance gap that the current architecture cannot safely express.**

This rule prevents security-tool accumulation and duplicate authority while preserving the right to repair a demonstrated defect.

## 2. TSTO sovereign composition

The current architecture consists of these coordinated organs:

1. **TSLTG / Trust DNA** — immutable or slow-changing source/release trust identity.
2. **Sovereign Epoch Chain** — deterministic invalidation when controlling authority changes.
3. **Runtime Trust Pulse** — time-bounded runtime evidence; M12 defines only a synthetic source contract, not real Production evidence.
4. **Trust Nervous System** — future authenticated change/revocation signals.
5. **Authority Cortex (PDP)** — deterministic exact-action decision point.
6. **Capability Enforcement Point (PEP)** — exact-action enforcement boundary.
7. **Adaptive Proof Geometry** — each action owns a fixed mandatory proof set appropriate to its risk.
8. **Evidence Constellation** — independent evidence classes; no percentage trust score for critical actions.
9. **SCAE** — `ALLOW` only when every mandatory dimension for that action is satisfied.
10. **PCAL** — Proof-Carrying Action Lease: bounded, exact-scope, short-lived authority rather than permanent privilege.
11. **Digital Immune System** — later capability-scoped isolation/revocation rather than unnecessary platform-wide failure.
12. **Transparency Memory** — later bounded cryptographic transparency evidence.
13. **Crypto Genome** — later cryptographic inventory and agility.
14. **Sovereign Cell** — optional future confidential-computing tier only where a concrete threat model justifies it.
15. **AI Sentinel** — analysis and explanation only; never sovereign permission or trusted evidence creation.

## 3. Non-negotiable authority laws

TSTO must preserve all stricter current owner laws. For Private Market Genesis specifically:

1. **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
2. **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
3. Living Classified Fabric remains retired with no fallback.
4. Advertising billing remains TIGER Pulse/country-payment authority and does not create buyer–seller transaction authority.
5. Missing evidence never becomes permission.
6. AI output, a UI role, administrator status, sponsorship, payment, workflow text, or a source Boolean cannot mint sovereign authority.
7. Raw private intent, PII, secrets, reusable capabilities, and unnecessary runtime-identifying evidence are not trust-output or advertising inventory.
8. Production/Staging deployment, remote database mutation, release activation, secrets, DNS, and payment-provider changes remain separately gated operations.

## 4. M9–M11 remain founding genes — no rebuild

- **M9 Replay Gene:** durable cross-instance replay source of truth and reviewed migration.
- **M10 Deployment Evidence Gene:** exact target-environment evidence required before deployed durability can be claimed.
- **M11 Source/Artifact Gene:** exact source readiness bound into the existing sealed Production artifact plane.

TSTO consumes those facts. It does not replace the durable replay migration, create a second Market Genesis engine, or create a second release plane.

`M11 SOURCE_VERIFIED` never implies `M10 DEPLOYED_DURABLE_VERIFIED`.

## 5. M12 implemented source boundary

**M12 — Sovereign Continuous Authority Core** is the first implemented TSTO slice on Draft PR #323.

M12 source implementation contains:

- `scripts/trust/contracts.cjs`
- `scripts/trust/action-profiles.cjs`
- `scripts/trust/scae.cjs`
- `scripts/trust/pcal.cjs`
- `scripts/trust/market-genesis-evidence.cjs`
- focused `tests/tsto-m12-*.test.cjs`

The source core defines:

- closed canonical `TIGER_TRUST_DNA_V1`;
- closed canonical `TIGER_SOVEREIGN_EPOCH_VECTOR_V1`;
- closed synthetic-only `TIGER_TRUST_PULSE_V1`;
- immutable `MARKET_GENESIS.CONTACT_HANDOFF` action profile;
- Adaptive Proof Geometry that callers cannot shrink;
- deterministic SCAE/PDP decision semantics;
- test-only `TIGER_PCAL_V1` candidate contract;
- trusted-context separation so callers cannot self-assert current time, current epochs, environment, workflow identity, attestation result, trusted signal issuer, `ALLOW`, or proof requirements;
- a pure M10+M11 Market Genesis evidence adapter that cannot convert M11 source readiness alone into deployed durability.

The first Market Genesis PCAL policy is deliberately bounded to **45 seconds and one use** in the M12 source contract.

## 6. M12 security meaning

M12 is intentionally source-only.

It **does not**:

- mint a live Production or Staging capability;
- create a real target-environment Trust Pulse;
- apply any database migration remotely;
- perform RATS/EAT runtime attestation;
- ingest real CAEP/SSF signals;
- register SCITT/Sigstore transparency evidence;
- deploy SPIFFE/SPIRE;
- claim AuthZEN, SLSA, RATS, SCITT, SPIFFE, or PQC conformance;
- change `SVEF_PRODUCTION_RELEASE_BUNDLE_V2`;
- dispatch the Production artifact builder;
- activate Contact/Handoff;
- merge PR #323;
- mutate Production, Staging, remote Supabase, DNS, secrets, or payment-provider configuration.

The only valid M12 completion statement after same-SHA repository verification is:

`SOVEREIGN_CONTINUOUS_AUTHORITY_CORE_SOURCE_VERIFIED`

It is never equivalent to:

`DEPLOYED_DURABLE_VERIFIED`

or to Production authorization.

## 7. Evidence discipline

The source file cannot safely embed its own final commit SHA as an authority fact because changing that SHA would change the commit itself.

Therefore current implementation truth is established by:

1. exact Git commit SHA and tree;
2. same-SHA repository/security/database workflows;
3. focused M12 tests and the full Quality Gate;
4. PR #323 as the dynamic exact-head evidence record.

Evidence from an older SHA remains historical only after the branch head changes.

## 8. Current owner truth

The binding trust architecture is:

`TSTO_2026_CURRENT_ONLY`

The source implementation state is:

`M0_M12_SOURCE_IMPLEMENTED_ON_DRAFT_FEATURE_BRANCH`

The deployment truth remains:

`DEPLOYED_DURABLE_VERIFIED_NOT_CLAIMED`

The release/branch truth remains:

`DRAFT_OPEN_UNMERGED / NOT_DEPLOYED_TO_PRODUCTION`

Exact-head verification status and run identifiers must be read from the current PR/CI evidence for the current branch head and must never be copied forward from an older SHA.
