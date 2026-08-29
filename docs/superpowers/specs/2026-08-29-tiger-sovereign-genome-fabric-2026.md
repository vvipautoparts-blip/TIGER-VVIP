# TIGER Sovereign Genome Fabric 2026 — Design Specification

**Status:** Owner-approved architecture design  
**Date:** 2026-08-29  
**Owner authority:** `docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md`  
**Issue authority before protected merge:** #347

## 1. Purpose

TIGER must operate as a global platform without embedding one country, one currency, one payment provider, or one legal jurisdiction as a hidden system default.

The platform must support zero, one, or many active markets while keeping a single global owner root and preserving fail-closed legal, security, payment, privacy, data-residency, and release controls.

SGF solves this by making **capability authority** the executable unit and by binding market policy/evidence to cryptographic identities rather than relying on scattered country conditionals.

## 2. Current repository problem

Current `main` is internally inconsistent with the new global owner rule:

- `config/fusion/current-authority.json` says `productIdentity = GLOBAL_FIRST` but contains `pulseRing.tiersJod = [2,10,25,45]`;
- `scripts/fusion/verify-current-authority.cjs` requires those exact JOD tiers;
- `tests/fusion-current-authority.test.cjs` asserts the JOD tiers and JOD-specific error text;
- `TIGER_OWNER_BINDING_CURRENT.md`, `TIGER_OWNER_CURRENT_REFERENCE_AR.md`, and `TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md` declare JOD as the current global Pulse reference;
- `authority-registry.v1.json` protects `2-10-25-45-jod` as an advertising boundary;
- marketplace/runtime code contains country and active-market concepts that must be audited so localization, user location, and infrastructure geography cannot become sovereign activation fallbacks.

SGF removes the contradiction while preserving unrelated product semantics such as free ordinary publication, Pulse as optional paid visibility, one-sale-one-winner attribution, immutable platform accounting, and the marketplace transaction boundary.

## 3. Design principles

### 3.1 Zero Default

There is no authoritative default country, currency, legal entity, tax profile, payment provider, or market.

### 3.2 Evidence Before Authority

No capability activation is inferred from configuration presence. Required evidence must be explicit, current, validated, and bound to the intended release.

### 3.3 Capability Before Country

A market may support some capabilities while others remain dark, blocked, suspended, or absent.

### 3.4 Exact Release Binding

Sovereign authority never binds to `latest`; it binds to an exact immutable release identity.

### 3.5 Least Standing Privilege

OWNER_ROOT is a logical authority root. Sensitive actions use strong authentication and short-lived scoped execution leases.

### 3.6 Fail Closed

Missing, stale, malformed, unsigned, revoked, or conflicting sovereign state returns deterministic denial. No cross-country fallback exists.

### 3.7 Vendor-Neutral Core

OPA, SPIFFE, Sigstore, OpenTelemetry, cloud KMS/HSM, and provider-specific services are implementation options behind stable SGF interfaces, not permanent business-domain dependencies.

### 3.8 Incremental Delivery

The architecture is one system but implementation is split into reviewable slices. No single PR attempts authority convergence, runtime compiler, JIT authentication, cell migration, telemetry, and PQC migration simultaneously.

## 4. Core domain model

### 4.1 OwnerRootAuthority

Logical model:

```text
OwnerRootAuthority {
  ownerRootId: "OWNER_ROOT"
  country: null
  currency: null
  market: null
  standingRuntimePrivilege: false
}
```

This object is constitutional metadata, not a bearer credential.

### 4.2 MarketDefinition

```text
MarketDefinition {
  marketId: string
  state: ABSENT | DEFINED
  legalJurisdiction: string | null
  taxJurisdiction: string | null
  dataResidencyZone: string | null
  legalEntityRef: string | null
}
```

A defined market is not an active market.

### 4.3 CapabilityDefinition

Initial registry:

```text
SOCIAL
DISCOVERY
MESSAGING
ADS_DELIVERY
ADS_BILLING
PULSE
AI_RECOMMENDATION
DATA_EXPORT
```

Lifecycle:

```text
ABSENT
DEFINED
EVIDENCED
OWNER_SEALED
DARK
CANARY
ACTIVE
SUSPENDED
REVOKED
```

Transition rules are explicit and reject unsupported jumps.

### 4.4 Money

```text
Money {
  amountMinor: integer
  currency: ISO-4217 code
}
```

No constructor or resolver may synthesize a currency from global defaults.

The current marketplace helper may keep standards-based currency fraction metadata, because supporting the fractional digits of JOD/KWD/etc. is not the same as selecting one as a default.

### 4.5 MarketPricingContract

```text
MarketPricingContract {
  marketId
  capability
  productId
  price: Money
  quotePolicyVersion
  effectiveFrom
  effectiveUntil | null
}
```

Pulse product semantics are global; amount/currency are market-specific.

### 4.6 PaymentProfile

```text
PaymentProfile {
  marketId
  legalEntityRef
  providerAdapterId
  supportedCurrencies[]
  supportedCapabilities[]
  contractEvidenceDigest
  securityEvidenceDigest
  state
}
```

There is no default provider adapter.

## 5. Sovereign Market Genome

A canonical genome document binds all sovereign inputs that are relevant to a market/capability/release.

Conceptual schema:

```text
MarketGenomeV1 {
  schemaVersion
  marketId
  capability
  capabilityState
  legalPolicyDigest
  taxPolicyDigest
  privacyPolicyDigest
  residencyPolicyDigest
  contentAdsPolicyDigest
  paymentPolicyDigest
  aiPolicyDigest
  securityPolicyDigest
  runtimeCellPolicyDigest
  exactReleaseDigest
  ownerAuthorityDigest
  evidenceSetDigest
  issuedAt
  validUntil
  revocationEpoch
  genomeDigest
  signatureMetadata
}
```

Canonical serialization must be deterministic before hashing/signing.

Relevant input change invalidates the prior genome or creates a new genome identity.

## 6. Sovereign Compiler

The compiler consumes normalized evidence and policy references and emits a deterministic decision object.

Interface target:

```text
compileSovereignCapability(input) -> {
  decision: READY_FOR_OWNER_SEAL | DENY,
  reasonCodes: string[],
  evidenceSetDigest: string,
  proposedGenome: object | null
}
```

The compiler must not:

- call an AI model to decide PASS;
- auto-activate a market;
- mutate Production;
- choose a fallback country/provider/currency;
- suppress missing evidence.

AI tooling may prepare evidence summaries, detect drift, and suggest remediation outside the deterministic gate.

## 7. Market Activation Passport

Target schema:

```text
MarketActivationPassportV1 {
  passportId
  marketId
  capability
  genomeDigest
  exactReleaseDigest
  evidenceSetDigest
  ownerAuthorizationDigest
  issuedAt
  expiresAt | null
  revocationEpoch
  signatureMetadata
}
```

Validation requires exact equality for market, capability, genome, and release.

## 8. Owner Execution Lease

Target properties:

```text
OwnerExecutionLeaseV1 {
  ownerSubject
  action
  marketId
  capability
  exactReleaseDigest
  policyDigest
  payloadDigest
  nonce
  issuedAt
  expiresAt
  authenticatorAssurance
  proofMetadata
}
```

Security requirements:

- phishing-resistant owner authentication for high-impact actions;
- short TTL;
- one purpose/action;
- replay detection;
- payload binding;
- no scope wildcard for market/capability activation;
- explicit revocation/expiry handling.

NIST SP 800-63-4/63B-4 principles are the assurance reference. WebAuthn/passkeys are the preferred phishing-resistant user-facing mechanism. RFC 9700 is the OAuth security baseline; RFC 9449 DPoP is considered where token proof-of-possession fits the deployed identity flow.

WebAuthn Level 3 is a compatibility/readiness target, not a production requirement while its Recommendation process is incomplete.

## 9. Policy distribution

SGF policy bundles are versioned and integrity protected.

Required abstract interface:

```text
PolicyBundle {
  revision
  scope
  manifestDigest
  files[]
  signatureMetadata
}
```

Activation requires signature and content verification.

OPA signed-bundle behavior is an implementation reference because it provides signed policy bundles and activation rejection on failed verification. SGF keeps a vendor-neutral policy interface so another verified engine can replace OPA without changing the business contract.

## 10. Runtime cells

The architecture is:

```text
Global Control Plane
  -> Regional or legally required Sovereign Cell
      -> Market capability runtime
```

Cell responsibilities:

- isolate failure domains;
- constrain data residency and processing policy;
- carry local runtime configuration;
- enforce passport/genome policy;
- emit privacy-filtered telemetry.

A country does not automatically receive a dedicated cell.

## 11. Workload identity

Service-to-service trust should converge toward short-lived workload identity rather than long-lived shared secrets.

Target abstraction:

```text
WorkloadIdentity {
  trustDomain
  workloadId
  credentialType
  issuedAt
  expiresAt
}
```

SPIFFE-compatible trust-domain/SVID concepts are preferred where appropriate; cloud-native workload identity may implement the same boundary.

## 12. Release provenance

A Market Activation Passport binds to exact release evidence.

Supply-chain target:

- version-controlled source;
- protected review/control path;
- source provenance;
- build provenance;
- immutable artifact identity;
- SBOM where applicable;
- signed/verified attestation;
- no `latest` release authority.

SLSA v1.2 is the current reference floor. Sigstore-compatible keyless identity-bound signing may be used where suitable.

## 13. Observability

OpenTelemetry-compatible semantic signals are the target abstraction for traces, metrics, and logs.

SGF adds a policy layer defining:

```text
TelemetryExportPolicy {
  marketId
  cellId
  allowedSignalClasses
  prohibitedFields
  pseudonymizationRules
  aggregationRules
  retentionClass
}
```

Sensitive raw identity data must not be exported merely because an SDK supports it.

## 14. Neural Sovereign Kill Grid

Emergency authority is granular.

Revocation target dimensions:

```text
market
capability
paymentProfile
providerAdapter
passport/genome
exactRelease
cell/ingress path
```

Revocation is auditable and fail-closed.

The kill grid does not create a generic unaudited bypass switch.

## 15. Crypto agility and PQC readiness

SGF requires inventory and algorithm/key-version agility.

Inventory domains:

```text
TLS/public-key
JWT/OIDC
KMS/HSM
artifact signing
provenance signing
database/storage encryption
workload identity
backup/recovery encryption
```

NIST finalized ML-KEM and ML-DSA are migration targets, not custom application code requirements. Migration is provider/interoperability/risk driven.

## 16. SGF implementation slices

### Slice SGF-0 — Owner Authority Foundation

Deliverables:

- canonical owner authority document;
- current owner router/binding integration;
- machine authority registry entry;
- no-default constitution in machine config;
- anti-regression tests.

No runtime activation.

### Slice SGF-1 — Market-Neutral Money and Pulse

Deliverables:

- remove `tiersJod` global authority;
- preserve product-level Pulse identifiers/visibility semantics;
- introduce market pricing contract schema;
- require explicit Money currency;
- tests rejecting implicit currency.

### Slice SGF-2 — Market and Capability Registry

Deliverables:

- market definition schema;
- capability registry;
- lifecycle transition validator;
- deterministic reason codes;
- zero active markets valid by design.

### Slice SGF-3 — Genome + Compiler

Deliverables:

- canonical serialization/digest contract;
- evidence set binding;
- deterministic compiler;
- stale evidence invalidation;
- no AI PASS path.

### Slice SGF-4 — Passport + Runtime Enforcement

Deliverables:

- activation passport schema;
- verifier;
- release/genome/capability binding;
- revocation state;
- runtime deny-by-default integration.

### Slice SGF-5 — Owner JIT Authority

Deliverables:

- high-assurance owner action policy;
- short-lived execution lease;
- nonce/replay defense;
- payload digest binding;
- passkey/WebAuthn step-up integration when existing identity architecture is ready.

### Slice SGF-6 — Cells, Workload Identity, Telemetry

Deliverables:

- cell metadata and policy boundaries;
- workload identity plan/integration;
- sovereign telemetry policy;
- no implicit market derivation from region.

### Slice SGF-7 — Kill Grid + Crypto Agility

Deliverables:

- granular revocation registry;
- tested emergency disable paths;
- cryptographic inventory;
- algorithm/key-version policy;
- PQC migration readiness evidence.

## 17. Foundation file map

The first implementation plan is intentionally limited to files that establish authority and machine truth.

Expected existing files to modify:

- `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
- `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`
- `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`
- `config/fusion/current-authority.json`
- `scripts/fusion/verify-current-authority.cjs`
- `tests/fusion-current-authority.test.cjs`
- `project-control/authority/authority-registry.v1.json`

New files in Foundation:

- `docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md`
- `config/sovereignty/sgf-v1.json`
- `scripts/sovereignty/verify-sgf-authority.cjs`
- `tests/sgf-sovereignty-authority.test.cjs`

Runtime country consumers such as `scripts/vvip-production-marketplace.js`, `scripts/runtime/vvip-marketplace-repository.js`, `scripts/fusion/progressive-composer.js`, and database policies are audit targets for later slices unless a Foundation test proves they currently encode a prohibited sovereign fallback that must be removed immediately.

## 18. Foundation machine schema

Initial `config/sovereignty/sgf-v1.json` contract:

```json
{
  "schemaVersion": "TIGER_SGF_V1",
  "ownerRoot": {
    "id": "OWNER_ROOT",
    "country": null,
    "currency": null,
    "market": null,
    "standingRuntimePrivilege": false
  },
  "defaults": {
    "country": null,
    "currency": null,
    "paymentProvider": null,
    "legalEntity": null,
    "taxProfile": null,
    "market": null
  },
  "capabilityRegistry": [
    "SOCIAL",
    "DISCOVERY",
    "MESSAGING",
    "ADS_DELIVERY",
    "ADS_BILLING",
    "PULSE",
    "AI_RECOMMENDATION",
    "DATA_EXPORT"
  ],
  "markets": [],
  "activationAuthority": "MARKET_CAPABILITY_PASSPORT",
  "fallbackPolicy": "DENY_NO_SOVEREIGN_FALLBACK"
}
```

The empty `markets` array is valid and expected before legal market activation.

## 19. Error contract

SGF uses deterministic denial codes rather than silent fallback.

Foundation reserves at least:

```text
SGF_DEFAULT_COUNTRY_FORBIDDEN
SGF_DEFAULT_CURRENCY_FORBIDDEN
SGF_DEFAULT_PROVIDER_FORBIDDEN
SGF_OWNER_ROOT_MUST_BE_GLOBAL
SGF_MARKET_NOT_DEFINED
SGF_CAPABILITY_NOT_AUTHORIZED
SGF_POLICY_INVALID
SGF_POLICY_EXPIRED
SGF_RELEASE_BINDING_REQUIRED
SGF_NO_SOVEREIGN_FALLBACK
```

Later slices extend the registry without weakening earlier meanings.

## 20. Test strategy

### Foundation tests

- canonical SGF authority exists and is referenced by owner router/binding;
- owner root is global and standing runtime privilege is false;
- all sovereign defaults are null;
- validator rejects non-null default country/currency/provider/legal entity/tax profile/market;
- empty markets is valid;
- capability registry is exact and duplicate-free;
- `tiersJod` is absent from current machine authority;
- current Pulse authority no longer declares a universal JOD price;
- authority registry no longer protects `2-10-25-45-jod` as a global boundary;
- no repository merge/authority config claims Production market activation.

### Later tests

Each slice adds RED tests first for its new contracts and negative authorization cases.

## 21. Security constraints

- never write directly to protected `main`;
- no Production/Staging/provider/database mutation in SGF Foundation;
- no secrets or private keys in repository config;
- no custom cryptographic primitive;
- owner authentication changes require a dedicated security review slice;
- market activation remains impossible from Foundation config alone;
- all future runtime authority binds exact release evidence;
- unavailable CI is reported as blocked, never as GREEN.

## 22. Rollback

Foundation rollback is repository-only: revert the SGF Foundation commits before any Production activation exists.

Later slices must define state-aware rollback and revocation behavior before Production use.

## 23. Success criteria

SGF Foundation is ready for protected merge only when:

- all Foundation RED contracts are GREEN;
- the existing authority suite remains GREEN after intentional JOD-global assertions are replaced;
- current owner docs and machine authority agree;
- repository contains no active global sovereign default for country/currency/provider;
- Pulse remains optional paid visibility but no global JOD authority remains;
- exact-head quality/security/release checks execute and pass;
- independent review is complete;
- no Production activation or provider mutation occurred.
