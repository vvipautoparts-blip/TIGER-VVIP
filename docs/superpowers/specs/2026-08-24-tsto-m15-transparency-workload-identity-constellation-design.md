# TSTO M15 — Transparency and Workload Identity Constellation Design

**Date:** 2026-08-24
**Status:** `OWNER APPROVED DESIGN / SOURCE IMPLEMENTATION NOT STARTED`
**Program:** `TIGER SOVEREIGN TRUST ORGANISM 2026 (TSTO)`
**Milestone:** `M15 — Transparency and Workload Identity Constellation`
**Authority:** `docs/owner-control/TIGER_TSTO_2026_CURRENT_OWNER_AUTHORITY.md`
**Base architecture:** `docs/superpowers/specs/2026-08-23-tiger-sovereign-trust-organism-design.md`
**Predecessors:** `M13 — Runtime Attestation and Deployment Evidence Bridge`, `M14 — Trust Nervous System and Continuous Revocation`

## 1. Purpose

M15 closes the next concrete trust gap after M14: TIGER can bind runtime attestation to release/environment/artifact evidence and can consume authenticated, fresh, capability-scoped revocation state, but the current source path does not yet require independently trusted workload identity evidence or independently trusted transparency evidence before a high-impact governed action can pass SCAE.

M15 adds the **Transparency and Workload Identity Constellation** inside TSTO. It does not create a parallel trust architecture, a second release plane, or a live external transparency/workload-identity service in this source-only slice.

The governing principle is:

> **A high-impact runtime authorization may depend on workload identity and transparency only when both are independently authenticated, fresh where applicable, mutually bound to the same release/runtime context, provenance-protected, and consumed through the existing TSTO decision path.**

## 2. Non-negotiable owner laws

M15 preserves all stricter TSTO, M13, M14, and Market Genesis laws:

1. **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**
2. **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**
3. Living Classified Fabric remains retired with no fallback or parallel authority.
4. Missing, copied, reconstructed, stale, mismatched, or unauthenticated evidence never becomes permission.
5. AI output, UI state, administrator labels, sponsorship, payment, source booleans, workload-looking payloads, transparency-looking receipts, or attestation-looking payloads cannot mint trusted evidence.
6. M15 never overrides M14 `REVOKED`, M13 runtime-attestation requirements, Trust DNA, epochs, proof geometry, replay, freshness, Market Genesis whole-vehicle prohibition, transaction-authority prohibition, source evidence, or deployment evidence.
7. Production/Staging deployment, remote database mutation, release activation, certificates, secrets, DNS, payment providers, and `main` remain separately gated operations.
8. Raw private intent, PII, credentials, secrets, raw nonces/challenges, private keys, reusable capabilities, precise location, raw workload identifiers, and unnecessary registry/provider payloads do not appear in M15 trust outputs.

## 3. Scope and explicit non-goals

### In scope

- Closed canonical workload-identity result contract.
- Trusted workload-identity adapter boundary with non-serializable provenance.
- Closed canonical transparency result contract.
- Trusted transparency adapter boundary with non-serializable provenance.
- Exact binding of both evidence classes to release DNA, runtime artifact, environment, and source-controlled workload/statement references.
- Deterministic derivation of a provenance-protected identity/transparency constellation.
- SCAE integration for high-impact runtime paths.
- Contact/Handoff action-profile version upgrade where M15 evidence becomes mandatory.
- `TRANSPARENCY` proof dimension enforcement through source-controlled geometry.
- Preservation of M13 Pulse V2 and M14 revocation semantics.
- Focused TDD tests and same-head repository verification.

### Out of scope

- Real SPIFFE/SPIRE deployment or SPIFFE conformance claims.
- Real SCITT, Rekor, Sigstore transparency submission, receipt retrieval, or conformance claims.
- Certificate authority provisioning, mTLS rollout, OIDC workload federation, or private-key management.
- External transparency network calls or workload-identity control-plane calls.
- Production/Staging workload registration.
- Production/Staging artifact publication or deployment.
- Remote database tables/migrations.
- DNS/payment-provider mutation.
- Merge to `main`.
- Production Contact/Handoff activation.
- M16 Digital Immune System or M17 Crypto Agility/Sovereign Cell implementation.

## 4. Workload identity contract

M15 introduces `TIGER_WORKLOAD_IDENTITY_V1` as a closed canonical normalized result.

Required fields:

- `schema`: exactly `TIGER_WORKLOAD_IDENTITY_V1`
- `identity_class`: exactly `AUTHENTICATED_WORKLOAD_IDENTITY`
- `environment`: `staging | production`
- `release_dna_sha256`: SHA-256 digest binding TSTO release trust identity
- `runtime_artifact_sha256`: SHA-256 digest binding the running artifact
- `workload_ref_sha256`: SHA-256 digest reference for the authenticated workload identity
- `issuer_ref_sha256`: SHA-256 digest reference for the authenticated issuer/trust domain
- `evidence_sha256`: SHA-256 digest reference to the authenticated upstream evidence
- `issued_at_ms`: trusted issuance time
- `fresh_until_ms`: strict freshness bound
- `state`: exactly `PASS`

All fields are exact closed keys. Unknown fields fail validation. Security-sensitive SHA-256 values reject all-zero values.

The source contract uses a module-owned maximum workload-identity lifetime of **5 minutes**. Future-issued, expired, or overlong identities fail closed.

Shape validation never grants trusted provenance.

## 5. Trusted workload-identity boundary

M15 introduces:

`createTrustedWorkloadIdentityAdapter({ authenticate, clock })`

The adapter:

1. receives an external/untrusted workload-identity candidate;
2. calls `authenticate(candidate)` at the provider boundary;
3. requires authentication success before normalization;
4. validates the closed result contract;
5. evaluates freshness with adapter-owned trusted time;
6. records provenance in process-local non-serializable state;
7. returns an immutable trusted workload-identity result.

Copied, spread, serialized, parsed, reconstructed, or merely shape-valid objects do not inherit provenance.

Provider-specific certificate validation, SPIFFE ID parsing, cloud identity calls, mTLS, OIDC federation, or hardware trust are outside this source-only adapter contract.

## 6. Transparency result contract

M15 introduces `TIGER_TRANSPARENCY_RESULT_V1` as a closed canonical normalized result.

Required fields:

- `schema`: exactly `TIGER_TRANSPARENCY_RESULT_V1`
- `result_class`: exactly `VERIFIED_TRANSPARENCY_STATEMENT`
- `release_dna_sha256`: SHA-256 digest binding the release trust identity
- `runtime_artifact_sha256`: SHA-256 digest binding the runtime artifact
- `statement_sha256`: SHA-256 digest for the exact signed/registered statement content
- `registry_ref_sha256`: SHA-256 digest reference for the transparency registry/log domain
- `verifier_ref_sha256`: SHA-256 digest reference for the trusted verifier
- `receipt_sha256`: SHA-256 digest reference for the verified receipt/proof material
- `verified_at_ms`: trusted verification time
- `fresh_until_ms`: bounded acceptance horizon for use in live authorization
- `state`: exactly `PASS`

All fields are exact closed keys and all security digests reject all-zero values.

M15 treats transparency truth as an independently authenticated evidence class. A source string, build annotation, workflow URL, repository path, log index, or receipt-looking payload is not trusted merely because it exists.

The source contract uses a module-owned maximum live-use transparency acceptance horizon of **5 minutes** for authorization. Historical transparency may remain true beyond that period, but live SCAE use requires fresh verification of that historical evidence through the trusted adapter boundary.

## 7. Trusted transparency boundary

M15 introduces:

`createTrustedTransparencyAdapter({ authenticate, clock })`

The adapter authenticates/normalizes external transparency evidence, enforces freshness using trusted time, records process-local non-serializable provenance, and returns an immutable trusted transparency result.

This source boundary is vendor-neutral. It does not claim SCITT, Rekor, Sigstore, or another transparency system is deployed or conformant.

Copied or reconstructed transparency results lose provenance.

## 8. Identity and Transparency Constellation

M15 introduces `TIGER_IDENTITY_TRANSPARENCY_CONSTELLATION_V1`.

It may be derived only from:

1. an original trusted M13 deployment-attestation bridge result;
2. an original trusted M15 workload-identity result;
3. an original trusted M15 transparency result;
4. trusted factory-bound release/environment/artifact expectations;
5. trusted factory-owned current time.

The constellation is invalid unless all participating evidence agrees on the same:

- release DNA;
- runtime artifact;
- target environment where applicable;
- expected workload binding;
- expected transparency statement/registry policy binding.

Required output fields:

- `schema`: `TIGER_IDENTITY_TRANSPARENCY_CONSTELLATION_V1`
- `release_dna_sha256`
- `runtime_artifact_sha256`
- `environment`
- `workload_identity_sha256`
- `workload_ref_sha256`
- `transparency_result_sha256`
- `statement_sha256`
- `registry_ref_sha256`
- `bridge_result_sha256`
- `verified_at_ms`
- `fresh_until_ms`
- `state`: `PASS`

The constellation output contains bounded digest references only. It does not contain raw workload identity strings, certificate chains, private keys, raw registry receipts, PII, hostnames, IP addresses, raw private intent, secrets, or transaction data.

Constellation provenance is non-serializable. SCAE accepts only the original object emitted by the trusted M15 constellation factory.

## 9. SCAE and action-profile integration

M15 upgrades the governed Market Genesis Contact/Handoff profile to **profile version 2**.

The upgraded source-controlled proof geometry adds:

- `TRANSPARENCY`

The existing `IDENTITY` requirement remains mandatory and is strengthened by requiring M15 trusted constellation evidence for the high-impact V2 runtime path.

SCAE trusted context will consume one bounded M15 constellation object for the governed action when the selected profile/version requires it.

Fail-closed reason boundaries include:

- missing constellation → `TRUST_CONSTELLATION_MISSING`
- shape-valid but non-provenance constellation → `TRUST_CONSTELLATION_UNTRUSTED`
- stale constellation → `TRUST_CONSTELLATION_STALE`
- release/artifact/environment mismatch → `TRUST_CONSTELLATION_RUNTIME_MISMATCH`
- workload mismatch → `TRUST_WORKLOAD_IDENTITY_MISMATCH`
- transparency statement/registry mismatch → `TRUST_TRANSPARENCY_MISMATCH`

A valid constellation satisfies only the M15 identity/transparency requirements. It never creates `ALLOW` by itself.

## 10. Precedence and preservation laws

M15 is strictly subordinate to existing stronger fail-closed conditions:

1. M14 trusted `REVOKED` blocks the governed capability even with perfect M15 evidence.
2. Whole-vehicle prohibition blocks regardless of M15 evidence.
3. Transaction-authority prohibition blocks regardless of M15 evidence.
4. Missing/invalid M13 runtime evidence blocks the high-impact runtime path even if M15 evidence is otherwise valid.
5. Missing proof dimensions, stale Pulse, epoch mismatch, replay failure, source/deployment evidence failure, or policy failure remain blocking.
6. `TIGER_TRUST_PULSE_V1` remains synthetic-test-only with M12 semantics; M15 does not convert it into Production/Staging evidence.
7. M15 does not create fallback acceptance for legacy shape-only identity/transparency payloads.

## 11. Proposed source units

Create:

- `scripts/trust/workload-identity.cjs`
  - workload identity contract validation
  - trusted adapter
  - freshness/provenance checks
  - digest helper

- `scripts/trust/transparency-evidence.cjs`
  - transparency result contract validation
  - trusted adapter
  - freshness/provenance checks
  - digest helper

- `scripts/trust/identity-transparency-constellation.cjs`
  - trusted M13 bridge + trusted M15 evidence cross-binding
  - constellation derivation
  - constellation provenance checks

Modify:

- `scripts/trust/action-profiles.cjs`
  - Contact/Handoff profile version 2
  - add `TRANSPARENCY` to mandatory geometry

- `scripts/trust/scae.cjs`
  - require trusted M15 constellation where profile version 2 requires it
  - preserve all M12/M13/M14 semantics and reason precedence

- `scripts/trust/pcal.cjs` only if exact profile-version/constellation binding is required to preserve consume-time authority invariants; no unrelated PCAL redesign.

Create focused tests:

- `tests/tsto-m15-workload-identity.test.cjs`
- `tests/tsto-m15-transparency-evidence.test.cjs`
- `tests/tsto-m15-constellation.test.cjs`
- `tests/tsto-m15-scae-constellation.test.cjs`
- `tests/tsto-m15-acceptance-boundaries.test.cjs`

## 12. Required acceptance tests

M15 source implementation is not complete unless tests prove at least:

1. exact closed workload-identity keys;
2. workload shape validation alone does not grant provenance;
3. failed workload authentication fails closed;
4. workload trusted clock controls freshness;
5. future, expired, and overlong workload identities fail;
6. workload security digests reject all-zero values;
7. copied/spread/serialized workload identity loses provenance;
8. exact closed transparency-result keys;
9. transparency shape validation alone does not grant provenance;
10. failed transparency authentication fails closed;
11. transparency trusted clock controls freshness;
12. future, expired, and overlong transparency live-use results fail;
13. transparency security digests reject all-zero values;
14. copied/spread/serialized transparency result loses provenance;
15. constellation cannot be derived from copied/untrusted M13 Bridge, workload identity, or transparency result;
16. release DNA mismatch fails closed;
17. runtime artifact mismatch fails closed;
18. environment mismatch fails closed;
19. workload binding mismatch fails closed;
20. statement/registry mismatch fails closed;
21. copied constellation loses provenance;
22. Contact/Handoff profile is version 2 and requires `TRANSPARENCY`;
23. caller cannot remove `TRANSPARENCY` from proof geometry;
24. SCAE blocks missing constellation;
25. SCAE blocks copied/untrusted constellation;
26. SCAE blocks stale constellation;
27. SCAE blocks runtime/workload/transparency mismatch;
28. valid trusted constellation satisfies only the M15 dimensions and cannot bypass any other SCAE requirement;
29. M14 trusted `REVOKED` overrides otherwise perfect M13+M15 evidence;
30. whole-vehicle prohibition overrides otherwise perfect M13+M14+M15 evidence;
31. transaction-authority prohibition overrides otherwise perfect M13+M14+M15 evidence;
32. M13 trusted Pulse V2 remains required where current geometry requires runtime evidence;
33. M12 V1 and M13 V2 Pulse contract semantics remain closed and unchanged;
34. PCAL creation/verification remains exact-profile/exact-scope and does not become valid from a constellation alone;
35. M15 outputs do not expose raw workload IDs, raw registry receipts, raw subject/resource, nonce, password, credential, private key, database URL, precise location, or private intent;
36. no network, cloud, remote DB, Production/Staging, DNS, secret, payment-provider, certificate provisioning, or `main` mutation is required by M15 source tests.

## 13. Completion truth and non-claims

After implementation and exact-head GREEN verification, M15 may state only:

`TRANSPARENCY_WORKLOAD_IDENTITY_CONSTELLATION_SOURCE_VERIFIED`

This statement is source-level only.

It must never be interpreted as:

- `PRODUCTION_WORKLOAD_IDENTITY_ACTIVE`
- `SPIFFE_ATTESTED`
- `SPIFFE_CONFORMANT`
- `SCITT_VERIFIED`
- `SCITT_CONFORMANT`
- `REKOR_VERIFIED`
- `SIGSTORE_VERIFIED`
- `PRODUCTION_TRANSPARENCY_ACTIVE`
- `CONTACT_HANDOFF_ENABLED`
- `PRODUCTION_READY`
- real certificate-chain validation
- real external registry receipt verification
- real mTLS/OIDC workload federation
- remote deployment
- merge to `main`

The PR remains Draft/Open/Unmerged unless separately authorized after the relevant gates are satisfied.
