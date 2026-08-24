# TIGER SOVEREIGN TRUST ORGANISM 2026 — CURRENT OWNER AUTHORITY

**Status:** `CURRENT_ONLY / BINDING OWNER AUTHORITY FOR TRUST AND CONTINUOUS AUTHORIZATION`

**Effective date:** 2026-08-24

**Program:** `TIGER SOVEREIGN TRUST ORGANISM 2026 (TSTO)`

**Architecture design:** `docs/superpowers/specs/2026-08-23-tiger-sovereign-trust-organism-design.md`

**M12 implementation plan:** `docs/superpowers/plans/2026-08-23-tsto-m12-sovereign-continuous-authority-core.md`

**M13 approved design:** `docs/superpowers/specs/2026-08-24-tsto-m13-runtime-attestation-deployment-evidence-bridge-design.md`

**M14 approved design:** `docs/superpowers/specs/2026-08-24-tsto-m14-trust-nervous-system-continuous-revocation-design.md`

**M14 implementation plan:** `docs/superpowers/plans/2026-08-24-tsto-m14-trust-nervous-system-continuous-revocation.md`

## 1. Owner adoption

The owner adopts **TSTO 2026** as the one current base architecture for TIGER trust and continuous authorization.

The implemented source sequence is:

- **M12 — Sovereign Continuous Authority Core**;
- **M13 — Runtime Attestation and Deployment Evidence Bridge**;
- **M14 — Trust Nervous System and Continuous Revocation**.

M14 is the owner-approved next TSTO organ after M13 and is now source-implemented on Draft PR #323. It extends TSTO; it does not create another trust architecture.

TSTO is not an optional proposal and is not a parallel trust engine. `TSLTG` is the Genome subsystem inside TSTO, `SCAE` is the deterministic continuous-authority decision equation inside TSTO, and the M14 Trust Nervous System supplies authenticated bounded change/revocation state to that same decision path.

The owner direction remains a scope-control law:

> **Do not propose or stack additional trust architectures outside TSTO merely for novelty. Extend TSTO only when implementation evidence proves a concrete security, correctness, interoperability, resilience, privacy, or compliance gap that the current architecture cannot safely express.**

This rule prevents security-tool accumulation and duplicate authority while preserving the right to repair a demonstrated defect.

## 2. TSTO sovereign composition

The current architecture consists of these coordinated organs:

1. **TSLTG / Trust DNA** — immutable or slow-changing source/release trust identity.
2. **Sovereign Epoch Chain** — deterministic invalidation when controlling authority changes.
3. **Runtime Trust Pulse** — time-bounded runtime evidence; M12 defines synthetic-only V1 and M13 adds attested-runtime V2 derived only from trusted M13 evidence.
4. **Trust Nervous System** — M14 source-implements authenticated, fresh, monotonic, exact-scope change/revocation evidence and provenance-protected revocation state.
5. **Authority Cortex (PDP)** — deterministic exact-action decision point.
6. **Capability Enforcement Point (PEP)** — exact-action enforcement boundary.
7. **Adaptive Proof Geometry** — each action owns a fixed mandatory proof set appropriate to its risk.
8. **Evidence Constellation** — independent evidence classes; no percentage trust score for critical actions.
9. **SCAE** — `ALLOW` only when every mandatory dimension for that action is satisfied; M14 adds provenance-enforced revocation-state evaluation.
10. **PCAL** — Proof-Carrying Action Lease: bounded, exact-scope, short-lived authority rather than permanent privilege.
11. **Digital Immune System** — later capability-scoped isolation beyond M14 signal/revocation source semantics; M16 remains separately gated.
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
6. AI output, a UI role, administrator status, sponsorship, payment, workflow text, a source Boolean, an attestation-looking payload, or a signal-looking payload cannot mint sovereign authority.
7. Raw private intent, PII, secrets, reusable capabilities, raw nonce/challenges, and unnecessary runtime-identifying evidence are not trust-output or advertising inventory.
8. Production/Staging deployment, remote database mutation, release activation, secrets, DNS, and payment-provider changes remain separately gated operations.
9. A verifier `PASS` is evidence only and never equals SCAE `ALLOW` by itself.
10. A trusted M14 signal `PASS` satisfies only its signal requirement and never equals SCAE `ALLOW` by itself.
11. A trusted M14 `REVOKED` blocks only the exact governed capability scope to which it is bound; it does not create a global platform kill switch.
12. Staging evidence can never satisfy Production and Production evidence can never be manufactured from source-only fixtures.

## 4. M9–M11 remain founding genes — no rebuild

- **M9 Replay Gene:** durable cross-instance replay source of truth and reviewed migration.
- **M10 Deployment Evidence Gene:** exact target-environment evidence required before deployed durability can be claimed.
- **M11 Source/Artifact Gene:** exact source readiness bound into the existing sealed Production artifact plane.

TSTO consumes those facts. It does not replace the durable replay migration, create a second Market Genesis engine, or create a second release plane.

`M11 SOURCE_VERIFIED` never implies `M10 DEPLOYED_DURABLE_VERIFIED`.

M13 additionally requires that M10, M11, and an authenticated/fresh M13 verifier result be mutually consistent before runtime-attested deployment state can be derived.

M14 does not change those facts. It adds a separate continuous signal/revocation requirement to the same exact-action authorization path.

## 5. M12 implemented source boundary

**M12 — Sovereign Continuous Authority Core** is the first implemented TSTO source slice on Draft PR #323.

M12 source implementation contains:

- `scripts/trust/contracts.cjs`
- `scripts/trust/action-profiles.cjs`
- `scripts/trust/scae.cjs`
- `scripts/trust/pcal.cjs`
- `scripts/trust/market-genesis-evidence.cjs`
- focused `tests/tsto-m12-*.test.cjs`

The source core defines closed Trust DNA and epoch contracts, synthetic-only `TIGER_TRUST_PULSE_V1`, immutable Market Genesis Contact/Handoff proof geometry, deterministic SCAE/PDP semantics, test-only PCAL candidate semantics, and a pure M10+M11 Market Genesis evidence adapter.

The first Market Genesis PCAL policy remains deliberately bounded to **45 seconds and one use** in the M12 source contract.

The valid M12 completion statement remains:

`SOVEREIGN_CONTINUOUS_AUTHORITY_CORE_SOURCE_VERIFIED`

## 6. M13 implemented source boundary

**M13 — Runtime Attestation and Deployment Evidence Bridge** is owner-approved as part of the same TSTO architecture and is implemented source-only on Draft PR #323.

M13 source implementation contains:

- `scripts/trust/runtime-attestation.cjs`
- `scripts/trust/deployment-attestation-bridge.cjs`
- M13 extensions in `scripts/trust/contracts.cjs`
- M13 trusted-V2 enforcement in `scripts/trust/scae.cjs`
- focused `tests/tsto-m13-*.test.cjs`

The M13 source contract establishes:

- closed `TIGER_ATTESTATION_RESULT_V1` normalization with a trusted verifier-adapter provenance boundary;
- module-owned maximum attestation lifetime of **5 minutes**;
- exact release SHA, target environment, runtime artifact, verifier/attester reference, appraisal/evidence and freshness digest binding;
- pure cross-binding of M10 deployment evidence, M11 source readiness, M12 Trust DNA/epochs, and trusted M13 attestation results;
- `TIGER_TRUST_PULSE_V2` with `ATTESTED_RUNTIME_RESULT`, a module-owned maximum lifetime of **60 seconds**, and a hard ceiling at the source attestation expiry;
- SCAE acceptance of V2 only when the original Pulse carries trusted Bridge provenance;
- preservation of M12 V1 semantics and all Market Genesis immutable laws;
- evidence-minimized outputs containing bounded digest references rather than raw nonce, secrets, PII, credentials, database URLs, or unnecessary runtime host data.

M13 source completion may state only:

`RUNTIME_ATTESTATION_DEPLOYMENT_BRIDGE_SOURCE_VERIFIED`

That statement requires exact-head repository verification and must be read together with the current PR/CI evidence.

## 7. M14 implemented source boundary

**M14 — Trust Nervous System and Continuous Revocation** is owner-approved as part of TSTO and is source-implemented on Draft PR #323.

M14 source implementation contains:

- `scripts/trust/trust-signals.cjs`
- `scripts/trust/revocation-state.cjs`
- M14 revocation-state enforcement in `scripts/trust/scae.cjs`
- test-only fixture support in `tests/helpers/tsto-m14-revocation-fixture.cjs`
- focused `tests/tsto-m14-*.test.cjs`
- migrated M12/M13 SCAE/PCAL fixtures using original trusted M14 revocation-state objects instead of the retired shape-only signal path.

The M14 source contract establishes:

- closed `TIGER_TRUST_SIGNAL_V1` with `AUTHENTICATED_TRUST_SIGNAL` class;
- trusted signal provenance through a process-local non-serializable adapter boundary rather than shape trust;
- module-owned maximum signal lifetime of **5 minutes**;
- exact subject/resource/action-profile/country/release-DNA digest scope binding;
- monotonic per-scope/issuer sequence behavior: higher sequence supersedes lower, lower sequence rollback fails, identical same-sequence duplicate is idempotent, and conflicting same-sequence signals fail closed;
- `TIGER_REVOCATION_STATE_V1`, derived only from original trusted signals and carrying its own process-local provenance;
- capability-scoped state rather than one global revocation Boolean;
- SCAE reason boundaries `TRUST_SIGNAL_MISSING`, `TRUST_SIGNAL_UNTRUSTED`, `TRUST_SIGNAL_STALE`, `TRUST_SIGNAL_SCOPE_MISMATCH`, and `TRUST_SIGNAL_REVOKED`;
- removal of the executable shape-only `trusted_signals` fallback from SCAE;
- proof that trusted `REVOKED` blocks even when the M13 Bridge-derived Trust Pulse V2 is otherwise valid and trusted;
- proof that trusted `PASS` cannot bypass proof geometry, epochs, runtime evidence, whole-vehicle prohibition, transaction-authority prohibition, or other mandatory evidence;
- evidence-minimized state outputs carrying bounded digests/references rather than raw subject/resource identifiers, nonce, credentials, secrets, database URLs, message content, or precise locations;
- source-only code with no network, cloud, remote database, DNS, secret, payment-provider, or deployment side effect.

M14 source completion may state only after exact-head repository verification is GREEN:

`TRUST_NERVOUS_SYSTEM_CONTINUOUS_REVOCATION_SOURCE_VERIFIED`

M14 sequence observation is intentionally in-process in this source slice. It does **not** claim distributed or cross-instance durable signal delivery/state.

## 8. Explicit M13 non-claims

M13 source implementation does **not**:

- mint a live Production or Staging capability;
- claim `PRODUCTION_RUNTIME_ATTESTED`;
- claim `DEPLOYED_DURABLE_VERIFIED` without real separately authorized M10 target-environment evidence;
- apply a database migration remotely;
- activate Contact/Handoff;
- dispatch/promote/deploy a Production artifact;
- perform real cloud or hardware/TEE attestation;
- claim RATS, EAT, EAR, AR4SI, provider, SLSA, SCITT, SPIFFE, or PQC conformance merely from source structure;
- merge PR #323;
- mutate Production, Staging, remote Supabase, DNS, secrets, or payment-provider configuration.

M13 provider/verifier adapters remain replaceable boundaries. Provider-specific crypto verification, certificate-chain validation, cloud API calls, nonce issuance, or hardware appraisal are outside this source-only slice unless separately approved and evidenced later.

## 9. Explicit M14 non-claims

M14 source implementation does **not**:

- claim `PRODUCTION_CONTINUOUS_REVOCATION_ACTIVE`;
- claim `CAEP_CONFORMANT` or `SSF_CONFORMANT`;
- create a live external signal subscription, webhook, message broker, or provider integration;
- create distributed durable revocation state or cross-instance sequence storage;
- mint a live Production/Staging capability or activate Contact/Handoff;
- deploy to Production or Staging;
- mutate remote Supabase/database state;
- mutate DNS, secrets, payment-provider configuration, or release activation;
- merge PR #323 or mutate `main`;
- claim `PRODUCTION_READY`.

A source-only trusted adapter or fixture is not evidence that a Production/Staging signal issuer exists.

## 10. Evidence discipline

The source files cannot safely embed their own final commit SHA as an authority fact because changing that SHA would change the commit itself.

Therefore current implementation truth is established by:

1. exact Git commit SHA and tree;
2. same-SHA repository/security/database workflows;
3. focused M12/M13/M14 tests and the full Quality Gate;
4. PR #323 as the dynamic exact-head evidence record.

Evidence from an older SHA remains historical only after the branch head changes.

No source-only test fixture is real runtime attestation or live continuous-revocation evidence.

## 11. Current owner truth

The binding trust architecture is:

`TSTO_2026_CURRENT_ONLY`

The source implementation state is:

`M0_M14_SOURCE_IMPLEMENTED_ON_DRAFT_FEATURE_BRANCH`

The M13 source completion truth remains:

`RUNTIME_ATTESTATION_DEPLOYMENT_BRIDGE_SOURCE_VERIFIED`

The M14 source completion truth is permitted only when the current exact branch head has matching GREEN external CI/rehearsal evidence:

`TRUST_NERVOUS_SYSTEM_CONTINUOUS_REVOCATION_SOURCE_VERIFIED`

The deployment truth remains:

`DEPLOYED_DURABLE_VERIFIED_NOT_CLAIMED`

The release/branch truth remains:

`DRAFT_OPEN_UNMERGED / NOT_DEPLOYED_TO_PRODUCTION`

Exact-head verification status and run identifiers must be read from the current PR/CI evidence for the current branch head and must never be copied forward from an older SHA.
