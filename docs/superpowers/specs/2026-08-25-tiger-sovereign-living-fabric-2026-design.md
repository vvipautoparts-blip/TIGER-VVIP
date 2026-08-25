# TIGER Sovereign Living Fabric 2026 — TSLF-26

## Status
Owner-approved architecture design. This document defines the target evolutionary architecture for TIGER. It does **not** authorize merge to `main`, Production/Staging mutation, remote migrations, or broad rewrites. Implementation must proceed in isolated TDD slices with exact-SHA evidence.

## 1. Purpose
TSLF-26 upgrades the existing TIGER platform without rebuilding it from scratch. The design preserves components that are already correct and verified, removes obsolete/generated residue safely, closes known operational gaps, and adds only the capabilities needed for a secure, global, high-performance platform capable of serving millions of users across strong and weak networks.

Primary outcomes:

1. clean, deterministic workspaces and CI environments;
2. zero-trust identity and least-privilege execution;
3. reproducible builds and verifiable software supply-chain provenance;
4. safe same-artifact release promotion with same-SHA evidence;
5. global resilience under load, attack, dependency failure, and regional failure;
6. excellent user experience on weak, intermittent, and high-latency networks;
7. global localization, accessibility, and country-aware policy without forking the core product;
8. observable, auditable, recoverable operation;
9. controlled AI capability boundaries;
10. evolutionary rollout with no unnecessary platform rewrite.

## 2. Governing principles

### 2.1 Evolution, not rebuild
The current platform remains the base. Existing GREEN components are retained unless evidence shows they are unsafe, obsolete, or structurally incapable of the target requirement.

### 2.2 Cleanroom by construction
Prefer disposable clean environments over repeatedly cleaning persistent environments. A workspace cleanup is a controlled transaction, not a broad shell deletion.

### 2.3 Policy in Git; volatile evidence outside Git
Policies, schemas, tests, and manifests that define expectations belong in source control. Per-run evidence that can become stale should be stored as SHA-bound CI artifacts or external evidence, not committed as a misleading live-state report.

### 2.4 Fail closed
Missing identity, missing evidence, ambiguous scope, invalid state, unmatched artifact, secret exposure, or critical security failure blocks promotion. No silent fallback.

### 2.5 Build once; promote the same artifact
An artifact is built once, receives a digest and provenance, is tested, then the same artifact is promoted through staging/canary/production. Rebuilding between environments is prohibited for authoritative releases.

### 2.6 Same-SHA closure
A release or slice is GREEN only when all required checks, evidence, and policy decisions refer to one exact final source SHA. Results from different SHAs must never be aggregated into a completion claim.

### 2.7 Security failures are not averaged
A critical security failure, invalid provenance, secret leak, or policy denial is authoritative and blocks release regardless of an aggregate quality score.

### 2.8 Global by default
Every performance, resilience, localization, privacy, media, networking, and operational decision must assume a worldwide user base and heterogeneous devices/networks.

### 2.9 Graceful degradation before outage
Under resource pressure, degraded networks, or partial dependency failure, TIGER reduces non-critical richness before sacrificing core availability and data integrity.

### 2.10 Stable standards in enforcement; emerging standards in shadow mode
Final, mature standards may be mandatory. Draft or experimental standards are evaluated in non-authoritative shadow lanes until adoption is justified by evidence.

## 3. Existing assets to preserve and evolve

The implementation must begin from repository truth and preserve existing verified mechanisms unless a focused change proves necessary. In particular:

- VVIP Quality Gate and its isolated validation behavior;
- V14 Release Candidate gate;
- exact-source-SHA checkout/verification;
- SHA-pinned GitHub Actions where already present;
- `tools/vvip_cleanroom.py` and its safety-oriented classification model;
- cleanroom tests and idempotence behavior;
- CodeQL, Dependency Review, CleanGuard, Project Control, LC04/LC05/LC06/TSRF rehearsals;
- current discovery/security boundaries already passing on the active feature branch.

TSLF-26 is additive/evolutionary. It must not replace these with generic scripts that reduce guarantees.

## 4. Architecture overview

TSLF-26 consists of eight cooperating planes.

### 4.1 Workspace Sovereignty Plane
Responsible for repository/workspace hygiene.

Required behavior:

- inventory before mutation;
- classify tracked/untracked/ignored/generated/sensitive/runtime-referenced paths;
- protect `.git`, source, tests, migrations, lockfiles, legal files, policy files, and active runtime dependencies;
- never use an unrestricted `git clean -fd` as authority;
- never create a full workspace ZIP that may duplicate secrets;
- use a cleanup transaction ID and a deletion/quarantine manifest;
- quarantine only non-secret high-confidence candidates outside the repository with restricted permissions;
- secret-like findings are not copied to quarantine; they block and enter the security incident path;
- cleanup must be idempotent;
- final verification must prove no protected source changed unexpectedly and no residue remains;
- remove stale committed run-state reports from authoritative decision paths; keep schemas/policies in Git and current evidence SHA-bound.

Initial hygiene gap to address in a bounded slice: local virtual environments such as `.venv/` must be treated as generated dependency state and prevented from polluting repository cleanroom evidence.

### 4.2 Build and Supply-Chain Trust Plane
Responsible for deterministic inputs and artifact identity.

Requirements:

- exact source SHA verification;
- ephemeral/disposable CI environment where practical;
- immutable full-SHA action pinning for third-party actions;
- minimal workflow permissions;
- deterministic dependency installation;
- Node projects use lockfile-preserving clean install (`npm ci`) when applicable;
- Python dependency flow moves toward hash-verified reproducibility without breaking the current verified runtime in one leap;
- build output receives a content digest;
- release artifacts receive SBOM where applicable;
- provenance/attestation is generated for release artifacts;
- provenance must be verified before privileged promotion;
- caches are acceleration only and must not be required for correctness; restored caches are treated as untrusted inputs.

### 4.3 Identity and Authorization Plane
Responsible for user, administrator, workload, workflow, service, environment, and artifact identity.

Requirements:

- zero-trust decisions based on identity + context + policy, not network location;
- least privilege everywhere;
- privileged human accounts use phishing-resistant authentication where supported;
- short-lived credentials are preferred over long-lived secrets;
- deployment to external cloud providers uses OIDC federation where supported;
- sensitive operations support step-up authorization and auditable approval;
- workload/service identity is introduced when the runtime topology justifies it, not prematurely.

### 4.4 Release Sovereignty Plane
Responsible for promotion and release truth.

Requirements:

- release identity binds source SHA, artifact digest, policy version, security evidence, test evidence, schema/config versions, and rollback identity;
- machine-readable release state is authoritative; human documentation is derived from or reconciled against it;
- same artifact moves through environments;
- environment protections and technical rules enforce approvals instead of relying on prose alone;
- required check skip = BLOCKED unless explicitly classified non-applicable by policy;
- immutable release publication for formal releases where supported;
- rollback is migration-aware; irreversible data/schema transitions may require hold/forward-fix rather than blind rollback.

### 4.5 Global Resilience and Burn Shield Plane
Responsible for surviving attacks, load spikes, dependency degradation, and regional failure.

Logical request path:

`Internet -> DDoS/WAF/Bot controls -> Global Edge -> Regional/Cell Admission -> API Admission -> Service -> Queue/Cache/Data`

Requirements:

- layered DDoS/WAF/bot/fraud defenses;
- rate and quota admission controls;
- timeouts and bounded retries with jitter;
- circuit breaking;
- backpressure and queue-depth protection;
- database connection admission and resource budgets;
- idempotency for retryable writes;
- load shedding of non-critical work;
- autoscaling guarded by cost and resource limits so attack traffic cannot create uncontrolled spend;
- cell/region isolation so a regional failure does not automatically become a global outage;
- no forced microservice/Kubernetes migration until load and operational evidence justify it.

### 4.6 Adaptive Global Experience Plane
Responsible for a single TIGER experience that adapts instead of maintaining a separate Lite product.

Runtime experience tiers:

- `FULL`: rich media, realtime, personalization, animations where appropriate;
- `BALANCED`: reduced realtime, smaller media, deferred non-critical work;
- `SURVIVAL`: text-first/core navigation, cached safe reads, essential writes, minimal scripts/media.

Adaptation inputs may include network quality, latency, device capability, viewport, runtime load, and country/locale context, while respecting privacy.

Requirements:

- meaningful HTML/critical UI first;
- small initial JavaScript budget and route-level code splitting;
- avoid unnecessary autoplay and large eager media;
- responsive image variants and modern formats where supported;
- edge/CDN delivery for cacheable assets;
- HTTP/3 where platform/infrastructure support is appropriate;
- explicit offline/intermittent states;
- no false success UI: user-facing completion requires authoritative acknowledgement;
- safe retry/outbox semantics only for operations designed to be idempotent;
- sensitive/private responses must not be cached indiscriminately by Service Workers or shared caches.

### 4.7 Globalization, Accessibility, and Country Policy Plane
Responsible for one global core with country-aware behavior.

Requirements:

- UTF-8 end-to-end;
- BCP-47 locale identifiers;
- correct RTL/LTR behavior;
- locale-aware number/date/time/currency display;
- timezone awareness;
- localized address and phone formatting;
- translation fallback and missing-translation observability;
- WCAG 2.2 AA target for user-facing components;
- keyboard, screen-reader, contrast, touch-target, focus, zoom, and reduced-motion contracts;
- country profiles configure legal/privacy/content/payment-for-ads/data-residency differences without product forks;
- global core remains singular unless a hard regulatory boundary requires physical separation.

### 4.8 Observability, Recovery, and AI Governance Plane
Responsible for runtime truth, recovery, and bounded intelligent automation.

Observability requirements:

- traces, metrics, logs, release markers, and selected profiles where useful;
- P50/P95/P99 latency, availability, error rate, queue delay, DB saturation, search/feed/auth/media health;
- real-user experience segmented by country, network quality, device class, route, and release where privacy allows;
- OpenTelemetry-compatible instrumentation where appropriate;
- telemetry redaction/minimization to prevent PII/token/secret leakage;
- country/cell health must be visible independently from global averages.

Recovery requirements:

- explicit RPO/RTO per data class;
- point-in-time recovery where appropriate;
- versioned/immutable backup policy;
- cross-region recovery for critical data where required;
- regular restore verification and region/dependency failure exercises;
- a backup is not considered proven until restore is tested.

AI governance requirements:

- AI proposes or acts only within explicit capabilities;
- every agent/tool has scope, rate, budget, allowed/forbidden actions, and maximum impact;
- privileged operations require deterministic policy and, where appropriate, human approval;
- AI cannot bypass production/security/release controls;
- kill-switch/isolation path for misbehaving automation;
- AI-generated code goes through the same or stronger tests/security/provenance as human code.

## 5. Scale model
The architecture is intended for a first-year user population that can exceed four million accounts, but capacity is not sized from registered users alone.

Authoritative capacity planning uses:

- peak concurrent sessions;
- peak/steady RPS;
- search QPS;
- writes per second;
- fan-out volume;
- media ingress/egress;
- queue depth and processing lag;
- database TPS/connections/replication lag;
- cache hit ratios;
- country/region traffic distribution.

The initial implementation should remain as simple as possible while creating clean boundaries that permit future regional/cellular scale-out without a rewrite.

## 6. Performance and UX contracts
Initial user-experience objectives use field data rather than local developer impressions.

At minimum, track Core Web Vitals and product-specific readiness metrics at the 75th percentile, segmented by network/device/country where meaningful.

Product-specific examples:

- shell/navigation usable;
- feed usable;
- search interactive;
- primary image visible;
- authentication round-trip;
- ad-campaign workflow latency;
- failed/retried user actions;
- offline-to-online recovery success.

Performance budgets must be explicit per route for initial JS, CSS, critical media, request count, and third-party code. Budgets are adjusted only with evidence and review.

## 7. Data classification
Every significant data domain must map to a class such as:

- PUBLIC;
- ACCOUNT;
- PERSONAL;
- SENSITIVE;
- AD_FINANCIAL;
- SECURITY;
- AUDIT.

Each class defines access, encryption, logging, retention, deletion, backup, cross-border handling, and cache policy. The names may evolve during implementation, but the classification requirement is mandatory.

## 8. Non-goals
TSLF-26 does not authorize or require:

- a rewrite from scratch;
- an immediate monolith-to-microservices rewrite;
- Kubernetes/service-mesh adoption without demonstrated need;
- a second separate TIGER Lite application;
- unrestricted deletion of repository history;
- `git gc --prune=now` as routine cleanup;
- broad `git clean -fd` as cleanup authority;
- full-workspace secret-containing backup ZIPs;
- production deployment during architecture implementation;
- changing the platform's business boundary for buyer/seller product or service payments;
- mixing organic relevance with paid delivery;
- reducing current security/quality gates for convenience.

## 9. Implementation decomposition
The architecture is too broad for one implementation commit or one monolithic plan. It must be decomposed into independently verifiable slices.

### Wave A — Cleanroom Sovereignty
A1. Cleanroom policy contract and transaction model.
A2. `.venv`/generated-environment hygiene and ignore normalization.
A3. stale evidence separation: policy-in-Git/evidence-as-artifact.
A4. protected-path and runtime-reference proof.
A5. secret-safe quarantine and zero-residue verification.

### Wave B — Supply-Chain Trust
B1. deterministic dependency policy per actual package scope.
B2. dependency hash/lock hardening.
B3. release artifact digest + SBOM.
B4. artifact provenance/attestation and verification.
B5. cache trust boundary and ephemeral-runner hardening.

### Wave C — Release Sovereignty
C1. machine release truth and evidence binding.
C2. same-artifact promotion contract.
C3. environment/ruleset enforcement.
C4. OIDC short-lived deployment identity where supported.
C5. migration-aware rollback policy and immutable release evidence.

### Wave D — Global Experience and Performance
D1. route-level performance budgets and real-user measurement.
D2. adaptive media/code delivery for weak networks.
D3. offline/intermittent continuity and truthful state UX.
D4. accessibility/globalization component contracts.
D5. country profile contract.

### Wave E — Global Resilience
E1. admission/rate/backpressure/idempotency contracts.
E2. load-shedding and graceful-degradation modes.
E3. WAF/DDoS/bot/fraud integration at the actual hosting edge.
E4. cell/region boundary design based on observed traffic.
E5. load/chaos/recovery proof and cost-burn protection.

### Wave F — Observability, Recovery, AI Governance
F1. structured telemetry and release markers.
F2. privacy-safe RUM/country health.
F3. backup/restore/RPO/RTO proof.
F4. AI capability policy and kill-switch boundaries.

## 10. Execution method for every slice
Every implementation slice must follow:

`Repo Truth -> Baseline -> Isolation -> RED -> Root Cause -> Minimal Fix -> Focused GREEN -> Cleanup -> Regression -> Zero-Residue -> Commit -> Push -> GitHub Actions -> Same-SHA Evidence -> Next Slice`

Rules:

- no production/main mutation unless separately authorized;
- no broad refactor bundled into a focused slice;
- no test silencing to obtain GREEN;
- no release claim without fresh evidence;
- if an architectural assumption proves false, stop that slice and revise the design/plan before expanding scope.

## 11. First implementation target after plan approval
The first code slice should be **Wave A2: `.venv`/generated-environment hygiene and cleanroom evidence correctness**, because repository evidence shows local virtual-environment residue can contaminate cleanroom duplicate reporting while current CI remains GREEN. This slice is bounded enough for TDD and directly supports all later work without touching Production.

Expected first-slice acceptance criteria:

1. `.venv` and equivalent local environment directories are explicitly treated as generated dependency state;
2. cleanroom audit does not mistake dependency-internal duplicates for repository source duplicates;
3. no secrets are copied or exposed;
4. existing protected paths and active runtime references remain preserved;
5. cleanroom tests demonstrate RED before the change and GREEN after;
6. full quality regression remains GREEN on one final SHA;
7. PR stays Draft and unmerged.

## 12. Completion definition
TSLF-26 is not declared complete because a document exists or because one CI run is green. Each wave has its own acceptance criteria and exact-SHA evidence. Platform-wide readiness requires all explicitly required production, security, performance, resilience, recovery, and UX gates for the chosen launch scope to be GREEN on the release candidate evidence set.
