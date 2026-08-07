# TIGER SOVEREIGN 100% Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build TIGER SOVEREIGN from the AI-01 browser-only foundation into a production-grade, zero-trust, auditable, human-governed agentic operating system that can be considered launch-ready only after every automated, manual, staging, security, legal, operational, and owner gate is evidenced.

**Architecture:** Use a server-side Sovereign Security Kernel as the mandatory control plane in front of all model and tool execution. Separate policy/identity/approval/audit/cost/rate controls from model orchestration, then add specialist agents, Digital Twin simulation, Decision Passport, Missions, Predict, Evolution, Shadow AI and Trust Score as independently testable layers. Production-sensitive actions remain impossible without trusted server-side owner authorization and one-time payload-bound approval.

**Tech Stack:** Existing static VVIP TIGER web app, Node CommonJS contract tests, Supabase Edge Functions (Deno/TypeScript), Supabase/PostgreSQL + RLS, existing Clerk identity flow, GitHub Actions quality gate, provider-neutral model gateway with OpenAI Agents/Responses integration only behind server-side secrets, JSON-schema/strict structured outputs, append-only audit controls.

## Global Constraints

- `main` remains protected; implementation uses feature branches and reviewed PRs.
- AI is disabled by default until its environment-specific release gate is satisfied.
- No browser value can represent trusted L4 owner approval.
- `delete_data`, `transfer_funds`, and `change_owner_permissions` remain permanently denied AI executor capabilities.
- Merge, production deploy, and price mutation remain L4 owner-gated.
- Production Supabase mutation requires the existing local → preview → BLACKBOX → GitHub Actions → Owner approval pipeline.
- Never expose service-role, provider, database-password, signing, or other server secrets to browser JavaScript.
- Untrusted user/retrieved/tool content never overrides policy/system instructions.
- Every external tool call is schema validated, scoped, rate/cost bounded, audited, and idempotent where mutating.
- No claim of 100% readiness without fresh evidence for automated tests, manual browser acceptance, security review, staging, backup/restore, incident response, legal/privacy, monitoring/alerts, and owner production approval.

---

### Task 1: AI-02 Sovereign Security Kernel

**Files:**
- Create: `scripts/ai/sovereign-security-kernel.js`
- Create: `tests/ai-sovereign-security-kernel.test.cjs`
- Create: `docs/ai/TIGER_SOVEREIGN_CONSTITUTION.md`

**Interfaces:**
- Consumes: AI-01 action and role taxonomy conceptually; no trusted authorization from the browser.
- Produces: `evaluateSovereignRequest()`, `createPayloadDigest()`, `verifyApprovalEnvelope()`, `consumeApproval()`, `createBlackBoxEvent()`, `applyBudgetGate()`, `applyRateGate()`.

- [ ] **Step 1: Write failing contract tests** for fail-closed identity, scope, permanent deny, L4 approval binding/expiry/replay, tool allowlisting, budget/rate/kill switches, and audit redaction.
- [ ] **Step 2: Run repository quality gate** and record RED evidence caused only by the missing kernel.
- [ ] **Step 3: Implement minimal deterministic kernel** with no network or provider calls.
- [ ] **Step 4: Run full quality gate** and require PASS.
- [ ] **Step 5: Commit and open stacked Draft PR** targeting AI-01 until AI-01 is merged.

### Task 2: AI-03 Persistent Trust Fabric

**Files:**
- Create: `supabase/migrations/<timestamp>_tiger_sovereign_trust_fabric.sql`
- Create: `tests/ai-sovereign-trust-fabric.test.cjs`
- Create: `docs/ai/TIGER_SOVEREIGN_TRUST_FABRIC.md`

**Interfaces:**
- Produces persistent `ai_approval_requests`, `ai_audit_events`, `ai_usage_ledger`, `ai_prompt_versions`, `ai_agent_runtime_state`, and append-only/RLS contracts.

- [ ] Write RED migration/RLS contract tests.
- [ ] Define immutable approval payload digests, one-time consumption, expiry, owner identity binding, idempotency, and append-only audit semantics.
- [ ] Add least-privilege RLS with browser denial for privileged writes.
- [ ] Run dangerous-SQL and full quality gate.
- [ ] Apply only to non-production preview after explicit owner-approved migration step; production remains blocked until later gate.

### Task 3: AI-04 Secure Model Gateway

**Files:**
- Create: `supabase/functions/tiger-sovereign-ai/index.ts`
- Create: `scripts/ai/sovereign-model-contract.js`
- Create: `tests/ai-sovereign-model-gateway.test.cjs`

**Interfaces:**
- Consumes verified identity, policy decision, budget/rate gates, provider secret from server environment.
- Produces strict structured response envelopes; never emits provider secrets or raw internal policy.

- [ ] Add contract tests for auth required, size limits, schema allowlist, timeout/cancellation, provider outage, malformed model output, redaction, and no direct tool execution.
- [ ] Implement provider-neutral gateway with OpenAI adapter boundary server-side only.
- [ ] Require explicit model/prompt version and request correlation ID.
- [ ] Add circuit breaker, bounded retry, token/cost ceiling, and kill switch.
- [ ] Verify full quality gate and non-production smoke.

### Task 4: AI-05 Tool Execution Gateway

**Files:**
- Create: `scripts/ai/sovereign-tool-registry.js`
- Create: `tests/ai-sovereign-tool-registry.test.cjs`

**Interfaces:**
- Produces central registry fields: tool id, agents, level, scopes, schema, approval requirement, mutability, idempotency, timeout, audit class.

- [ ] Test unknown tools fail closed and untrusted content cannot create tool definitions.
- [ ] Add pre-execution and post-execution guard contracts.
- [ ] Require one-time L4 approval for every sensitive mutating tool.
- [ ] Add replay protection and deterministic result projection.
- [ ] Run red-team contract fixtures for argument smuggling and cross-agent privilege escalation.

### Task 5: AI-06 Boardroom Orchestration

**Files:**
- Create: `scripts/ai/sovereign-boardroom.js`
- Create: `tests/ai-sovereign-boardroom.test.cjs`

**Interfaces:**
- Agents: General Manager, Technical Manager, Financial & Analytics Manager, User Assistant first; later specialists register through the same governance interface.

- [ ] Bound delegation depth, agent hops, total tool calls, tokens, elapsed time, and cost.
- [ ] Preserve specialist scope on handoff; General Manager cannot elevate privilege.
- [ ] Emit evidence/confidence/insufficient-evidence status.
- [ ] Detect cyclic delegation and cascading failure.
- [ ] Trace every handoff and tool call with correlation IDs.

### Task 6: AI-07 Live Read-Only Data Adapters

**Files:**
- Create isolated adapters for platform analytics, finance, listings/users, engineering/GitHub health, and country configuration.
- Create adapter contract tests.

- [ ] Apply server-side field projection and country/user scope before model context construction.
- [ ] Mark source, freshness, jurisdiction, and confidence for every fact.
- [ ] Refuse financial recommendations on stale/incomplete required inputs.
- [ ] Do not expose raw credentials, private auth artifacts, or unrestricted database rows.

### Task 7: AI-08 TIGER Mirror + Decision Passport

**Files:**
- Create simulation domain module, deterministic scenario schemas, decision passport generator, and tests.

- [ ] Enforce `No Simulation → No Sensitive Change` for configured decision classes.
- [ ] Produce worst/base/best scenarios with explicit assumptions.
- [ ] Bind passport to proposal digest, evidence set, simulation version, risks, rollback, approvals, and final outcome.
- [ ] Prevent simulation output from being treated as real production state.

### Task 8: AI-09 Missions, Predict, Evolution, Shadow AI, Trust Score

- [ ] Missions use bounded goals/metrics and cannot silently broaden scope.
- [ ] Predict emits early warnings with thresholds and evidence, never autonomous destructive remediation.
- [ ] Evolution may propose branch/patch/test/PR only within Technical Manager scope.
- [ ] Shadow mode records recommendations without execution until evidence threshold is met.
- [ ] Trust Score is evidence-based, versioned, resistant to gaming, and can only reduce autonomy automatically; autonomy increases require owner approval.

### Task 9: AI-10 Security/Evals/Operations

- [ ] OWASP Agentic Top-10 threat-model coverage: goal hijacking, tool misuse, identity/privilege abuse, memory poisoning, insecure inter-agent communication, cascading failures, trust exploitation, rogue-agent behavior, and related current controls.
- [ ] Prompt-injection and indirect-injection corpus.
- [ ] Secret-exfiltration, SSRF, XSS, schema-smuggling, replay, forged-owner, cross-country, cross-user, and cross-agent tests.
- [ ] Deterministic eval suite for Arabic/English quality, groundedness, refusal correctness, cost, latency, and tool selection.
- [ ] Observability dashboards for request/error/latency/cost/policy-deny/approval/tool/provider health.
- [ ] Alerting, kill-switch runbook, provider outage mode, backup/restore, incident response, and audit integrity verification.

### Task 10: AI-11 Staging and Production Readiness Closure

- [ ] Non-production provider credentials and staged deployment only.
- [ ] Manual desktop/mobile/RTL/LTR/accessibility/browser acceptance.
- [ ] Owner-only pilot, then limited users, then gradual rollout.
- [ ] Legal/privacy/data-retention/provider-processing review per active country.
- [ ] Full secret-history inventory and rotation of any historically committed real secret.
- [ ] Production migration rehearsal, backup/restore evidence, rollback drill, monitoring and alert verification.
- [ ] Final BLACKBOX/security review with no open P0/P1.
- [ ] Fresh GitHub Actions/CodeQL/Dependency Review/Quality Gate evidence.
- [ ] Explicit owner go/no-go for merge, database promotion, and production activation.

## 100% Definition of Done

`TIGER_SOVEREIGN_READINESS=100%` may be declared only when every task above has concrete evidence and no required gate is marked pending, deferred, assumed, or simulated. Passing code tests alone is insufficient; production launch readiness requires verified environment, operational, security, privacy/legal, recovery, monitoring, manual acceptance, and owner-approval evidence.
