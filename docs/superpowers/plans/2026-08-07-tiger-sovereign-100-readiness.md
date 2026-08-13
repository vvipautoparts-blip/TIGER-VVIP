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
- Browser/client values never create trusted owner identity, trusted runtime state, or L4 authority.
- Management agents are owner-only; ordinary users and staff are contained to `user_assistant`.
- `delete_data`, `transfer_funds`, and `change_owner_permissions` are permanent AI executor denials.
- Merge, production deploy, and price mutation are L4 owner-gated.
- L4 `ALLOW` requires trusted verification and one-time consumption in the same authorization boundary.
- AI-02 in-process consumption is not sufficient for production; AI-03 must provide persistent transactional consumption.
- Production Supabase mutation uses the existing protected promotion path only.
- Secrets never enter browser JavaScript, prompts, user-visible responses, or unrestricted logs.
- Untrusted user/retrieved/tool content never overrides policy/system authority.
- External tools are registry-owned, exact-action-bound, schema validated, scoped, bounded, audited, and idempotent where mutating.
- No claim of 100% readiness without manual browser acceptance, security review, staging, recovery, monitoring, legal/privacy, and explicit owner gates.

---

## Task 1 — AI-02 Sovereign Security Kernel

**Modern PR:** #218

**Files:**
- `scripts/ai/sovereign-security-kernel.js`
- `tests/ai02-sovereign-security-kernel.test.cjs`
- `tests/ai02-tool-action-binding.test.cjs`
- `tests/ai02-invalid-payload-fail-closed.test.cjs`
- `docs/ai/TIGER_SOVEREIGN_CONSTITUTION.md`
- this plan

### Final contract

- `createSovereignSecurityKernel()` creates isolated `authority` and `runtime` capabilities;
- no global export can directly mint trusted actors, mint approvals, consume approvals, or invoke the internal authorization evaluator;
- trusted actors and trusted runtime state are branded per kernel instance;
- cross-kernel or JSON-copied actor/runtime/approval objects fail closed;
- management agents require trusted owner role;
- `STAFF` and `USER` are contained to `user_assistant`;
- canonical SHA-256 payload binding;
- malformed L4 payloads return `DENY / INVALID_PAYLOAD` rather than crashing authorization;
- L4 approval issuance requires a trusted owner from the same kernel;
- exact owner/agent/action/payload/time binding;
- verification and private one-time consumption occur before L4 `ALLOW`;
- caller cannot supply or reset replay-consumption state;
- tool authorization binds exact agent + action + policy level;
- replay, forged/copy approval, scope mismatch, owner mismatch, payload drift, and expiry fail closed;
- permanent denial for destructive/money/owner-authority actions;
- trusted feature/kill-switch/budget/rate state;
- strict Black Box metadata projection;
- no network/provider/database executor.

### TDD evidence

#### Cycle 1 — kernel existence and baseline zero trust
- [x] RED commit `ddbbcb27a08ac2049ee0ffc25a1e6576f0a790fd`.
- [x] VVIP Quality Gate #862: expected FAIL with kernel absent.
- [x] Initial implementation commit `a95ddd1ace0eae66832125071dc301177ee09b18`.
- [x] VVIP Quality Gate #863: PASS.

#### Cycle 2 — Tool → Action / Level binding
- [x] RED commit `01486e763161cc5671f2ae887ebc044c1ed7589f`.
- [x] VVIP Quality Gate #866: expected FAIL.
- [x] Exact tool/action/level binding implemented.
- [x] Exact-head candidate `14f079618747169b1756cd5282c3392299224b42` passed Quality #869, V14 #327, CleanGuard #391, Dependency Review #675, Project Control #800, and CodeQL #774 before later hardening changed the head.

#### Cycle 3 — capability-scoped trust isolation
- [x] RED test head `5125f7cf202001192dc998b488b76f464e5851d6`.
- [x] VVIP Quality Gate #871: expected FAIL because capability factory did not yet exist.
- [x] Capability-scoped kernel implementation `2defe198a7c3797cf64c32eaac3b14769f6b791b`.
- [x] VVIP Quality Gate #872 core quality step: PASS.

#### Cycle 4 — malformed authorization payload fail-closed
- [x] RED commit `8bc49f6a6aa520de317fcd1cfdd3ce0b75de3589`.
- [x] VVIP Quality Gate #873: expected FAIL on cyclic/undefined L4 payload exceptions.
- [x] Fail-closed implementation `beaba668c3aecf6710346cd97082a6bf67afc68c`.
- [x] VVIP Quality Gate #874 core quality step: PASS.

### Final AI-02 closure gates

Because documentation changed after the code GREEN head, all required workflows must run again on the final documentation-inclusive SHA.

- [ ] VVIP Quality Gate exact-final-head PASS.
- [ ] V14 Release Candidate exact-final-head PASS.
- [ ] TIGER CleanGuard exact-final-head PASS.
- [ ] Dependency Review exact-final-head PASS.
- [ ] Project Control Integrity exact-final-head PASS.
- [ ] CodeQL exact-final-head PASS.
- [ ] Independent human PR review approved with no unresolved security thread.
- [ ] Explicit owner merge authorization bound to the exact final SHA.

### AI-02 non-claims

- no persistent cross-process approval state;
- no Supabase trust tables/RLS applied;
- no provider/model gateway;
- no live tool executor;
- no production deployment;
- no money movement;
- no destructive runtime;
- no production-readiness claim.

---

## Task 2 — AI-03 Persistent Trust Fabric

**Modernization strategy:** build a fresh modern slice stacked only on the final AI-02 branch while AI-02 awaits human review. Do not merge AI-03 ahead of AI-02. After AI-02 merges, retarget/rebase the modern AI-03 PR onto the new `main` and re-run exact-head evidence.

Required capabilities:

- persistent `ai_approval_requests`;
- one-time transactional approval consumption under row locking;
- append-only `ai_audit_events`;
- usage/cost ledger;
- prompt/version registry;
- agent runtime state and kill switches;
- least-privilege RLS;
- browser denial for privileged writes;
- exact migration content review and rollback plan;
- exact content-addressed migration SHA assertion, not merely a 64-character hash-format check.

Gates:

- [ ] RED migration/RLS contract tests first.
- [ ] RED exact-review-hash contract first.
- [ ] Dangerous-SQL/security review.
- [ ] Full repository CI.
- [ ] Isolated local/non-production migration rehearsal.
- [ ] Real RLS/privilege probes.
- [ ] Concurrent approval-consumption race test against PostgreSQL/Supabase.
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
