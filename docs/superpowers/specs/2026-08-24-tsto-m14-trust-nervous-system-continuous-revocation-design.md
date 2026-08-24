# TSTO M14 — Trust Nervous System and Continuous Revocation Design

**Date:** 2026-08-24
**Status:** `OWNER APPROVED / SOURCE IMPLEMENTED / EXACT-HEAD VERIFICATION REQUIRED`
**Program:** `TIGER SOVEREIGN TRUST ORGANISM 2026 (TSTO)`
**Milestone:** `M14 — Trust Nervous System and Continuous Revocation`
**Authority:** `docs/owner-control/TIGER_TSTO_2026_CURRENT_OWNER_AUTHORITY.md`
**Base architecture:** `docs/superpowers/specs/2026-08-23-tiger-sovereign-trust-organism-design.md`
**Predecessor:** `M13 — Runtime Attestation and Deployment Evidence Bridge`

## 1. Purpose

M14 closes the concrete trust gap that existed after M13: before M14, SCAE accepted a minimal `trusted_signals` object with only a status and issuer digest. That source shape did not by itself establish authenticated provenance, bounded freshness, ordering, anti-replay semantics, or capability scope.

M14 adds the **Trust Nervous System** inside TSTO. The source implementation replaces that weak shape-only path with authenticated signal provenance, monotonic scope resolution, trusted revocation-state provenance, and SCAE enforcement. It does not introduce a parallel trust architecture and does not create a network event bus, Production integration, or external provider dependency in this source-only slice.

The governing principle is:

> **Only authenticated, fresh, monotonic, scope-compatible signals may affect sovereign authorization, and a valid revocation blocks only the capabilities that depend on the revoked trust domain.**

## 2. Non-negotiable owner laws

M14 preserves all stricter TSTO and Market Genesis laws:

1. **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
2. **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
3. Living Classified Fabric remains retired with no fallback or parallel authority.
4. Missing or untrusted signal evidence never becomes permission.
5. AI output, UI state, role labels, sponsorship, payment, source booleans, and attestation-looking payloads cannot mint trusted revocation or authorization state.
6. A trusted signal never overrides whole-vehicle prohibition, transaction-authority prohibition, required deployment evidence, required source evidence, proof geometry, epoch checks, or runtime-attestation checks.
7. Production/Staging deployment, remote database mutation, release activation, secrets, DNS, payment providers, and `main` remain separately gated operations.
8. Raw private intent, PII, credentials, secrets, raw nonce/challenges, reusable capabilities, precise location, and unnecessary runtime identifiers do not appear in Trust Nervous System outputs.

## 3. Scope and explicit non-goals

### In scope

- Closed canonical signal contract.
- Authenticated adapter boundary that grants trusted provenance only after external authentication succeeds.
- Trusted time supplied by a factory/adapter boundary, never by caller payload.
- Bounded signal freshness.
- Monotonic sequence semantics for anti-replay and anti-rollback.
- Exact scope binding to the capability context that a signal may affect.
- Deterministic derivation of revocation state from trusted signals.
- Provenance-enforced SCAE integration.
- Capability-scoped fail-closed behavior.
- Focused TDD tests and same-head repository verification.

### Out of scope

- Real network event delivery or message broker deployment.
- CAEP/SSF conformance claims.
- External webhook subscriptions.
- Production or Staging signal issuers.
- Secret/certificate provisioning.
- Remote database tables or migrations.
- DNS/payment-provider mutation.
- Merge to `main`.
- Production Contact/Handoff activation.
- M15 Transparency/Workload Identity, M16 Digital Immune System, or M17 Crypto Agility implementation.

## 4. Signal contract

M14 introduces `TIGER_TRUST_SIGNAL_V1` as a closed canonical object.

Required fields:

- `schema`: exactly `TIGER_TRUST_SIGNAL_V1`
- `signal_class`: exactly `AUTHENTICATED_TRUST_SIGNAL`
- `status`: `PASS | REVOKED`
- `signal_type`: bounded source-controlled identifier for the trust domain being signaled
- `subject_ref_sha256`: SHA-256 digest reference
- `resource_ref_sha256`: SHA-256 digest reference
- `action_profile_ref_sha256`: SHA-256 digest reference
- `country_ref_sha256`: SHA-256 digest reference
- `release_dna_sha256`: SHA-256 digest binding the release trust identity
- `issuer_ref_sha256`: SHA-256 digest binding the authenticated issuer identity
- `sequence`: non-negative safe integer
- `issued_at_ms`: trusted issuance time
- `fresh_until_ms`: strict freshness bound
- `evidence_sha256`: SHA-256 digest reference to authenticated upstream evidence
- `state`: exactly `PASS`

All objects use exact closed keys. Unknown fields fail validation. Security-sensitive SHA-256 fields reject all-zero values.

The M14 source contract sets a module-owned **maximum signal lifetime of 5 minutes**. A signal with `issued_at_ms` in the future relative to trusted current time, an overlong lifetime, or an expired `fresh_until_ms` is invalid for live authorization.

## 5. Trusted provenance boundary

Shape validation never creates trusted provenance.

M14 implements a trusted adapter boundary similar in discipline to M13:

`createTrustedSignalAdapter({ authenticate, clock })`

The adapter:

1. receives an external/untrusted candidate through the provider boundary;
2. calls `authenticate(candidate)`;
3. requires authentication success before normalization;
4. validates the normalized closed signal contract;
5. checks freshness using `clock()` supplied to the adapter boundary;
6. records trusted provenance in process-local non-serializable state;
7. returns an immutable trusted signal object.

A copied, spread, parsed, serialized, reconstructed, or merely shape-valid signal does not inherit trusted provenance.

## 6. Scope binding

Signals are capability scoped. M14 does not use one global Boolean such as `platform_revoked`.

A signal is compatible with an authorization context only when the signal's subject, resource, action profile, country, and release DNA bindings match the context required by that exact decision.

The caller asking for authorization cannot widen or shrink signal scope. Scope identifiers are represented as digest references to avoid leaking raw PII or business-sensitive payloads into trust outputs.

A revocation for one subject/resource/action/country/release tuple does not automatically revoke unrelated capabilities.

## 7. Monotonic sequence and anti-replay

M14 implements deterministic sequence ordering per exact signal scope and issuer.

Rules:

1. Higher `sequence` supersedes lower `sequence` for the same exact scope and issuer.
2. A lower or equal sequence presented after a newer accepted sequence cannot roll state backward.
3. A `PASS` at an older sequence cannot erase a newer `REVOKED`.
4. Duplicate same-sequence signals are idempotent only when their canonical digest is identical; conflicting same-sequence signals fail closed.
5. Sequence ordering is source-contract logic in M14; durable cross-instance storage or distributed delivery is not claimed until a separately approved integration provides durable state.

The source-only resolver keeps sequence observation inside a bounded in-process resolver instance. This does not claim cross-instance durability.

## 8. Revocation state

M14 implements `TIGER_REVOCATION_STATE_V1`, derived only from original trusted signal objects.

Required output fields:

- `schema`: `TIGER_REVOCATION_STATE_V1`
- `signal_digest_sha256`
- `scope_digest_sha256`
- `issuer_ref_sha256`
- `release_dna_sha256`
- `sequence`
- `effective_status`: `PASS | REVOKED`
- `issued_at_ms`
- `fresh_until_ms`
- `state`: `PASS`

The output contains bounded digests/references only. It does not contain raw subject IDs, raw resources, raw country payloads, message content, secrets, nonce values, credentials, or private locations.

Revocation-state provenance is also non-serializable. SCAE accepts M14 revocation state only when it is the original trusted object emitted by the M14 resolver.

## 9. SCAE integration

M14 replaces the weak M12-style `trusted_signals` acceptance path with provenance-enforced revocation state while preserving M12/M13 decision laws.

The SCAE trusted context consumes one bounded M14 revocation-state input for the current governed action.

SCAE behavior:

- missing required revocation state → `TRUST_SIGNAL_MISSING`
- shape-valid but non-provenance state → `TRUST_SIGNAL_UNTRUSTED`
- stale state → `TRUST_SIGNAL_STALE`
- release/scope mismatch → `TRUST_SIGNAL_SCOPE_MISMATCH`
- effective `REVOKED` → `TRUST_SIGNAL_REVOKED`
- valid, trusted, fresh, scope-compatible `PASS` → signal dimension satisfied, subject to every other TSTO requirement

A trusted `PASS` does not itself create `ALLOW`; SCAE still requires all mandatory dimensions.

A trusted `REVOKED` always blocks the exact governed capability regardless of otherwise valid M13 runtime attestation. Focused tests additionally prove that a trusted M14 `REVOKED` blocks even when the M13 Bridge-derived Trust Pulse V2 is valid and trusted.

## 10. Backward-compatibility boundary

M14 does not weaken or silently reinterpret prior source contracts.

- `TIGER_TRUST_PULSE_V1` remains synthetic-test-only under M12 semantics.
- `TIGER_TRUST_PULSE_V2` remains trusted only through the M13 deployment-attestation bridge.
- Existing M12/M13 validators remain closed.
- Existing immutable Market Genesis laws remain unchanged.
- Existing M13 attestation/verifier provenance remains unchanged.
- M12/M13 test fixtures were migrated to original trusted M14 revocation-state objects; no executable shape-only `trusted_signals` fallback remains in SCAE.

Focused tests may construct M12/M13 fixtures, but those fixtures never become real Production/Staging evidence.

## 11. Implemented source units

Created:

- `scripts/trust/trust-signals.cjs`
  - signal schema validation
  - trusted adapter
  - provenance checks
  - signal digest helpers

- `scripts/trust/revocation-state.cjs`
  - exact-scope digest
  - monotonic sequence resolver
  - trusted revocation-state derivation
  - revocation-state provenance checks

Modified:

- `scripts/trust/scae.cjs`
  - consumes trusted M14 revocation state rather than trusting signal shape
  - enforces freshness/scope/revocation reason codes

- Existing M12/M13 SCAE/PCAL test fixtures were migrated to the M14 trusted revocation-state boundary without weakening their original assertions.

Created focused tests:

- `tests/tsto-m14-trust-signals.test.cjs`
- `tests/tsto-m14-revocation-state.test.cjs`
- `tests/tsto-m14-scae-revocation.test.cjs`
- `tests/tsto-m14-acceptance-boundaries.test.cjs`

A test-only fixture helper exists at `tests/helpers/tsto-m14-revocation-fixture.cjs` to avoid duplicating security-sensitive fixture construction across M12/M13 regression tests.

## 12. Required acceptance tests

M14 source implementation is not complete unless tests prove at least:

1. exact closed signal keys;
2. shape validation alone does not grant trusted provenance;
3. failed adapter authentication fails closed;
4. trusted clock, not caller time, controls freshness;
5. future, expired, and overlong signals fail;
6. all-zero security digests fail;
7. copied/spread/serialized signal loses trusted provenance;
8. exact subject/resource/action/country/release binding;
9. higher sequence supersedes lower sequence;
10. older PASS cannot erase newer REVOKED;
11. same-sequence conflicting signal fails closed;
12. identical same-sequence duplicate is idempotent;
13. revocation state cannot be minted from a merely shape-valid signal;
14. copied revocation state loses trusted provenance;
15. SCAE blocks untrusted state;
16. SCAE blocks stale state;
17. SCAE blocks scope mismatch;
18. SCAE blocks valid trusted REVOKED even with valid M13 Pulse V2;
19. valid trusted PASS can satisfy only the signal requirement and cannot bypass other proof geometry;
20. whole-vehicle prohibition still overrides otherwise perfect M13+M14 evidence;
21. transaction-authority prohibition still overrides otherwise perfect M13+M14 evidence;
22. outputs contain no raw nonce, password, credential, private key, database URL, raw subject, raw resource, or precise location;
23. M12 V1 and M13 V2 pulse semantics remain unchanged;
24. no network, cloud, remote DB, Production/Staging, DNS, secret, payment-provider, or `main` mutation is required by the M14 source tests.

The focused acceptance suite also proves capability-scope isolation: revocation of one exact scope does not poison an unrelated scope inside the source resolver.

## 13. Completion truth and non-claims

The source implementation exists, but the completion truth below is valid only after the final current head receives exact-head GREEN verification:

`TRUST_NERVOUS_SYSTEM_CONTINUOUS_REVOCATION_SOURCE_VERIFIED`

This statement is source-level only.

It must never be interpreted as:

- `PRODUCTION_CONTINUOUS_REVOCATION_ACTIVE`
- `CAEP_CONFORMANT`
- `SSF_CONFORMANT`
- `PRODUCTION_READY`
- `CONTACT_HANDOFF_ENABLED`
- distributed durable signal delivery
- Production/Staging signal-provider integration
- remote deployment
- merge to `main`

The PR remains Draft/Open/Unmerged unless separately authorized after the relevant gates are satisfied.
