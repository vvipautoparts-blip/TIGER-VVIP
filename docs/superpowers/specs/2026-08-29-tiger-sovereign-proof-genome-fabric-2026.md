# TIGER SOVEREIGN PROOF-GENOME FABRIC 2026 — SUPREME ARCHITECTURE

**Status:** `OWNER_APPROVED / CURRENT_SUPREME_ARCHITECTURE / LATEST_ONLY / NO_FALLBACK / NO_IN_TREE_ARCHIVE`
**Owner decision date:** 2026-08-29
**Issue:** #347

## 1. Supreme rule

`TIGER SOVEREIGN PROOF-GENOME FABRIC 2026 (SPGF)` is the sole supreme architecture for sovereign authority, market/capability activation, proof, cryptography, release trust, workload identity, runtime authorization, and revocation.

The newest owner decision fully supersedes prior competing architecture decisions. Conflicting prior owner-authority/spec/plan material must be deleted from the current repository tree, not archived, renamed as legacy, duplicated, or preserved as fallback. Historical provenance exists only in Git history and must never feed current runtime, tests, configuration, owner indexes, release gates, or product copy.

Prior SGF, Proof Mesh, Crypto Twin, Market Genome, Passport, Compiler, Execution Seal, Kill Grid, Witness, and related ideas survive only as subordinate implementation modules inside SPGF when they remain technically useful. They are not parallel authorities.

## 2. Immutable constitutional invariants

- One global logical `OWNER_ROOT`.
- `OWNER_ROOT.country = null`, `currency = null`, `market = null`.
- No global/default country, currency, payment provider, legal entity, tax profile, data region, or market.
- No inference of sovereign authority from locale, IP, hosting region, CDN, database region, device region, or provider location.
- Activation is `MARKET + CAPABILITY`, never a coarse `country.active=true` flag.
- Missing, invalid, expired, stale, conflicting, revoked, or unverified critical evidence is `DENY / FAIL_CLOSED`.
- No sovereign fallback to another country, currency, provider, policy, identity, release, or evidence source.
- Sensitive owner actions use phishing-resistant, hardware-backed authentication and short-lived purpose-bound execution leases; no standing root privilege.
- No custom cryptography and no custom PQC.
- Technology novelty never overrides maturity: Preview/Draft/Experimental technology cannot become a sovereign production dependency.

## 3. One trust object: Sovereign Proof Capsule

Every sensitive execution is authorized by one verifiable `SOVEREIGN_PROOF_CAPSULE` containing, at minimum:

- subject identity and workload identity;
- exact action and capability;
- explicit market and jurisdiction context;
- market genome digest and signed policy digest;
- exact source SHA and exact release/artifact digest;
- build/source provenance and test/security evidence;
- crypto evidence/CBOM digest;
- legal, tax, privacy, payment, residency, operational, and security evidence required by the signed market policy;
- owner execution lease and capability passport where required;
- witness evidence;
- issued/expiry timestamps;
- revocation state;
- signatures/attestations and verifier identities.

A single runtime verifier evaluates the capsule. Any required proof failure returns DENY.

## 4. Owner authority

`OWNER_ROOT` is a Root of Authority, not a daily super-admin account. Owner login authentication and sovereign signing authority are separate trust surfaces.

Root recovery targets multiple owner-controlled hardware authenticators without creating multiple owners. Root recovery/rotation may require a threshold of owner-controlled recovery authenticators.

Owner-sensitive APIs target phishing-resistant authentication and sender-constrained access patterns. FAPI 2.0 / DPoP or equivalent stable standards may be used where appropriate without making a specific vendor part of the constitution.

## 5. Market Genome and capability lifecycle

Each market has a content-addressed Market Genome covering legal, tax, privacy, advertising, content, AI, currency, payment, data residency, retention, runtime, security, and operations policy evidence.

Capability lifecycle:

`ABSENT -> DEFINED -> EVIDENCED -> OWNER_SEALED -> DARK -> CANARY -> ACTIVE`

Exceptional states: `SUSPENDED`, `REVOKED`.

No direct jump to ACTIVE is valid. A capability passport is bound to exact market, capability, genome digest, policy digest, release digest, evidence set, and validity window.

## 6. Signed Policy and Sovereign Compiler

Market policy is signed and content-addressed. The compiler does not make law; it verifies that the currently signed policy requirements have current evidence and produces deterministic readiness or DENY reason codes.

AI may discover drift, analyze evidence, simulate policy impact, and recommend action. AI cannot sovereignly activate a market/capability, change tax/payment authority, rotate root trust, or promote production without the required human/cryptographic authority.

## 7. Crypto Digital Twin and crypto agility

The current manual crypto inventory evolves into an evidence-generated Crypto Digital Twin.

Evidence sources include source inspection, runtime probes, provider/KMS metadata, TLS observations, artifact/attestation metadata, and workload identity metadata. Output targets a machine-readable CBOM compatible with a stable CycloneDX profile.

Required crypto surfaces include TLS transport, OIDC/JWT, owner authority signing, policy signing, artifact provenance signing, workload identity, database encryption, object storage encryption, backup encryption, KMS/HSM, and execution seals.

Every surface records current profile, target profile, key/provider/location metadata where safe, rotation state, evidence digest, observation time, expiry, and migration/PQC readiness. Drift between expected and observed crypto is a first-class security event.

PQC migration uses only NIST-standardized algorithms/profiles through crypto-agile adapters. PQC readiness does not mean premature universal activation.

## 8. Workload identity and cells

Network location is not identity. Service-to-service trust targets workload identity (SPIFFE/SPIRE or equivalent stable provider-managed standard) and short-lived credentials instead of shared static secrets.

Runtime uses a global control plane with isolated sovereign cells. Dedicated country cells are created only when law, residency, security, scale, or commercial requirements justify them.

## 9. Release Birth Certificate and evidence-first CI

Every releasable artifact targets a Release Birth Certificate containing exact source SHA, source/build provenance, builder identity, artifact digest, SBOM, CBOM, test/security evidence, policy digest, crypto twin digest, and relevant market compatibility evidence.

SLSA 1.2-compatible provenance and verifiable attestations are preferred where mature. Production release artifacts should become immutable after publication where repository/provider capabilities safely support it.

CI status is classified by executed evidence, not by a provider badge alone. Required states distinguish executed green/red from infrastructure/account/provider blocking and stale/unverified evidence.

## 10. Witness fabric

GitHub Actions is an evidence producer, not the sole sovereign truth source. Future governance may accept an independent witness quorum only after explicit owner-approved governance change.

For the current #346 lane, existing exact-head GitHub gate requirements remain mandatory. No independent witness may be used to bypass them.

Persistent self-hosted runners are prohibited for untrusted public PR execution. Any future independent runner must be JIT/ephemeral, one-job, clean-image, no long-lived secrets, no production network, and destroyed after execution.

## 11. Technology Maturity Firewall

Technology profiles are classified as:

- `FINAL_STANDARD`
- `STABLE_PRODUCTION`
- `PROVIDER_MANAGED_STABLE`
- `CANDIDATE`
- `PREVIEW`
- `DRAFT`
- `EXPERIMENTAL`

Only final/stable profiles may become sovereign production dependencies. Candidate/preview/draft/experimental profiles remain compatibility/canary/lab/research according to policy.

## 12. Observability, backup, confidential computing, transparency

OpenTelemetry-compatible telemetry is preferred, but each market policy controls what telemetry may leave a cell, what must be pseudonymized, and what must never be logged.

Backup existence is not recovery proof. DR readiness requires encryption evidence, key availability evidence, restore rehearsal evidence, integrity evidence, and current RPO/RTO evidence.

Confidential computing is selective only for workloads that justify hardware attestation and restricted secret release. It is not a universal TIGER runtime requirement.

SPGF should remain SCITT-ready for high-value transparency receipts without making a transparency service or blockchain a runtime dependency.

## 13. Zero-default runtime contract

Marketplace/public/social runtime must not infer market/currency from `defaultCountryCode`, `JOD`, locale, IP, or hosting geography.

Seller listing price/currency is distinct from TIGER platform billing price/currency. Seller values may use explicit market-allowed ISO currency. TIGER-owned ads/Pulse/platform-service billing price and currency come only from an authorized signed Market Pricing Contract.

Public discovery may operate globally without a market filter only where policy explicitly permits it.

## 14. Revocation and Kill Grid

The sovereign kill/revocation layer can revoke market, capability, release, genome, policy, payment profile, cell, ingress, proof, or signing trust. Revocation does not silently expire back into ALLOW; lifting requires explicit authorized action.

## 15. Final executable predicate

Sensitive execution is allowed only when all required identity, owner authority, workload identity, exact-release, source/build provenance, signed policy, market genome, capability passport, crypto evidence, legal/payment/privacy/residency/operations evidence, witness evidence, freshness, and revocation checks pass.

Any required false/unknown/stale/unverified condition is DENY.

## 16. Current integration constraint

PR #346 remains an independent mandatory predecessor. SPGF work may be prepared and tested on an isolated branch, but must not be merged into `main`, used to mutate Production, or used to bypass #346 exact-head/review governance.

## 17. Supersession semantics

On SPGF promotion into current owner authority:

1. replace the prior SGF owner authority reference with the SPGF owner authority;
2. delete prior competing SGF supreme spec/plan/current-authority documents from the current tree;
3. do not create archive/trash/legacy copies;
4. preserve only reusable technical modules that are explicitly subordinate to SPGF;
5. update machine authority/config/tests so no former supreme architecture remains a fallback or parallel truth;
6. keep historical provenance only in Git history.
