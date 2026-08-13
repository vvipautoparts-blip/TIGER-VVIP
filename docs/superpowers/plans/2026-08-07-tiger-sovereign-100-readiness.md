# TIGER SOVEREIGN 100% Readiness Implementation Plan

Status: **active modernization plan**
Modern baseline: `main` after AI-01 merge `07e410d312c819c44ec24f2cceb390ccc688cda3`
Rule: **NO EVIDENCE -> NO VERIFIED CLAIM -> NO RELEASE AUTHORITY**

## Goal

Build TIGER SOVEREIGN from the merged AI-01 owner/control foundation into a production-grade, zero-trust, auditable, human-governed AI operating system. Repository implementation alone never equals production readiness. Every sensitive runtime, database, provider, legal, operational, manual, and owner gate must have fresh evidence.

## Product principle

The security architecture may be sophisticated internally, but the product surface remains **VIP / minimal / calm / uncluttered**. New AI/security layers must not create unnecessary public UI controls, duplicated journeys, or visual noise.

## Global constraints

- `main` remains protected; work is isolated in feature branches and reviewed PRs.
- AI execution is disabled by default unless an environment-specific release gate explicitly enables it.
- Browser/client values never create trusted owner identity or L4 authority.
- `delete_data`, `transfer_funds`, and `change_owner_permissions` are permanent AI executor denials.
- Merge, production deploy, and price mutation are L4 owner-gated.
- L4 `ALLOW` requires trusted verification and one-time consumption in the same authorization boundary.
- AI-02 in-memory consumption is not sufficient for production; AI-03 must provide persistent transactional consumption.
- Production Supabase mutation uses the existing protected promotion path only.
- Secrets never enter browser JavaScript, prompts, user-visible responses, or unrestricted logs.
- Untrusted user/retrieved/tool content never overrides policy/system authority.
- External tools are registry-owned, schema validated, scoped, bounded, audited, and idempotent where mutating.
- No claim of 100% readiness without manual browser acceptance, security review, staging, recovery, monitoring, legal/privacy, and explicit owner gates.

---

## Task 1 — AI-02 Sovereign Security Kernel

**Modern PR:** #218
**Files:**
- `scripts/ai/sovereign-security-kernel.js`
- `tests/ai02-sovereign-security-kernel.test.cjs`
- `docs/ai/TIGER_SOVEREIGN_CONSTITUTION.md`
- this plan

### Contract

- trusted in-process server actor branding; caller-shaped identity fails closed;
- canonical SHA-256 payload binding;
- trusted L4 approval envelopes;
- exact owner/agent/action/payload/time binding;
- synchronous verify + one-time consume before L4 `ALLOW`;
- replay denial;
- permanent denial for destructive/money/owner-authority actions;
- agent action scope;
- registry-only tools;
- budget/rate gates;
- kill switches;
- strict Black Box metadata projection;
- no network/provider/database executor.

### TDD status

- [x] RED contract committed before production implementation.
- [x] RED VVIP Quality Gate #862 failed as expected with kernel absent.
- [x] Minimal modern kernel implemented.
- [x] GREEN VVIP Quality Gate #863 passed on code head.
- [ ] Final documentation-inclusive exact-head CI must pass.
- [ ] Independent PR review / repository protection must pass.
- [ ] Explicit owner merge authorization on the exact final head.

### AI-02 non-claims

- no persistent cross-process approval state;
- no Supabase trust tables/RLS;
- no provider/model gateway;
- no live tool executor;
- no production deployment;
- no money movement;
- no destructive runtime;
- no production-readiness claim.

---

## Task 2 — AI-03 Persistent Trust Fabric

**Modernization strategy:** do not merge stale stacked PR history. Extract and revalidate only AI-03-specific value onto the then-current `main`.

Required capabilities:

- persistent `ai_approval_requests`;
- one-time transactional approval consumption under row locking;
- append-only `ai_audit_events`;
- usage/cost ledger;
- prompt/version registry;
- agent runtime state and kill switches;
- least-privilege RLS;
- browser denial for privileged writes;
- exact migration content review and rollback plan.

Gates:

- [ ] RED migration/RLS contract tests first.
- [ ] Dangerous-SQL/security review.
- [ ] Full repository CI.
- [ ] Isolated local/non-production migration rehearsal.
- [ ] Real RLS/privilege probes.
- [ ] Separate owner approval before any remote database promotion.

---

## Task 3 — AI-04 Secure Model Gateway

Required capabilities:

- protected server-side inference boundary;
- provider-neutral contract;
- current OpenAI adapter only behind server secrets when explicitly configured;
- strict structured outputs;
- verified server identity;
- model/prompt version binding;
- request size/token/cost/time ceilings;
- circuit breaker and bounded retry;
- no model-controlled tool execution.

Gates:

- [ ] TDD contracts for auth, size, timeout, provider outage, malformed output, redaction, and zero direct tool execution.
- [ ] Non-production provider configuration only.
- [ ] Live provider smoke in staging only after explicit authorization.

---

## Task 4 — AI-05 Tool Execution Gateway

Required capabilities:

- central server-owned tool registry;
- tool id, agent scope, action level, schema, mutability, idempotency, timeout, audit class;
- unknown/model-invented tools fail closed;
- argument-smuggling and cross-agent privilege tests;
- L4 tools require persistent one-time approval from AI-03.

No arbitrary shell executor is permitted.

---

## Task 5 — AI-06 Boardroom Orchestration

Four approved primary roles remain:

- AI General Manager
- AI Technical Manager
- AI Financial & Analytics Manager
- AI User Assistant

Required controls:

- bounded delegation depth/hops/tool calls/tokens/cost/time;
- no privilege elevation through handoff;
- cycle detection;
- evidence/confidence semantics;
- correlated handoff audit.

---

## Task 6 — AI-07 Scoped Evidence/Data Plane

Required read-only evidence adapters:

- platform analytics;
- finance projections;
- listings/users with scope projection;
- engineering/GitHub health;
- country configuration.

Every fact must carry source, freshness, jurisdiction/scope, and confidence. Raw credentials and unrestricted rows never enter model context.

---

## Task 7 — AI-08 TIGER Mirror + Decision Passport

For configured sensitive decisions:

- deterministic simulation;
- worst/base/best scenarios;
- explicit assumptions and evidence set;
- proposal digest and simulation version;
- risks and rollback;
- immutable Decision Passport;
- simulation never represented as production truth.

---

## Task 8 — AI-09 Missions / Predict / Evolution / Shadow / Trust

Controls:

- missions cannot silently broaden scope;
- Predict warns but does not autonomously perform destructive remediation;
- Evolution may prepare branch/patch/test/PR proposals only within Technical Manager scope;
- Shadow AI never executes;
- Trust Score may automatically reduce/suspend autonomy, never increase authority without owner approval.

---

## Task 9 — AI-10 Security / Evals / Operations

Required evidence:

- prompt/indirect injection corpus;
- secret exfiltration probes;
- SSRF/XSS/schema-smuggling/replay/forged-owner tests;
- cross-country/user/agent isolation tests;
- groundedness/refusal/tool-selection evals;
- sanitized observability;
- cost/error/authorization alerts;
- kill-switch runbook;
- provider outage mode;
- incident response evidence.

---

## Task 10 — AI-11 Production Readiness Truth Gate

A machine-evaluated readiness state must distinguish:

- `VERIFIED`
- `DESIGNED`
- `PENDING`
- `STALE`
- `BLOCKED`

No average score or narrative can convert missing external evidence into 100% readiness.

Required external gates include:

- manual desktop/mobile/RTL/LTR/accessibility acceptance;
- independent security/BLACKBOX review;
- real staging identity/provider/model evidence;
- live scoped evidence adapters and reviewed tools;
- load/performance evidence;
- backup/restore and rollback drills;
- privacy/legal/data-retention/provider-processing review;
- historical credential remediation where applicable;
- explicit owner merge approval;
- separate owner DB-promotion approval;
- separate owner production-activation approval;
- post-deploy smoke/monitoring/backup verification.

---

## Tasks 11+ — Runtime atomicity, proof, provenance, dossier, owner step-up

Existing stale stacked PRs contain useful designs for later layers (atomic persistence, proof system, cryptographic attestation, master dossier, trusted provenance, phishing-resistant owner step-up). They are **reference material only** until each slice is re-extracted onto current `main`, threat-reviewed, TDD-reimplemented where needed, and independently reverified.

No stale stacked PR is merge-authorized merely because its historical CI was green.

## Definition of Done

`TIGER_SOVEREIGN_READINESS=100%` may be emitted only when the canonical readiness engine has fresh accepted evidence for every required repository, manual, staging, security, legal/privacy, recovery, monitoring, and owner gate, with:

```text
productionReady=true
readinessPercent=100
blockedCount=0
```

Until then the only correct production truth is:

```text
TIGER_SOVEREIGN_READINESS_BLOCKED
```
