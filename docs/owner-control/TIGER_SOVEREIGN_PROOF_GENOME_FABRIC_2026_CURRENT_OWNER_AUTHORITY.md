# TIGER SOVEREIGN PROOF-GENOME FABRIC 2026 — CURRENT SUPREME OWNER AUTHORITY

**Status:** `CURRENT_SUPREME_OWNER_AUTHORITY / LATEST_ONLY / GLOBAL_FIRST / ZERO_DEFAULT / PROOF_FIRST / FAIL_CLOSED / NO_FALLBACK / NO_IN_TREE_ARCHIVE`
**Owner decision:** 2026-08-29
**Short name:** `TIGER-SPGF`
**Domain:** sovereign owner authority, markets/capabilities, evidence, cryptography, release trust, workload identity, runtime authorization, revocation, and future technology adoption.

## 1. Supreme authority rule

`TIGER SOVEREIGN PROOF-GENOME FABRIC 2026 (SPGF)` is the sole supreme architecture in this domain.

The newest owner decision fully supersedes every older competing sovereign/security/release architecture decision. Conflicting prior current-authority/spec/plan material is deleted from the current tree. It is not archived, renamed as legacy, duplicated, or preserved as fallback. Historical provenance exists only in Git history and must never feed current runtime, tests, configuration, owner indexes, release gates, or product copy.

Former SGF, Proof Mesh, Crypto Twin, Market Genome, Passport, Compiler, Execution Seal, Kill Grid, Witness, and related concepts survive only where explicitly used as subordinate implementation modules of SPGF. They are not parallel owner authorities.

## 2. Global owner root

VVIP TIGER has one global logical Root of Authority:

`OWNER_ROOT`

Constitutional machine truth:

```text
OWNER_ROOT.country  = null
OWNER_ROOT.currency = null
OWNER_ROOT.market   = null
OWNER_ROOT.standingRuntimePrivilege = false
```

`OWNER_ROOT` is not a country account and is not a permanently privileged daily Super Admin session.

Sensitive owner actions require strong phishing-resistant authentication and short-lived, scope-bound authority. Owner login identity and sovereign signing authority are separate trust surfaces.

Root recovery may use multiple owner-controlled hardware authenticators without creating multiple owners.

## 3. Zero-default constitution

Forbidden sovereign defaults:

- `DEFAULT_COUNTRY`
- `DEFAULT_CURRENCY`
- `DEFAULT_PAYMENT_PROVIDER`
- `DEFAULT_LEGAL_ENTITY`
- `DEFAULT_TAX_PROFILE`
- `DEFAULT_DATA_REGION`
- `DEFAULT_MARKET`

Locale, IP, hosting geography, CDN/database region, device region, phone prefix, or provider location cannot create sovereign authority or activate a market.

A required sovereign fact is either:

`EXPLICIT + VERIFIED + POLICY_ALLOWED + EVIDENCE_BOUND`

or:

`NONE / DENY`

There is no fallback to Jordan, United States, Sudan, JOD, USD, another market, another provider, another identity, another release, or stale evidence.

## 4. Market + Capability is the activation unit

A country is never a single `country.active=true` switch.

Capabilities are independently governed. Initial registry:

- `SOCIAL`
- `DISCOVERY`
- `MESSAGING`
- `ADS_DELIVERY`
- `ADS_BILLING`
- `PULSE`
- `AI_RECOMMENDATION`
- `DATA_EXPORT`

Lifecycle:

`ABSENT -> DEFINED -> EVIDENCED -> OWNER_SEALED -> DARK -> CANARY -> ACTIVE`

Exceptional states:

`SUSPENDED`, `REVOKED`

Unsupported lifecycle jumps are denied.

## 5. One trust object — Sovereign Proof Capsule

Sensitive execution is authorized through a verifiable `SOVEREIGN_PROOF_CAPSULE`, not scattered boolean flags.

The capsule binds applicable facts including:

- subject/user identity;
- workload identity;
- exact action/capability;
- explicit market/jurisdiction context;
- signed policy digest;
- market genome digest;
- exact source SHA and exact release/artifact digest;
- source/build provenance and test/security evidence;
- crypto evidence / CBOM digest;
- required legal, tax, privacy, payment, residency, security, and operational evidence;
- owner execution lease and market capability passport where required;
- witness evidence;
- issue/expiry times;
- revocation state;
- signatures/attestations and verifier identities.

One fail-closed verifier decides execution. Any required missing, stale, invalid, unverified, conflicting, expired, or revoked proof is DENY.

## 6. Market Genome and signed policy

Every market/capability/release is represented by a content-addressed Market Genome that binds relevant legal, tax, privacy, advertising/content, AI, payment, data-residency, retention, runtime, security, operations, owner-authority, and exact-release inputs.

Changing a relevant sovereign input changes the genome identity.

Market policy is versioned, integrity-protected, content-addressed, and signed. Unsigned or invalid policy is not activated.

## 7. Sovereign Compiler

The compiler is deterministic. It does not make law and does not ask AI to decide PASS.

It verifies whether the signed policy's declared requirements have valid, current evidence and returns deterministic readiness or DENY reason codes.

AI may discover drift, summarize evidence, simulate policy effects, and recommend remediation. AI cannot sovereignly activate a market/capability, change tax/payment authority, rotate root trust, or promote Production without the required human/cryptographic authority.

## 8. Capability Passport and short-lived execution

Activation authority is a capability-specific passport bound to exact:

`market + capability + genome + signed policy + exact release + evidence set + owner authorization + validity/revocation state`

Sensitive runtime execution uses a short-lived purpose-bound Execution Seal or equivalent proof derived from valid current authority. Replay, scope widening, cross-market use, cross-capability use, cross-release use, and stale proof are denied.

## 9. Owner JIT authority

High-impact owner actions use short-lived `OWNER_EXECUTION_LEASE` authority. It binds action, target, exact release/policy, payload digest, nonce, issue/expiry time, and authenticator assurance.

No standing root privilege is accepted.

Mature phishing-resistant standards and sender-constrained authorization profiles may be used where appropriate. Vendor names are not constitutional dependencies.

## 10. Crypto Digital Twin and crypto agility

The cryptographic truth is evidence-generated, not a manually maintained assertion.

Evidence sources may include:

- source inspection;
- runtime probes;
- TLS observations;
- provider/KMS/HSM metadata;
- workload identity metadata;
- artifact/attestation metadata.

The Crypto Digital Twin covers at least:

- TLS transport;
- OIDC/JWT;
- owner authority signing;
- policy signing;
- artifact provenance signing;
- workload identity;
- database encryption;
- object storage encryption;
- backup encryption;
- KMS/HSM;
- execution seals.

Machine output targets a stable CBOM-compatible representation. Drift between expected and observed crypto is a first-class security event.

No custom cryptography and no custom post-quantum cryptography are permitted. PQC migration uses stable NIST-standardized profiles through crypto-agile adapters and evidence-driven rollout.

## 11. Workload identity and sovereign cells

Network reachability is not trust.

Service-to-service trust progressively uses short-lived workload identity and explicit trust domains instead of long-lived shared secrets.

Runtime architecture is:

`GLOBAL CONTROL PLANE -> REGIONAL/REQUIRED SOVEREIGN CELLS -> MARKET CAPABILITIES`

A dedicated country cell exists only when law, residency, security, scale, isolation, or operations justify it. Infrastructure location never changes OWNER_ROOT identity or activates a market.

## 12. Release Birth Certificate and proof-first CI

Every releasable artifact targets a `TIGER RELEASE BIRTH CERTIFICATE` containing exact source SHA, source/build provenance, builder identity, artifact digest, SBOM, CBOM, test/security evidence, policy digest, crypto twin digest, and relevant market compatibility evidence.

Release authority never uses `latest`.

CI is evidence, not sovereign truth by itself. Execution is classified by what actually ran:

- `EXECUTED_GREEN`
- `EXECUTED_CODE_RED`
- `EXECUTED_SECURITY_RED`
- `EXECUTED_POLICY_RED`
- `BLOCKED_RUNNER`
- `BLOCKED_PROVIDER`
- `BLOCKED_ACCOUNT`
- `STALE`
- `REVOKED`
- `UNVERIFIED`

A provider failure before runner assignment is not a code failure and is never GREEN.

## 13. Witness fabric

GitHub Actions is an evidence producer, not the sole eternal trust model.

Future governance may permit an independent evidence witness/quorum only by explicit owner-approved governance change. Persistent self-hosted runners are prohibited for untrusted public PR execution. Any future independent runner must be JIT/ephemeral, one-job, clean-image, no long-lived secrets, no Production network, and destroyed after execution.

**Current #346 governance remains mandatory. SPGF cannot use an independent witness to bypass #346 exact-head GitHub/review requirements.**

## 14. Technology Maturity Firewall

Technology profiles are classified:

- `FINAL_STANDARD`
- `STABLE_PRODUCTION`
- `PROVIDER_MANAGED_STABLE`
- `CANDIDATE`
- `PREVIEW`
- `DRAFT`
- `EXPERIMENTAL`

Only final/stable profiles may become sovereign Production dependencies. Candidate/Preview/Draft/Experimental profiles remain compatibility/canary/lab/research according to policy.

The newest technology is not automatically the safest Production technology.

## 15. Runtime money and market boundary

Marketplace/social/runtime code must not infer sovereign market or currency from `defaultCountryCode`, `JOD`, locale, IP, hosting region, or similar fallbacks.

`SELLER_PRICE != TIGER_PLATFORM_BILLING_PRICE`

Seller listings may carry explicit ISO currency allowed by the applicable market policy. TIGER-owned Ads/Pulse/platform-service price and currency come only from an authorized signed Market Pricing Contract.

Public discovery may remain global/unfiltered only where policy explicitly permits it.

## 16. Observability, backup, confidential computing, transparency

OpenTelemetry-compatible vendor-neutral telemetry is preferred, with market/cell policy controlling minimization, pseudonymization, retention, and export.

Backup existence is not recovery proof. DR readiness requires encryption evidence, key-availability evidence, restore-rehearsal evidence, integrity evidence, and current RPO/RTO evidence.

Confidential computing is selective for workloads where hardware attestation materially improves protection; it is not a universal runtime requirement.

SPGF remains transparency/SCITT-ready for high-value receipts without making blockchain or a transparency service a runtime dependency.

## 17. Sovereign Kill Grid and proof revocation

Emergency authority may revoke or suspend:

- market;
- capability;
- release;
- genome;
- signed policy;
- payment profile/provider;
- cell/ingress;
- evidence/proof;
- signing trust.

Revocation is fail-closed and does not silently expire back to ALLOW. Lifting requires explicit authorized action.

## 18. Final executable predicate

Sensitive execution is allowed only when all applicable identity, owner authority, workload identity, exact-release, source/build provenance, signed policy, market genome, capability passport, crypto evidence, legal/payment/privacy/residency/operations evidence, witness, freshness, and revocation checks pass.

Any required `FALSE / UNKNOWN / STALE / UNVERIFIED / REVOKED` condition is DENY.

## 19. Anti-overengineering rule

- no blockchain by default;
- no custom cryptography;
- no forced multi-cloud without measured need;
- no one-backend-per-country rule;
- no mandatory TEE for ordinary workloads;
- no AI sovereign authority;
- no permanent root session;
- no provider/standard Preview as a Production sovereign dependency.

New technology is integrated through Profiles, Policies, Adapters, and Evidence Verifiers rather than redesigning the SPGF constitutional core.

## 20. Supersession and current-tree deletion

SPGF fully supersedes the previous top-level SGF architecture decision.

On current-tree convergence:

- delete `TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md`;
- delete the prior SGF supreme design spec and SGF-specific implementation plans that compete with SPGF;
- do not create Archive/Legacy/Trash copies;
- replace top-level SGF machine authority with SPGF machine authority;
- preserve only reusable technical modules that are explicitly subordinate to SPGF;
- update tests/config/authority registry so old SGF cannot operate as fallback or parallel truth;
- historical provenance remains Git history only.

## 21. Implementation safety

SPGF may be prepared and tested on an isolated branch. It must not be merged into `main`, mutate Production/Staging/provider/database/payment state, activate a country/capability, or bypass protected governance while predecessor PR #346 remains unresolved.

## 22. Owner acceptance statement

> **TIGER SOVEREIGN PROOF-GENOME FABRIC 2026 is the sole supreme architecture for this domain. One global OWNER_ROOT controls a Zero-Default, Proof-First, capability-based global platform. No sovereign state is trusted merely because it appears in configuration; critical facts require current verifiable evidence bound to exact policy, genome, release, identity, and authority. Missing/stale/unverified/revoked critical proof fails closed. Previous competing SGF architecture authority is deleted from the current tree, not archived and not preserved as fallback. Useful former modules survive only as subordinate SPGF implementation components. Future technology changes occur through Profiles, Adapters, Policies, and Evidence Verifiers without replacing the SPGF constitutional core.**
