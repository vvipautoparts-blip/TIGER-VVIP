# VVIP TIGER — LEAN GLOBAL Cost Governor Design

Date: 2026-08-08
Status: APPROVED FOR NON-PRODUCTION IMPLEMENTATION
Base source: `73551218df2647e88ee801b86bdb97ed00bbf758`
Base branch: `feat/documentation-sovereign-knowledge-plane-20260808`
Implementation branch: `feat/lean-global-cost-governor-20260808`

## 1. Decision

VVIP TIGER will **not** restart from zero. Existing verified application, security, database, documentation, release-evidence, and launch-readiness work remains authoritative. Cost reduction is introduced as a stacked, reversible control layer.

The selected architecture is:

`PRESERVE -> MEASURE -> BUDGET -> OPTIMIZE -> LAUNCH SMALL -> SCALE BY DEMAND`

Rejected alternatives:

1. **Greenfield rewrite** — rejected because it duplicates engineering, QA, migration, and security cost and discards verified evidence.
2. **Large always-on production estate** — rejected because it pays for idle capacity before demand exists.
3. **Lean demand-driven architecture with hard cost controls** — selected because it preserves the codebase and allows capacity to grow only when justified by measured demand.

## 2. Non-negotiable boundaries

- `main` is not modified by this work.
- Production database is not mutated.
- Production Edge Functions are not deployed or changed.
- No paid cloud resource is created.
- No billing plan, payment method, provider subscription, or real charge is authorized.
- No secrets or provider credentials are added to source control.
- Existing security gates and fail-closed behavior are not weakened for cost savings.
- Existing Draft PR dependency order remains intact.
- Every cost optimization must be reversible and independently testable.

## 3. Target operating model

### 3.1 Static-first edge delivery

The browser application and immutable assets should be served from static hosting/CDN wherever possible. Requests that can be satisfied by cached static bytes must not wake database or server compute.

### 3.2 Direct object-storage media path

Media uploads should eventually use constrained direct-to-object-storage flows, signed or policy-bound as appropriate, instead of proxying large payloads through general-purpose application compute. Derivative generation should be asynchronous and demand-driven.

### 3.3 Database efficiency before database scale

Before increasing database tier/capacity, enforce indexes, bounded queries, pagination, connection discipline, and data-retention policies. Database scaling is evidence-triggered rather than pre-purchased.

### 3.4 AI Budget Governor

AI remains disabled/fail-closed by default where already required. When live AI is later authorized, requests must be constrained by per-environment and per-capability budgets, model allowlists, bounded token/output settings, cache/reuse rules, concurrency limits, and owner-controlled escalation. Expensive model usage must never be the default for routine work.

### 3.5 Zero-idle optional workers

Search indexing, media processing, reporting, non-urgent analytics, and similar asynchronous workloads should run only when work exists. Idle workers must not require permanently provisioned compute unless evidence proves it cheaper or necessary.

### 3.6 Bounded observability

Logs, traces, metrics, and evidence remain sufficient for security and release proof, but retention and sampling are explicit. Security/audit records are not silently truncated; high-volume diagnostic telemetry receives bounded retention appropriate to environment.

## 4. Cost-control plane

The first implementation slice is a repository-level **Lean Cost Governor**. It establishes policy before provider activation.

Canonical policy: `project-control/cost/lean-cost-policy.v1.json`

Required policy concepts:

- policy/schema version;
- currency and accounting unit;
- environments (`local`, `ci`, `staging`, `production`);
- monthly soft/hard budget ceilings;
- per-service categories (static delivery, database, object storage, edge/server compute, AI, observability, messaging/OTP);
- default state for optional high-cost services;
- approval class required to raise a hard limit;
- immutable production boundary statement;
- launch-mode resource principles;
- evidence requirements before scaling.

The policy is not a provider billing API and cannot create, resize, purchase, or deploy resources.

## 5. Enforcement

A deterministic validator must fail CI when the policy is malformed or unsafe. Minimum assertions:

- all numeric budgets are finite, non-negative integers in minor currency units;
- hard limit is never below soft limit;
- production hard-limit increases require the explicit owner approval class in policy;
- optional high-cost capabilities default disabled;
- no credential-like material appears in policy;
- production mutation remains forbidden in the initial phase;
- service categories are unique and bounded;
- every scaling rule requires measurable evidence rather than narrative readiness.

The validator emits machine-readable status only; it does not call any cloud provider.

## 6. Delivery phases

### COST-01 — Cost Governor Foundation

Implement canonical policy, validator, tests, and CI. No runtime/provider mutation.

### COST-02 — Static/CDN Optimization

Inventory static assets and caching behavior; eliminate accidental dynamic compute for static requests; validate service-worker/cache boundaries.

### COST-03 — Media Cost Path

Introduce direct object-storage design/runtime path with size/type/quota controls and asynchronous derivatives. Keep video disabled unless separately approved.

### COST-04 — Database Efficiency

Measure expensive query paths, enforce pagination/index/connection rules, and define data-lifecycle limits without weakening audit/security evidence.

### COST-05 — AI Cost Runtime

Bind live inference to the existing AI security/control plane and add per-capability cost budgets, model routing, cache/reuse, concurrency, and emergency disablement.

### COST-06 — Observability/Retention

Split security/audit evidence from high-volume diagnostics; enforce environment-specific retention and sampling.

### COST-07 — Launch Economics Gate

Before Production activation, require a cost evidence capsule containing projected baseline, measured staging usage, high-traffic scenario, unit-cost assumptions, hard-limit behavior, and owner approval for any production ceiling.

## 7. Data flow

Normal low-cost request path:

`Browser -> CDN/static cache -> response`

Dynamic path only when required:

`Browser -> authenticated boundary -> bounded API/RPC -> database/object store`

Optional asynchronous path:

`bounded request -> queue/event -> on-demand worker -> result/object -> CDN`

AI path after separate runtime authorization:

`request -> identity/authorization -> cost budget check -> safety/runtime gates -> selected model -> usage settlement -> audit`

A failed cost check must fail closed before external expensive work is initiated.

## 8. Error handling

- Invalid or missing cost policy: CI failure.
- Unknown service category: CI failure.
- Budget arithmetic overflow/non-finite value: CI failure.
- Hard-limit violation at runtime (future phase): reject/defer optional work before provider invocation.
- Security/audit requirement conflicting with cost optimization: security/audit wins; optimization must be redesigned.
- Provider unavailable: no automatic upgrade to a more expensive provider/tier without a separately authorized policy path.

## 9. Testing strategy

COST-01 follows TDD:

1. Commit failing contract tests for the missing policy/validator.
2. Implement policy and validator.
3. Verify focused tests.
4. Run repository Quality/Security gates on one exact SHA through GitHub Actions.

Later phases require focused RED/GREEN tests plus full exact-head verification.

## 10. Success criteria for COST-01

COST-01 is complete only when:

- canonical policy exists;
- validator exists and has no provider/network side effects;
- malformed/unsafe policies are rejected;
- valid launch policy passes;
- CI workflow is present and fail-closed;
- no Production mutation or paid resource creation occurs;
- branch remains isolated from `main` pending protected review;
- exact-head checks are recorded before any merge decision.

## 11. Current truth

This design reduces the probability of unnecessary infrastructure spend; it does **not** claim a specific future monthly bill until Staging measurements and provider pricing evidence are available. Cost claims remain evidence-based, just like security and release-readiness claims.
