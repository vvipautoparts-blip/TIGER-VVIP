# VVIP TIGER — BLACKBOX Trust Fabric Design

Status: **Approved design baseline / implementation not yet authorized beyond AI-01 gates**
Date: **2026-08-07**
Branch: **`feat/ai-01-foundation`**

## 1. Purpose

BLACKBOX Trust Fabric is the mandatory trust, authorization, governance, evidence, and controlled-execution layer for all AI capabilities in VVIP TIGER.

The AI model, prompt, browser, and individual agent are never sources of authority. Authority is granted only by server-side policy and short-lived capabilities issued by BLACKBOX.

Core rule:

```text
NO BLACKBOX AUTHORIZATION = NO AI ACTION
```

## 2. Architectural principles

1. **Intelligence is probabilistic; authority is deterministic; execution is verifiable.**
2. **Fail closed by default.** Unknown, malformed, unmapped, expired, or ambiguous actions are denied.
3. **AI recommendation is not authorization and authorization is not proof of execution.**
4. **No browser-controlled owner approval.** Client values such as `ownerApproved=true` are never trusted as authorization evidence.
5. **No permanent broad AI authority.** Tools are invoked through short-lived, scoped capability leases.
6. **No autonomous irreversible writes.** Any write without a safe rollback is promoted to L4 or permanently denied.
7. **Country and data-scope isolation are enforced before data reaches a model.**
8. **The core platform must remain usable when AI is degraded or disabled.**

## 3. Seven-plane architecture

### 3.1 Identity & Control Plane

Responsibilities:

- Owner, user, staff, service, and agent identity.
- Trusted server-side role verification.
- Country, sector, tenant, and session scope.
- Agent enable/disable state.
- Global, country, agent, provider, and tool kill switches.
- Step-up authentication for sensitive approvals.

Each agent has an identity record containing agent ID, version, owner, allowed countries, allowed data classes, allowed tools, maximum risk, maximum cost, maximum delegation, certification status, and expiry.

### 3.2 Constitutional Policy Kernel

The TIGER AI Constitution is policy-as-code and is independent of model prompts.

Permanent rules include:

- No autonomous money movement.
- No autonomous owner-permission mutation.
- No autonomous privilege escalation.
- No force push.
- No direct push to `main`.
- No autonomous production deployment.
- No autonomous production database migration.
- No arbitrary shell execution.
- No access to secrets or `.env` values.
- No cross-country or cross-tenant scope expansion.
- No L4 execution without valid human authorization.
- Retrieved documents, listings, logs, issues, and external content are untrusted data, never trusted system instructions.
- Unknown actions are denied.
- Policy-engine failure is fail-closed.

### 3.3 Intelligence & Agent Runtime

Initial approved agents remain:

- `general_manager`
- `technical_manager`
- `financial_analytics_manager`
- `user_assistant`

The General Manager coordinates and summarizes but never inherits specialist permissions.

The Technical Manager may analyze engineering state, run approved checks, prepare patches, create branches/commits within scoped workflows, and prepare Draft PRs. It may not merge, force push, change branch protection, deploy production, change secrets, or perform autonomous production migrations.

The Financial & Analytics Manager may read approved financial/analytics sources, calculate scenarios, detect anomalies, forecast, and recommend changes. It may never move money.

The User Assistant is isolated to user-scope content and listing assistance and must not access owner, staff, internal finance, internal engineering, or audit data.

### 3.4 Secure Data Intelligence Plane

Models do not receive raw database access.

Data flow:

```text
Agent -> Data Query Contract -> Permission Engine -> Read Adapter -> Redaction -> Scope Filter -> Minimal Data
```

Each adapter declares data owner, classification, country, sector, tenant, purpose, allowed fields, masked fields, retention, provider eligibility, result-size limits, freshness, and source version.

RAG evidence must carry source ID, document ID, document version, classification, country/sector scope, effective dates, freshness, checksum, and access policy.

### 3.5 Capability Execution Broker

Tool access is granted through a short-lived one-time capability lease, not a permanent blanket permission.

A capability lease binds:

- agent
- action
- target resource
- environment
- country/sector scope
- maximum affected objects/files
- risk class
- execution count
- expiry
- policy version
- tool version

Rule:

```text
NO CAPABILITY LEASE = NO TOOL EXECUTION
```

### 3.6 Evidence & Audit Plane

Every material AI action receives an Action Passport containing correlation ID, actor, agent/version, intent, scope, sources, tool/version, model/version, prompt version, policy version, risk class, capability ID, approval ID, payload digest, simulation ID, rollback ID, budget use, execution result, and verification result.

The evidence graph links:

```text
Request -> Sources -> Facts -> Policy -> Agent -> Model -> Recommendation -> Simulation -> Approval -> Capability -> Tool -> Execution -> Verification -> Outcome
```

Audit protection uses layered controls rather than relying on RLS alone:

1. RLS and restrictive privileges.
2. No app-role update/delete permissions on immutable evidence.
3. Database immutability guards.
4. Signed external checkpoints / integrity roots.

The final ledger design must be concurrency-safe; a naïve global `SELECT last_hash` then `INSERT` chain is not sufficient for concurrent production writes.

### 3.7 Operations, FinOps & Certification Plane

Provides:

- traces, metrics, logs, alerts, and correlation IDs
- cost by agent/user/country/feature/model/provider
- daily/monthly budgets and hard stops
- risk budgets
- agent certification lifecycle
- quarantine
- shadow mode
- incident response
- controlled rollout

## 4. Risk classes

### L1 — Read / Analyze

Read-only, scope-limited operations. No mutation.

### L2 — Reversible Low Risk

Low-impact, reversible actions requiring schema validation, idempotency, audit, and scope enforcement.

### L3 — Controlled Write

Isolated non-production or tightly bounded writes. Requires capability lease, risk budget, audit, rollback, and verification.

### L4 — High Impact

Sensitive pricing, country activation, production release authorization, major policy changes, significant data configuration, or other high-impact actions.

L4 workflow:

```text
PREPARE -> SIMULATE -> RISK ASSESSMENT -> HUMAN REVIEW -> APPROVE/REJECT -> COMMIT -> VERIFY -> RECEIPT
```

## 5. Action Escrow

Sensitive actions enter `ACTION_ESCROW` before execution. The escrow stores the before state, proposed state, semantic diff, affected scope, estimated impact, risk, rollback plan, expiry, and payload digest.

Approval is bound to the exact action envelope. A changed payload, scope, policy version, action, tool, actor, agent, or expiry invalidates the authorization.

## 6. Approval protocol

Approval payloads must use deterministic canonical serialization before hashing.

Approval envelope fields include:

- approval ID
- owner ID
- agent ID
- action ID
- canonical payload digest
- scope digest
- policy version
- tool version
- country
- expiry
- nonce
- maximum execution count = 1
- signature / trusted authorization proof

Approval lifecycle:

```text
DRAFT
PENDING_REVIEW
APPROVED
CLAIMED
EXECUTING
SUCCEEDED
FAILED
REJECTED
EXPIRED
REVOKED
COMPENSATING
COMPENSATED
```

Execution claiming and idempotency must prevent replay and concurrent double-use.

## 7. Reversible-by-design requirement

Any L2/L3 write requires:

- previous state
- proposed state
- change set
- version check
- idempotency key
- rollback operation
- rollback validity window
- post-execution verification

Rule:

```text
NO SAFE ROLLBACK = NO AUTONOMOUS WRITE
```

## 8. Digital Twin

High-impact changes are simulated against a controlled state snapshot before approval.

The Digital Twin supports pricing, country configuration, policy changes, financial scenarios, migrations, feature activation, model changes, prompt changes, and new tools.

Simulation output must report affected resources, estimated impact, conflicts, cost, risk, rollback viability, and verification criteria.

## 9. Agent-to-agent contract

Agent delegation uses a structured contract containing delegation ID, source agent, destination agent, task, scope, data class, allowed output, execution permission, maximum hops, maximum tokens, maximum cost, and expiry.

Default:

```text
execution_allowed = false
```

General delegation depth is capped unless a reviewed workflow explicitly allows more.

## 10. Prompt-injection security objective

The acceptance objective is not "block 100% of prompt injection text." The enforceable objective is:

> Untrusted content may influence text, but it must never expand authority.

Prompt injection must never create extra tool rights, extra data scope, owner identity, L4 approval, secrets access, production access, or financial authority.

## 11. Risk Economy

Each agent has independent limits for financial risk, data risk, change risk, user impact, geographic impact, tool calls, compute cost, token budget, writes, PRs, and error budget.

When a risk budget is exhausted, the agent automatically degrades to approval-required or read-only state.

## 12. Decision Readiness

Decision readiness is based on data quality, freshness, evidence coverage, policy fit, scope validity, simulation result, reversibility, risk exposure, and approval state.

Allowed statuses:

- `READY`
- `READY_WITH_REVIEW`
- `NEEDS_MORE_DATA`
- `CONFLICTING_EVIDENCE`
- `SIMULATION_FAILED`
- `POLICY_CONFLICT`
- `APPROVAL_REQUIRED`
- `DENY`

Model confidence alone is never an authorization signal.

## 13. Agent lifecycle

Activation lifecycle:

```text
OFF -> OBSERVE -> SHADOW -> ADVISORY -> LIMITED_ACTION -> CONTROLLED_RUNTIME
```

Certification states:

- `CERTIFIED`
- `CONDITIONAL`
- `EXPIRED`
- `SUSPENDED`
- `QUARANTINED`
- `REVOKED`

Material changes to model, prompt, tool, policy, permissions, adapter, country package, or sensitive dependencies trigger re-evaluation.

## 14. Country activation

AI activation is certified per country, not enabled by one global feature flag alone.

Each country package includes legal rules, tax/currency context, language, data/residency constraints, allowed models/providers, payment boundaries, disclosures, escalation, localized prompts, evaluation data, country red-team coverage, country kill switch, and owner approval.

Country states:

```text
DRAFT -> READY_FOR_REVIEW -> CERTIFIED -> ACTIVE -> SUSPENDED / REVOKED
```

## 15. Business continuity

AI failure must not take down core VVIP TIGER functionality.

Degradation path:

```text
NORMAL -> RESTRICTED -> READ_ONLY -> AI_DISABLED
```

Failures must not expand privilege.

## 16. Verification and Definition of Done

No AI milestone is `DONE` without evidence.

Evidence packages include relevant automated tests, RLS/isolation tests, replay tests, concurrency tests, approval-tamper tests, audit-integrity tests, backup/restore evidence where applicable, CI results, BLACKBOX result, and recorded owner approval.

P0 and P1 findings must be zero at production release gates.

## 17. Delivery roadmap

1. **AI-00 — Constitution Freeze**
2. **AI-01 — Owner Control Closure**
3. **AI-02 — Identity + Secure Gateway**
4. **AI-03 — Persistence & Governance DB**
5. **AI-04 — Data Adapters + Permission-Aware RAG**
6. **AI-05 — Read-Only Agent Runtime**
7. **AI-06 — Capability & Tool Broker**
8. **AI-07 — Digital Twin**
9. **AI-08 — Evidence Fabric**
10. **AI-09 — Security / Red Team / Chaos**
11. **AI-10 — Observability & FinOps**
12. **AI-11 — Staging + Disaster Recovery**
13. **AI-12 — Shadow Mode**
14. **AI-13 — Owner-Only Pilot**
15. **AI-14 — Limited User Assistant**
16. **AI-15 — Controlled L2/L3**
17. **AI-16 — Country Certification**
18. **AI-17 — Controlled Production Rollout**

## 18. Current repository gate

PR #137 remains Draft until AI-01 closes. The existing AI-01 branch deliberately contains no live external LLM integration, production executor, money movement, destructive executor, production database migration, or persistent AI approval/audit runtime.

Before merge, AI-01 requires at minimum:

- focused manual browser smoke of the owner-control AI panel
- no JavaScript console failures or layout/RTL regression
- prompt input remains disabled
- feature flag does not enable live AI execution
- BLACKBOX review result = PASS
- P0 = 0 and P1 = 0
- GitHub Actions passing on the final head
- explicit owner approval

## 19. Implementation boundary for the next slice

The next implementation work after AI-01 closure is **AI-02 Identity + Secure Gateway**. It must be delivered as a separate reviewed slice and must not introduce autonomous production or financial execution.

This design is the authoritative baseline for subsequent BLACKBOX implementation plans unless explicitly superseded by an approved architecture decision record.
