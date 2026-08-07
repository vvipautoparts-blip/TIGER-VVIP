# VVIP TIGER — Sovereign Evidence-First Launch Closure Design

Status: **OWNER-APPROVED DESIGN / RELEASE-CLOSURE BASELINE**  
Date: **2026-08-07**  
Target chain: **AI-01 through AI-18**  
Working branch: **`feat/ai-18-owner-stepup-authorization`**

## 1. Objective

Take VVIP TIGER from an advanced repository/control-plane state to a genuinely launch-ready production release with evidence-backed closure of every mandatory core-platform, AI, security, staging, recovery, legal/privacy, operational, manual-acceptance, owner-authorization, deployment, and post-deployment gate.

The release must not claim `100%` readiness from code completion, CI success, documentation, simulation, or test fixtures alone.

The only valid 100% state is the machine-verifiable readiness state:

```text
productionReady=true
readinessPercent=100
blockedCount=0
status=TIGER_SOVEREIGN_READINESS_100
```

## 2. Chosen Approach

Adopt **Sovereign Evidence-First Release Train**.

The project stops expanding the AI feature surface after AI-18 unless a launch-blocking defect requires a narrowly scoped fix. The priority changes from feature construction to release closure.

Rejected alternatives:

1. **Merge-all-first** — rejected because a large stacked merge before environment proof increases rollback and root-cause risk.
2. **Core-only launch with AI deferred** — technically valid but does not satisfy the current objective of a complete launch including the governed AI operating system.

## 3. Non-Negotiable Principles

1. `main` remains protected.
2. No production mutation is implied by a broad instruction such as “finish everything”.
3. Merge, database promotion, and production activation remain three separate owner decisions.
4. AI remains unable to transfer funds, delete production data autonomously, or change owner authority.
5. Browser/client state never constitutes trusted L4 authorization.
6. Secrets remain server-side only.
7. Any historically exposed real credential must be inventoried and rotated as required.
8. Unknown, stale, ambiguous, forged, replayed, cross-scope, or incomplete authority fails closed.
9. Repository evidence cannot substitute for staging/production evidence.
10. Evidence must be bound to the exact Release DNA being promoted.
11. Any release-changing code, migration, policy, prompt, model, tool, or security configuration change invalidates affected evidence and triggers required revalidation.
12. No new non-launch-critical feature work is permitted during release closure.

## 4. Release Architecture

The launch candidate is treated as one controlled release train with these authority layers:

```text
Owner
  ↓
Release Truth / Evidence System
  ↓
Sovereign Security Kernel
  ↓
Identity + Scope + Policy + Budget/Rate + Kill Switches
  ↓
Trusted Owner Approval + Fresh Step-Up for L4
  ↓
Model Gateway / Evidence Plane / Tool Registry
  ↓
Staging Runtime
  ↓
Validated Production Promotion
  ↓
Post-Deploy Verification + Monitoring + Backup Evidence
```

The model remains last in the authority chain. It cannot redefine policy, register tools, create owner authority, or convert text into trusted authorization.

## 5. Launch Closure Workstreams

### LC-01 — Release Freeze and Dependency Baseline

- Freeze non-launch-critical feature development.
- Inventory stacked PRs AI-01 through AI-18 and their dependency order.
- Establish one exact candidate Release DNA.
- Detect duplicate/superseded PRs and prevent parallel conflicting release paths.
- Re-run required repository CI on the exact candidate head.

Exit criteria:
- one unambiguous release candidate;
- clean dependency chain;
- exact source provenance;
- no unresolved P0/P1 repository defect.

### LC-02 — Core Platform Closure

Validate real end-to-end core journeys, including:

- PR36 real `.jpg` image upload path;
- registration and authentication;
- session continuity and logout;
- password recovery;
- profile/account center;
- marketplace/feed;
- search;
- listing/ad creation and image handling;
- role boundaries;
- PWA/service-worker behavior;
- error/empty/offline states.

Manual browser acceptance must include Arabic/English, RTL/LTR, mobile and desktop.

Exit criteria:
- no deferred core launch gate;
- no material console error;
- no material horizontal overflow/layout regression;
- all critical user journeys evidenced on supported browsers/devices.

### LC-03 — Security and Secret Closure

- Remove local secret files from tracked release content.
- Audit Git history and configuration for exposed credentials.
- Rotate any real credential whose exposure cannot be excluded.
- Run secret scanning, CodeQL, dependency review, dangerous-SQL checks, RLS probes and authorization abuse tests.
- Verify client cannot forge owner/admin/agent authority.

Exit criteria:
- no open P0/P1 security finding;
- secret inventory complete;
- required rotations complete;
- exact release passes security gates.

### LC-04 — Staging Database and Trust Fabric

Apply approved migrations to an isolated non-production staging environment only.

Verify:

- Trust Fabric schema;
- RLS and browser denial;
- append-only/immutable audit behavior;
- payload-bound approvals;
- expiry and one-time consumption;
- replay prevention;
- concurrent approval/consumption safety;
- atomic budget/rate/concurrency state;
- rollback compatibility;
- backup creation and restoration.

Exit criteria:
- real database evidence, not static SQL analysis only;
- successful restore drill;
- successful concurrency/replay probes;
- no unauthorized browser write path.

### LC-05 — Live Staging AI Runtime

Configure server-only staging identity, model/provider credentials and runtime adapters.

Verify:

- Model Gateway authentication and strict structured outputs;
- provider timeout/outage handling;
- circuit breaker and bounded retry;
- cost/token/rate/concurrency ceilings;
- Evidence Plane source/freshness/scope projection;
- reviewed safe Tool executors only;
- no direct model-controlled execution;
- sanitized audit/observability events;
- kill-switch behavior independent of model availability.

Exit criteria:
- live staging inference and evidence paths work;
- no secret reaches browser/model-visible unrestricted context;
- runtime fails closed under missing/invalid dependencies.

### LC-06 — Owner Sovereignty and Step-Up

Bind real owner identity using phishing-resistant server-side authorization such as WebAuthn/passkey or equivalent IdP MFA.

Test:

- forged owner;
- copied client JSON;
- stale ordinary login;
- expired challenge;
- replay;
- duplicate consumption;
- wrong action;
- wrong payload digest;
- wrong Release DNA;
- wrong environment/scope;
- concurrent consumption;
- revoked/invalid credential.

L4 operations remain protected by both the exact owner decision and fresh transaction-bound Step-Up.

Exit criteria:
- manual owner Step-Up acceptance PASS;
- live replay/concurrency tests PASS;
- audit trail proves one-time authorization consumption.

### LC-07 — Independent BLACKBOX / Red-Team Closure

Execute adversarial tests covering at minimum:

- direct and indirect prompt injection;
- forged authority;
- tool invention;
- privilege escalation;
- cross-agent, cross-user and cross-country access;
- secret exfiltration;
- schema/argument smuggling;
- XSS and SSRF where applicable;
- poisoned retrieved content;
- hallucinated execution claims;
- cyclic delegation;
- model/provider cascading failure;
- audit tampering/replay attempts.

Exit criteria:
- final independent security/BLACKBOX decision PASS;
- P0=0;
- P1=0;
- all accepted residual risks explicitly recorded.

### LC-08 — UX, Accessibility and Compatibility Closure

Validate the actual release candidate on supported mobile and desktop form factors and major browsers.

Verify:

- Arabic/English correctness;
- RTL/LTR layout;
- keyboard navigation;
- focus behavior;
- contrast and readable states;
- loading/error/empty states;
- responsive layout;
- no horizontal overflow;
- no material console errors;
- PWA/offline behavior where supported.

Exit criteria:
- no critical accessibility/usability blocker;
- manual acceptance evidence attached to exact Release DNA.

### LC-09 — Performance and Reliability Closure

Measure rather than assume:

- page/startup load;
- API latency p50/p95/p99;
- image upload latency and failure rate;
- database concurrency;
- model/provider latency;
- bounded failure recovery;
- rate-limit behavior;
- budget exhaustion behavior;
- representative load/stress behavior.

Exit criteria:
- agreed launch SLOs measured and met or explicitly owner-accepted as residual risk;
- no uncontrolled resource exhaustion path.

### LC-10 — Operations, Recovery and Incident Readiness

Run live non-production drills:

- backup and restore;
- application rollback;
- migration rollback/recovery procedure;
- AI global kill switch;
- per-agent/provider/tool kill switch;
- provider outage;
- alert delivery;
- incident response escalation;
- audit-integrity verification.

Exit criteria:
- runbooks are executable, not theoretical;
- responsible owner/operator can recover the platform using documented procedures.

### LC-11 — Legal, Privacy and Country Activation

For every active launch country, review:

- Terms of Use;
- Privacy Policy;
- retention/deletion/export behavior;
- model/provider data processing;
- data residency where applicable;
- currency/tax configuration;
- local country activation constraints;
- consent/disclosure requirements.

Exit criteria:
- launch countries explicitly approved;
- no unresolved mandatory legal/privacy blocker.

### LC-12 — Golden Release and Controlled Production Promotion

Only after all prior workstreams are PASS:

1. Produce the final evidence-backed Golden Release candidate.
2. Require **Owner Merge Approval** for the exact reviewed source release.
3. Require **Owner DB Promotion Approval** for the exact reviewed production migration payload.
4. Require **Owner Production Activation Approval** for the exact reviewed production release.
5. Perform production promotion using the approved release artifacts only.
6. Run post-deploy smoke tests.
7. Verify monitoring/alerts.
8. Verify production backup state.
9. Re-run the readiness truth engine using real evidence.

Final success requires:

```text
productionReady=true
readinessPercent=100
blockedCount=0
status=TIGER_SOVEREIGN_READINESS_100
```

## 6. Failure and Rollback Rules

Any failed mandatory gate stops forward promotion.

Examples:

- failed CI → return to code-level remediation;
- failed browser acceptance → fix canonical UI/runtime path and revalidate affected gates;
- failed RLS/authorization test → block staging promotion;
- failed backup restore → block production;
- failed owner Step-Up → no L4 action;
- changed release bytes after evidence capture → invalidate affected evidence and regenerate Release DNA;
- post-deploy failure → execute rollback and keep production activation status unverified until recovery evidence is complete.

No average score can compensate for a failed mandatory gate.

## 7. Test Strategy

Use layered verification:

1. deterministic unit/contract tests;
2. repository quality/security gates;
3. migration/static security review;
4. isolated staging runtime tests;
5. adversarial/security tests;
6. real browser/device manual acceptance;
7. backup/restore and incident drills;
8. production post-deploy verification.

Every claimed PASS must identify its evidence class, environment, release identity and verification time.

## 8. Scope Control

During Launch Closure:

Allowed:
- fixes required to close mandatory gates;
- observability/recovery/security improvements needed for launch;
- minimal compatibility fixes;
- evidence collection and release tooling.

Not allowed without a new explicit owner decision:
- unrelated product features;
- new AI agent families;
- speculative redesigns;
- architectural framework migration;
- autonomous expansion of production permissions.

## 9. Definition of Done

The launch closure is complete only when:

- all mandatory core and AI readiness gates have real PASS evidence;
- all required manual and staging evidence exists;
- no P0/P1 security defect is open;
- backup/restore and rollback drills are proven;
- legal/privacy launch review is closed;
- monitoring and alerting are verified;
- the three independent owner approvals are recorded for the exact release;
- production promotion and post-deploy verification pass;
- readiness truth engine returns the canonical 100% state.

Until then the correct status remains:

```text
TIGER_SOVEREIGN_READINESS_BLOCKED
```
