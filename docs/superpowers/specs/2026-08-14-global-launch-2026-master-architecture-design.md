# TIGER VVIP — Global Launch 2026 Master Architecture

**Date:** 2026-08-14
**Status:** OWNER-APPROVED DIRECTION / IMPLEMENTATION GATED BY EVIDENCE
**Master launch gate:** GitHub issue #243

## 1. Purpose

This document defines the complete technical operating model for taking TIGER VVIP from a strong repository and controlled staging substrate to a globally launchable advertising/discovery platform.

The design is intentionally evidence-driven. New technology is adopted only when it creates measurable security, reliability, performance, privacy, operability, accessibility, or cost benefits. Novelty alone is not a reason to increase complexity.

The platform is designed for global launch while remaining reversible, fail-closed, observable, and region-aware.

## 2. Binding owner model

TIGER VVIP is an advertising, discovery, search, and direct-contact platform.

It may:
- publish and discover advertisements;
- help users find sellers, buyers, providers, and beneficiaries;
- provide search, filters, relevance, recommendations, moderation, abuse protection, account management, and advertising products;
- provide direct-contact mechanisms and platform-level compliance controls.

It does **not** become a party to the underlying transaction and does not add:
- checkout for the underlying goods/services transaction;
- escrow;
- platform settlement between buyer and seller;
- delivery execution;
- warranty execution;
- marketplace commission/payout on the underlying transaction;
- dispute resolution or compensation for the underlying transaction,
except where a specific jurisdiction legally requires a limited platform process.

All future architecture must preserve this invariant unless the owner explicitly changes the business model.

## 3. Architecture principles

### 3.1 Fail closed
Missing authorization, corrupted media, unknown country state, ambiguous identity, invalid release evidence, broken telemetry policy, failed legal gate, or unresolved security finding must deny the risky operation rather than silently downgrade safety.

### 3.2 Build once, promote exact artifact
Production promotion must use an immutable artifact produced from one exact source SHA. Promotion must not rebuild application bytes.

### 3.3 Zero implicit trust
Every externally influenced boundary—user input, JWT claim, upload, database RPC, dependency, CI action, CDN request, webhook-like input, admin action, and media derivative—is treated as untrusted until verified.

### 3.4 Least privilege
Human users, service roles, CI jobs, edge components, database functions, storage policies, and administrators receive only the minimum authority required for the operation.

### 3.5 Explicit trust domains
Identity, marketplace data, media processing, administration, analytics, audit, and country activation are separate trust domains with explicit interfaces.

### 3.6 Privacy by architecture
Collect only operational data needed to run and protect the service. Do not use telemetry as a shadow user-profile database.

### 3.7 Reversibility
Every risky rollout needs a rollback path, kill switch, route-scoped disable mechanism, or country activation suspension mechanism.

### 3.8 Evidence over inference
A static label, green unit test, or design comment is never substituted for a real deployment, device, security, restore, or legal result where runtime evidence is required.

## 4. Global logical architecture

### Layer A — Global edge
Responsibilities:
- DNS and TLS;
- CDN/static/media distribution;
- WAF and coarse abuse controls;
- cache policy;
- origin shielding where supported;
- geographic routing only when legally and operationally justified;
- immutable versioned static assets;
- synthetic health probes.

Rules:
- user-media upload ingress must never be accidentally decompressed by an intermediary where the application requires identity-encoded security bounds;
- cache keys must include every representation-affecting dimension;
- authenticated/private API responses must not enter shared public caches;
- media/static delivery should use cookie-free origins where practical.

### Layer B — Identity and session plane
Responsibilities:
- account authentication;
- session lifecycle;
- step-up authentication for privileged actions;
- compromised-password protection where password authentication exists;
- device/session revocation;
- role/authority envelope issuance.

Rules:
- database role `authenticated` alone is not sufficient proof of permanent platform identity;
- anonymous Auth identities must not acquire owner/admin semantics;
- privileged authorization is derived from trusted server-side state, not client-selected role labels;
- sensitive account changes require recent authentication or step-up.

### Layer C — Application/API plane
Responsibilities:
- public discovery APIs;
- authenticated listing management;
- favorites and account operations;
- moderation APIs;
- safe media derivative acceptance;
- country/sector policy enforcement.

Rules:
- schema validation before business logic;
- authorization before mutation;
- bounded request size and complexity;
- idempotency on retry-sensitive operations;
- explicit error taxonomy with no secret leakage;
- no hidden server HEIC conversion fallback.

### Layer D — Data plane
Responsibilities:
- Postgres transactional state;
- RLS/ACL enforcement;
- immutable or append-only audit structures where required;
- country activation state;
- marketplace state machine;
- operational counters with bounded retention.

Rules:
- RLS on exposed tables;
- internal deny-all tables may intentionally have RLS with no browser policies;
- SECURITY DEFINER functions require fixed `search_path`, minimum EXECUTE grants, internal authorization checks, and negative tests;
- foreign-key and hot-query indexes are workload-driven and tested;
- migration-only schema changes, forward compatible where possible.

### Layer E — Sovereign media fabric
Binding invariant:
**Original HEIC/HEIF remains client-local for conversion. It must never be uploaded to a server HEIC converter.**

Pipeline:
1. client preflight;
2. pixel/memory admission;
3. Native or pinned WASM decode according to trusted policy;
4. orientation/color normalization;
5. crop/resize;
6. reconstruct sanitized JPEG/WebP derivative;
7. client privacy proof;
8. upload derivative only;
9. server independently inspects and rewrites derivative;
10. final safe delivery through isolated media origin.

Controls:
- EXIF/GPS/XMP/IPTC/comments stripping;
- animation and polyglot rejection;
- 4:3 geometry contract where required;
- bounded dimensions and bytes;
- worker timeout and recovery;
- no second-decoder unsafe retry after decode begins;
- zero original-media persistence in browser caches/databases;
- color-reference evidence for wide-gamut/ICC sources;
- explicit LGPL + HEVC/H.265 launch-scope legal review.

### Layer F — Search and discovery plane
Responsibilities:
- full-text and structured filters;
- typo tolerance;
- country/sector-aware ranking;
- pagination/cursor discipline;
- zero-result recovery;
- abuse-resistant indexing.

Rules:
- relevance changes are versioned;
- no ranking feature may bypass legal/country visibility policy;
- search analytics use privacy-minimized aggregates;
- fallback search remains deterministic during partial subsystem degradation.

### Layer G — Advertising and DIDE plane
Responsibilities:
- advertising package configuration;
- impression eligibility;
- country economics;
- double-entry ledger where financial accounting requires it;
- paid/promo/pending wallet separation;
- revenue recognition only after eligible impressions are consumed.

Impression baseline:
- >=50% ad visibility;
- >=2.0 seconds;
- duplicate suppression for same IP/device within the defined anti-replay window;
- bots and known invalid traffic excluded.

Rules:
- country eCPM and operational assumptions are configuration, not hardcoded UI formulas;
- price and delivery logic is not tied to shipping or transaction fulfillment;
- financial events are idempotent and auditable;
- promotional value cannot be mistaken for recognized revenue.

### Layer H — Trust, abuse, and moderation plane
Responsibilities:
- spam/fraud/bot detection;
- user report/block flows;
- content review;
- country-specific prohibited/restricted content controls;
- emergency content disable;
- moderator audit.

Rules:
- least-privilege moderation;
- no silent privilege escalation;
- moderation actions have reason codes and audit references;
- automated models may recommend, rank, or triage but high-impact enforcement needs a controlled policy path;
- abuse signals should not become indefinite personal dossiers.

### Layer I — Owner/control plane
Responsibilities:
- trusted authority assignments;
- country activation lifecycle;
- policy versions;
- decoder route policy;
- emergency suspension;
- release authorization.

Country activation state:
`Draft -> Legal_Approved -> Tax_Configured -> Active -> Suspended`

No country can become Active by a client-side operation.

## 5. 2026 security baseline

### 5.1 Application security
Target verification baseline:
- OWASP ASVS 5.0 control mapping for relevant web application classes;
- threat models for high-risk boundaries;
- abuse cases, not only happy-path tests;
- authorization negative tests;
- file/media parser hostile tests;
- SSRF/path traversal/injection/XSS/CSRF/session fixation/clickjacking/open redirect protections where applicable.

### 5.2 Secure development lifecycle
Adopt an SSDF-aligned process:
- documented security requirements;
- protected source and build process;
- dependency review;
- secret scanning;
- code scanning;
- reproducible or deterministic release inputs where practical;
- vulnerability response workflow;
- post-incident root-cause corrections.

### 5.3 Supply-chain security
Target:
- immutable third-party GitHub Actions references;
- minimal workflow permissions;
- OIDC instead of long-lived cloud deployment credentials where supported;
- CycloneDX/SPDX SBOM;
- build provenance / artifact attestation;
- verify attestation before production promotion;
- immutable release artifacts;
- dependency policy with emergency revoke/upgrade path;
- no Production build from a developer workstation.

SLSA Build Level 3 is a target where the repository/build topology can satisfy it without weakening existing exact-artifact controls.

### 5.4 Secret management
- no secrets in public/client bundles;
- no secrets committed to source;
- environment-scoped secrets;
- short-lived credentials where possible;
- rotation procedure;
- emergency revocation;
- owner/admin break-glass credentials stored separately and tested.

## 6. Database hardening program

### Mandatory classes
1. RLS correctness;
2. anonymous-vs-permanent identity separation;
3. SECURITY DEFINER review;
4. fixed function search path;
5. privilege review;
6. migration drift control;
7. index/cost review;
8. backup/PITR evidence;
9. restore drill;
10. connection pool and Auth allocation scaling.

### Anonymous identity invariant
Supabase anonymous Auth sessions may map to the `authenticated` Postgres role. Therefore every owner/admin policy must derive authority from a stronger trusted identity predicate.

### Internal tables
RLS-enabled tables with no browser policies are acceptable when the intended security model is deny-all browser access and service-only use. The state must be documented so automated advisors are not "fixed" by accidentally adding public access.

## 7. Observability architecture

Use OpenTelemetry-compatible semantic conventions and a vendor-neutral signal model.

### Signals
- metrics;
- traces;
- logs;
- profiles where supported and privacy-safe;
- audit events as a separate security/compliance class.

### Mandatory service indicators
- availability;
- request error rate;
- latency percentiles;
- saturation;
- DB pool pressure;
- auth failures/rate limits;
- search latency/zero-result ratio;
- listing publication failures;
- media route outcome/latency/OOM/timeout buckets;
- CDN origin error ratio;
- queue/backlog indicators where asynchronous work exists.

### Privacy constraints
Telemetry must not contain:
- original HEIC bytes;
- EXIF/GPS values;
- raw passwords/tokens;
- authorization headers;
- private message content unless explicitly required and protected;
- uncontrolled free-form stack traces containing user data;
- persistent cross-service tracking identifiers unless necessary and governed.

### SLO model
Each launch-critical journey gets:
- SLI definition;
- SLO target;
- error budget;
- alert burn-rate policy;
- owner/runbook;
- graceful degradation strategy.

## 8. Reliability and resilience

### Failure domains
Design separately for:
- edge/CDN failure;
- application failure;
- auth provider degradation;
- database saturation;
- storage failure;
- media decoder route failure;
- regional outage;
- dependency outage;
- bad deployment;
- operator error.

### Resilience controls
- health/readiness checks;
- timeouts everywhere an external dependency can stall;
- bounded retries with jitter only for retry-safe errors;
- circuit breaking by dependency/route, never as an authorization bypass;
- bulkheads/concurrency limits;
- idempotency keys;
- backpressure;
- safe degradation;
- kill switches;
- exact rollback artifact.

### Disaster recovery
Required evidence:
- automated backups;
- point-in-time recovery where available;
- restore to an isolated environment;
- application smoke test against restored data;
- measured RPO/RTO;
- documented DNS/origin recovery process;
- recovery of secrets/config/policies, not database only.

## 9. Performance and scale

### Method
Do not guess capacity from local tests. Establish baselines and test:
- normal launch load;
- expected peak;
- flash/spike load;
- sustained soak;
- degraded dependency conditions;
- cold starts/cache misses;
- large-but-valid payloads.

### Performance budgets
Set measurable budgets for:
- Core Web Vitals/initial interaction;
- API p50/p95/p99;
- search response;
- listing publish;
- media processing on representative low/mid/high devices;
- DB query time and rows scanned;
- edge cache hit ratio;
- JS/CSS/image payload size.

### Cost-aware scale
Every major service gets:
- unit-cost metric;
- monthly budget guard;
- anomaly alarm;
- autoscaling ceiling;
- protection against abusive requests that create unbounded cost.

## 10. Global content delivery

### Representation strategy
JPEG/WebP remain safe canonical publication formats initially. AVIF delivery may be introduced after real quality/performance/client coverage evidence.

If dynamic representation negotiation is introduced:
- `Accept`/capability-aware selection must have correct `Vary` and cache key behavior;
- every generated representation is independently validated;
- fallback remains deterministic;
- origin conversion cost is bounded and cached;
- rollout is measured against decode latency, bytes, quality, cache fragmentation, and browser/device compatibility.

### Multi-tier caching
Use layers only where they create measurable value:
- browser cache for immutable public assets;
- CDN edge cache for public media/static assets;
- origin/object storage as source of truth;
- Redis/Memcached only for data with a clear invalidation and consistency model.

Never add a memory cache simply to claim multiple cache tiers.

## 11. Accessibility, localization, and global UX

Mandatory:
- RTL and LTR;
- keyboard navigation;
- visible focus;
- semantic labels;
- screen-reader smoke tests;
- contrast verification;
- no color-only status meaning;
- reduced-motion consideration;
- localization fallback;
- locale-aware numbers/dates/currencies;
- low-bandwidth and low-RAM modes;
- empty/loading/error/offline states;
- responsive mobile/desktop layouts.

## 12. AI and automation governance

AI may assist:
- abuse triage;
- moderation prioritization;
- support summarization;
- anomaly detection;
- search/relevance experimentation;
- owner operational analysis.

AI must not silently:
- grant authority;
- activate a country;
- override legal state;
- merge or promote an unsafe release;
- bypass a failed media/security gate;
- generate irreversible financial/accounting mutations without validated policy controls.

High-impact automation requires:
- bounded tools;
- least privilege;
- explicit action schema;
- idempotency;
- policy check;
- audit record;
- rollback/compensation strategy where possible.

## 13. Legal and market activation

Per active market record:
- legal review status;
- tax configuration;
- legal entity applicability;
- data-residency decision;
- prohibited/restricted content rules;
- privacy/terms version;
- reporting/takedown process;
- advertising rules;
- consumer/platform disclosure language consistent with the advertising/discovery-only business model;
- HEVC/H.265 outcome if F05 decoder is available in that market.

No global flag may activate every country without passing its configured legal/tax gate.

## 14. Release engineering

### Required release evidence
- exact source SHA;
- test/quality/security workflows on exact SHA;
- dependency review;
- CodeQL/static analysis;
- project-control integrity;
- generated SBOM;
- materials list;
- artifact digest;
- signed attestation/provenance;
- release manifest;
- deployment record;
- rollback artifact identity.

### Production promotion
Promotion must:
- require an explicit release SHA/artifact identity;
- independently verify artifact metadata and digest;
- verify attestation;
- perform safe extraction;
- deploy without application rebuild;
- use environment-protected credentials;
- record deployment result.

## 15. Launch verification matrix

A release candidate is globally launchable only after evidence for:

### Security
- authentication/session negative tests;
- authorization/RLS tests;
- anonymous identity tests;
- hostile media/file tests;
- dependency/code scanning;
- secret scanning;
- production security advisor review;
- admin/owner privilege review.

### Media
- iPhone Safari real HEIC;
- Android Chrome real HEIC/HEIF where available;
- desktop Chromium;
- forced WASM;
- genuine native route where supported;
- orientation;
- wide-gamut/ICC golden comparison;
- metadata stripping;
- offline pack/no-pack;
- cancellation;
- OOM/memory rejection recovery;
- zero original upload/persistence.

### Reliability
- load test;
- spike test;
- soak test;
- failover/degradation tests;
- backup restore drill;
- rollback rehearsal;
- alert/runbook exercise.

### UX
- mobile/desktop;
- RTL/LTR;
- accessibility smoke;
- slow network;
- offline/error states;
- localization fallback.

### Legal
- terms/privacy/content policy;
- market activation evidence;
- HEVC/LGPL review;
- tax/advertising configuration.

## 16. Launch phases

### Phase 0 — Dark production substrate
Infrastructure exists but countries/features remain disabled or limited to trusted operators.

### Phase 1 — Internal/controlled pilot
Real production stack, restricted audience, aggressive telemetry and rollback readiness.

### Phase 2 — Country pilot
Activate only legally/tax-approved country configuration. Prove reliability, moderation, abuse, economics, and support runbooks.

### Phase 3 — Multi-country expansion
Activate markets independently based on country seal/state. No all-at-once global switch.

### Phase 4 — Global scale program
Expand only from observed capacity, legal readiness, and operational maturity.

## 17. Launch command center

For launch day maintain one operational view containing:
- release SHA/artifact;
- deployment status;
- availability/error/latency;
- DB saturation;
- auth health;
- media failure routes;
- search health;
- moderation backlog;
- abuse indicators;
- CDN/origin health;
- budget/cost anomalies;
- active incidents;
- rollback/suspension controls.

Post-launch reviews at 24h, 72h, and 7d must record evidence and corrections.

## 18. Technology adoption gate

A new framework/database/cache/AI system/codec/edge product is adopted only if all are true:
1. it solves a measured problem;
2. security model is understood;
3. operational ownership is defined;
4. failure behavior is understood;
5. cost is bounded;
6. migration/rollback path exists;
7. test strategy exists;
8. supply-chain/licensing position is acceptable;
9. it does not violate owner/business invariants.

This prevents "2026 technology" from becoming uncontrolled architectural debt.

## 19. Current blocking program

The current master blockers are tracked under GitHub issue #243 and include at least:
- F05 deployed media adapter/bypass verification (#240);
- F05 real-device/privacy/color evidence (#241);
- F05 LGPL + HEVC/H.265 review (#242);
- Supabase Production security/scale convergence (#244);
- exact-head automated gates for every release candidate;
- production deployment/observability/DR/legal evidence.

## 20. Final release rule

`GLOBAL_LAUNCH_ELIGIBLE = TRUE` only when every blocking requirement is backed by observed evidence against the immutable release candidate and intended production configuration.

Green CI alone is necessary but not sufficient.

The platform must remain fail-closed until the final global-launch evidence set is complete.
