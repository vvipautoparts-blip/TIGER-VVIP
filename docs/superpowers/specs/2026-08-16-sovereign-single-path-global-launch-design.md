# TIGER VVIP — Sovereign Single-Path Global Launch Design

**Date:** 2026-08-16  
**Status:** OWNER-APPROVED DIRECTION / EXECUTION AUTHORITY  
**Owner objective:** Less code, fewer authorities, fewer paths; materially higher security, reliability, operational clarity, financial integrity, and global launch readiness.

## 1. Non-negotiable outcome

TIGER VVIP must converge to one understandable production surface and one trusted authority per sensitive capability. A feature is not complete merely because tests pass; it is complete when no parallel authority, legacy bypass, insecure fallback, duplicated business rule, or unbounded operational dependency can change the same trusted state.

The platform remains advertising, discovery, and direct connection only. It is not a party to buyer/seller/service transactions, delivery, settlement, warranties, or marketplace dispute execution. Platform-owned financial scope is limited to advertising, billing, applicable platform taxes/fees, accounting, entitlement reconciliation, and profitability protection.

Global launch truth remains evidence-first. The phrase "Global Launch Ready" is permitted only after the launch passport is green on one exact production candidate SHA.

## 2. Product experience principles

### Facebook muscle memory — without social-network clutter

Keep the parts users understand instinctively: one account identity, one profile, one coherent feed, familiar composer behavior, notifications, saved/favorite state, clear activity/history, and progressive disclosure. Do not reproduce Facebook's unrelated social complexity, duplicated navigation, or engagement mechanics that do not serve discovery and direct contact.

### OpenSooq-grade marketplace discovery — without marketplace intermediation

Keep search-first navigation, strong category/sector filtering, typo rescue, location/active-market context, clear listing state, high-quality still-image presentation, favorites, and fast direct contact. Do not add transaction checkout, escrow, delivery orchestration, buyer/seller settlement, or platform-run deal disputes.

### TIGER identity

The visible product must feel like one premium TIGER VVIP system rather than a collage of Facebook/OpenSooq screens. Shared design tokens, shared account identity, shared navigation state, shared capability graph, and a single progressive composer are mandatory.

## 3. Approaches considered

### Approach A — Keep the runtime hardening wrapper

Retain `vvip-marketplace-rollback.js` as a wrapper around the repository and continue adding finalization/cleanup/public-read overrides there.

**Advantages:** lowest immediate code movement; preserves recent work with little churn.  
**Rejected because:** it creates a second runtime authority layer, duplicates repository behavior, makes release load order security-sensitive, and turns a historical rollback concept into permanent production architecture. It violates the owner's "less code / fewer paths" rule.

### Approach B — Single-path sovereign orchestrator (**selected**)

Fold all browser-visible marketplace behavior into one canonical repository API, while moving trusted mutation authority into one server-side publication transaction and one trusted media-finalization service. Database transactions own DB rollback; asynchronous cleanup is an internal compensation/outbox concern, never a public wrapper API.

**Advantages:** smallest long-term authority surface; easiest to audit; aligns with existing Supabase RLS/RPC, F05 media security, release attestation, and current FUSION UI; removes bypasses instead of hiding them.  
**Trade-off:** requires deliberate convergence of overlapping F06/FUSION migration contracts and exact tests proving old paths are gone.

### Approach C — Server-mediated BFF for every listing operation

Move draft creation, media upload, publication, feed reads, and account reads behind a new backend-for-frontend service.

**Advantages:** maximum centralized control.  
**Rejected for current phase:** materially increases service count, latency, operational cost, deployment surface, and failure modes without proportional benefit because Supabase RLS plus narrow trusted services already provide the required authority boundary.

## 4. Selected architecture

### 4.1 Browser authority

The browser may:

- authenticate and request capabilities;
- construct and edit an untrusted draft;
- process original HEIC/HEIF locally only;
- upload only JPEG/WebP derivatives to a private raw staging boundary;
- request trusted media finalization;
- request publication with listing id + plan id + opaque entitlement receipt/reference;
- read public listings, its own listings, favorites, and bounded status results.

The browser may **not**:

- mint advertising/visibility entitlement;
- directly set `PENDING_REVIEW`, `ACTIVE`, entitlement state, accounting state, or canonical-media state;
- upload original HEIC/HEIF for server conversion;
- claim publication success from local state;
- access service-role credentials or trusted signing secrets.

The public JavaScript API exposes one publication command only: `requestPublication` (implementation may temporarily retain the current RPC name internally until a forward-only convergence migration replaces it). Deprecated `submitForReview` / `createAndSubmit` style authorities are forbidden.

### 4.2 Trusted media finalization

A dedicated media-finalizer is the only component allowed to promote untrusted derivatives to canonical media.

Required final gate:

1. authenticate/authorize a short-lived server-issued finalization grant;
2. stream with hard byte/time limits;
3. verify magic bytes and actual codec, ignoring extension/Content-Type claims;
4. accept JPEG/WebP only;
5. validate decode structure, dimensions, pixel/decompression bounds, and malformed/polyglot/trailing-data policy;
6. remove/reject EXIF/XMP/unsafe metadata according to canonical policy;
7. normalize color to sRGB and canonical re-encode;
8. compute SHA-256 and trusted dimensions/byte size;
9. write only to the canonical private bucket;
10. record server-owned `CANONICAL/VERIFIED` evidence and immutable security audit;
11. fail closed on timeout, parser failure, OOM, policy failure, or storage mismatch.

Original HEIC/HEIF never crosses this server boundary.

### 4.3 Publication transaction orchestrator

One trusted PostgreSQL RPC/transaction is the authoritative command that moves a listing to `PENDING_REVIEW`.

In one transaction it must:

- resolve authenticated actor and fail closed on malformed identity;
- lock listing + entitlement rows against races;
- verify listing ownership and allowed source state;
- verify Active Market country is fully launch-enabled for the required legal/tax state;
- verify the dynamic sector/category is active;
- require 1–7 media rows as current product policy dictates;
- require every attached media row to be server-owned `CANONICAL/VERIFIED`, owner/listing-bound, and canonical-storage-backed;
- verify active visibility plan/package for country/sector/currency;
- verify opaque entitlement/payment receipt, owner binding, expiry, remaining allowance, and anti-replay uniqueness;
- enforce idempotency so retries return the same bounded result rather than double-consume;
- atomically reserve/consume entitlement according to the canonical accounting rule;
- transition only to `PENDING_REVIEW`, never directly to `ACTIVE`;
- append immutable publication/audit evidence with correlation/idempotency identifiers;
- emit an outbox event when external follow-up is needed.

No second callable browser RPC may perform an equivalent publication transition.

### 4.4 Review and activation

Review is a separate trusted command with explicit moderator/owner capability checks. Approval may activate the listing and start its paid visibility entitlement according to the advertising model. Visibility entitlement duration is not a universal organic listing lifetime.

Rejection records a bounded reason and preserves audit history. Browser code cannot approve itself.

### 4.5 Financial authority

Advertising finance uses one double-entry ledger authority. Paid, promo, pending/reserved, consumed, refunded/reversed states remain explicit. Revenue recognition follows consumed advertising/impression entitlement, not browser actions.

Every charge/entitlement mutation requires an idempotency key, immutable accounting reference, reconciliation evidence, country/currency/tax configuration, and least-privilege service identity. No buyer/seller transaction money enters this ledger.

### 4.6 Compensation and failure recovery

Database rollback is native PostgreSQL transaction rollback. External object-storage effects use a bounded internal compensation/outbox/reconciler process. Compensation is not a browser-callable or wrapper repository authority.

Private raw objects that fail finalization are never public. Orphan cleanup is retryable, idempotent, observable, and safe to run later without changing listing publication truth.

## 5. Runtime convergence

The production runtime must converge from:

- base repository + hardening/rollback wrapper + overlapping publication paths

into:

- one canonical marketplace repository;
- one trusted media-finalizer client boundary;
- one publication command;
- one public-feed media selection rule using canonical objects only.

`vvip-marketplace-rollback.js` is therefore a migration target, not a permanent production layer. Its valid security behavior must move into correctly named canonical modules; then all runtime/release/test references to the wrapper are removed in the same convergence series.

No compatibility layer remains in the production artifact after zero-reference proof.

## 6. Migration safety

Existing migrations are treated as potentially applied. Do not rewrite history merely to make the branch look clean.

Use a forward-only authority-convergence migration that:

- establishes the canonical schema/RPC contract;
- migrates compatible state if present;
- revokes browser execute/write rights from superseded RPCs/tables;
- removes or replaces obsolete callable authorities only after dependency proof;
- preserves audit/evidence;
- forces RLS and least privilege;
- is scanner-reviewed and exact-hash pinned only after architectural review, never simply to make CI green.

Before applying destructive convergence to any shared Supabase environment, inspect the actual migration ledger and live object dependencies.

## 7. Production artifact

The public release builder uses an exact allowlist of required files. Broad `scripts/runtime/` inclusion is forbidden for production.

The artifact must exclude:

- legacy publishers;
- rollback/hardening wrappers after convergence;
- internal docs/tests/migrations;
- server credentials;
- dead runtime modules;
- alternate publication APIs.

Promotion remains exact-artifact, exact-SHA, checksum/attestation/SBOM verified, with recheck of the current main SHA before deployment.

## 8. CI architecture invariants

CI must prove, not assume:

1. exactly one browser publication command/reference exists;
2. no browser code performs direct listing-status update to `PENDING_REVIEW` or `ACTIVE`;
3. no browser code creates/mints trusted entitlement;
4. no deprecated publication method is exported;
5. no production artifact contains rollback/legacy publisher layers;
6. exactly one browser-callable trusted publication RPC can perform the transition;
7. publication SQL requires canonical verified media and active country/sector/plan;
8. media finalization rejects HEIC originals server-side and canonicalizes JPEG/WebP only;
9. RLS/ACL/service-role boundaries remain least privilege;
10. dangerous SQL remains RED until independently reviewed and exact-hash pinned;
11. release candidate is built from one exact SHA and attested;
12. Facebook-style account/feed/composer and OpenSooq-grade discovery remain integrated into the single surface without creating second authorities.

## 9. Operational and administrative control

Owner Control Plane uses capability-based permissions, not ambiguous role names. Sensitive operations are audited. Country/sector/feature activation is configuration/state-machine driven and fail-closed.

Required operational evidence includes structured logs, metrics, traces/security events, SLOs, rate/abuse controls, incident runbooks, backup/restore proof, DR proof, secrets rotation, dependency/supply-chain evidence, and reconciled financial reports.

## 10. Implementation order

1. Add RED architecture-invariant tests.
2. Converge canonical browser repository API and remove direct/parallel publication authorities.
3. Move valid media-finalization behavior out of the rollback wrapper into canonical responsibility boundaries.
4. Add forward-only DB authority-convergence migration after live migration-state inspection.
5. Tighten exact production allowlist and delete wrapper/legacy runtime references after zero-reference proof.
6. Run focused tests, full quality gate, Steel Shield/LC03, CodeQL, release-candidate build, and exact-artifact verification on one SHA.
7. Deploy to isolated AWS staging and execute real-browser/iPhone/Android HEIC + publication + failure-path evidence.
8. Complete finance/country/legal/DR/load/red-team/mobile Launch Passport gates.
9. Promote the exact verified artifact to Production only after every mandatory gate is green.

## 11. Global launch acceptance

The system is globally launch-ready only when one exact candidate SHA proves all mandatory gates green, including application tests, architecture invariants, DB security, media finalization, real-device evidence, finance reconciliation, country/legal/tax activation, observability/DR, load/digital-twin targets, security testing, and exact-artifact production promotion readiness.

No gate is weakened, skipped, renamed, or converted to advisory merely to obtain a green dashboard.
