# VVIP TIGER AI-01 — Control Plane Foundation

Status: implementation foundation, dry-run/read/propose only.
Production mutation: **forbidden** in AI-01.

## 1. Purpose

AI-01 creates a deny-by-default control plane for internal VVIP TIGER AI roles before any privileged automation is connected to production systems. It is intentionally independent of browser `localStorage` roles and does not carry privileged Supabase credentials.

## 2. Approved AI roles

| Agent | Initial responsibility | Initial authority |
| --- | --- | --- |
| AI General Manager | Cross-domain analysis, coordination and privileged-action requests | Read, propose, request gated L2/L3 actions |
| AI Technical Manager | Health, technical metrics and technical change proposals | Read, propose, request reversible/production changes |
| AI Financial & Analytics Manager | Analytics, financial analysis and financial proposals | Read, propose, request owner-gated financial actions |
| AI User Assistant | User help and content/support suggestions | Read limited help context, propose only |

Capabilities are explicit allowlists in `scripts/ai/vvip-ai-control-plane.js`. An unknown capability or a capability not assigned to the requesting agent is rejected.

## 3. Risk model

| Level | Meaning | AI-01 behavior |
| --- | --- | --- |
| `L0_READ` | Read-only analysis | May be policy-approved; no mutation |
| `L1_PROPOSE` | Suggestion/proposal | May be policy-approved; no mutation |
| `L2_REVERSIBLE_EXECUTION` | Reversible operation | Request may be approved by policy, but execution remains disabled by default and requires trusted gateway + kill switch off |
| `L3_OWNER_APPROVAL_REQUIRED` | Sensitive/privileged operation | Must enter `APPROVAL_REQUIRED`; only verified owner authorization can move it to `APPROVED` |

The caller cannot provide or override `risk`, `state`, `approval`, request identity, or execution state fields.

## 4. Lifecycle

`PROPOSED → POLICY_EVALUATED → APPROVED / APPROVAL_REQUIRED → EXECUTING → SUCCEEDED / FAILED → ROLLED_BACK`

A request may also enter `REJECTED` from policy/approval stages. Transitions are enforced by the state machine; arbitrary state changes are rejected.

## 5. Runtime safety controls

- Default mode: `AI01_DRY_RUN`.
- `executionEnabled=false` by default.
- Owner kill switch is **ON** by default.
- Read/propose capabilities remain available while the kill switch is on.
- Executable capabilities require a trusted server-side gateway authorizer.
- L3 execution additionally requires recorded verified-owner approval.
- Audit events do not include action payloads.
- Secret-like payload fields/tokens are rejected before request/audit storage.
- Idempotency keys prevent duplicate actions; reuse with different content is rejected as tampering.

## 6. Trusted execution boundary

No browser script should receive `service_role`, database passwords, provider secrets, or equivalent privileged credentials. Future execution must occur in a trusted server-side gateway (for example an owner-approved Supabase Edge Function or equivalent backend) that:

1. authenticates the caller;
2. resolves the AI agent identity server-side;
3. verifies capability assignment and policy version;
4. verifies owner approval for L3;
5. enforces idempotency and rate limits;
6. performs the minimum scoped operation;
7. writes append-only audit evidence;
8. records failure and rollback outcome;
9. never returns privileged credentials to the client.

AI-01 does **not** deploy this gateway.

## 7. Persistence design (not a migration)

The following schema is a design contract only. No migration or production database change is part of AI-01.

### `ai_agents`
- `id` stable text/uuid primary key
- `name`
- `status` (`active`, `disabled`)
- `created_at`, `updated_at`

### `ai_capabilities`
- `id` stable text primary key
- `risk_level`
- `executable`
- `reversible`
- `status`

### `ai_agent_capabilities`
- `agent_id`
- `capability_id`
- `policy_version_id`
- unique `(agent_id, capability_id, policy_version_id)`

### `ai_action_requests`
- `id` uuid primary key
- `agent_id`
- `capability_id`
- `risk_level` derived server-side
- `state`
- `idempotency_key` unique within the intended scope
- `payload_ref` or minimized encrypted payload storage where needed
- `payload_hash`
- `policy_version_id`
- `created_at`, `updated_at`

### `ai_approvals`
- `id` uuid primary key
- `action_request_id`
- `decision` (`approved`, `rejected`)
- `approver_subject`
- `approved_at`
- immutable approval evidence / reason metadata

### `ai_audit_log`
- append-only event id/sequence
- `action_request_id`
- `agent_id`
- `capability_id`
- `state`
- `reason_code`
- `actor_type`
- `policy_version_id`
- `created_at`
- no plaintext secrets; minimize or omit payload content

### `ai_policy_versions`
- `id`
- policy version/checksum
- effective timestamp
- status
- owner approval reference for promoted policies

### `ai_runtime_controls`
- singleton/scoped control key
- `execution_enabled`
- `kill_switch_enabled`
- `updated_by`
- `updated_at`

## 8. RLS / authorization model

Future database implementation must be deny-by-default:

- Enable RLS on every AI control-plane table.
- Browser/anon clients receive no direct insert/update/delete authority for privileged control-plane records.
- Ordinary authenticated users must not enumerate AI requests, approvals, policies, or audit records.
- Owner/admin visibility must be based on authoritative server-side identity/claims, never `localStorage`.
- The trusted gateway gets only the minimum policy required for its operations.
- Audit records are append-only; updates/deletes are denied except by a separately approved incident/retention runbook.
- Capability and risk are resolved from server-controlled registry data, not caller input.
- Approval insertion requires verified owner identity and must be unique/idempotent per request/decision policy.

Exact SQL/RLS policies remain a later migration task and require the repository's Supabase promotion pipeline and explicit owner approval.

## 9. Security invariants

1. Deny unknown agent/capability.
2. Deny cross-agent capability borrowing.
3. Deny caller-supplied risk/state/approval fields.
4. Require owner approval for every L3 action.
5. Require trusted gateway for execution.
6. Default execution off and kill switch on.
7. Reject duplicate idempotency keys with changed content.
8. Keep payloads out of audit events.
9. Reject secret-like fields/material from requests.
10. Allow rollback only for capabilities declared reversible.

## 10. Supabase impact

`SUPABASE_IMPACT=NONE_REMOTE`

AI-01 adds no migration, performs no `supabase link`, `db push`, `db reset`, migration repair, function deployment, RLS mutation, secret change, storage mutation, or production query.

## 11. Rollback

Rollback is Git-only: revert/remove the AI-01 module, tests and this design document from the feature branch/PR. Since AI-01 has no production data/schema/deploy impact, no production rollback is required.

## 12. Known unknowns before AI-02/AI-03

- Authoritative owner identity/claim format used by the future trusted gateway.
- Final backend location of the gateway (Supabase Edge Function or alternative).
- Retention duration and jurisdiction-specific policy for AI audit records.
- Exact financial-action boundaries and two-person/owner approval rules.
- Production rate limits, queueing and alert thresholds.

These unknowns do not block the dry-run AI-01 foundation.
