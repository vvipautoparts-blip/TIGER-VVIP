# VVIP TIGER — AI-01 Foundation

Status: **implementation foundation / feature disabled by default**
Date: **2026-08-07**
Branch: **`feat/ai-01-foundation`**

## Objective

Introduce the first safe control-plane layer for the VVIP TIGER Intelligence Operating System without giving an AI model autonomous production, financial, destructive, or owner-identity authority.

This slice deliberately separates **authorization and governance** from the future model/provider integration.

## Initial agents

| Agent | Purpose | Initial scope |
| --- | --- | --- |
| `general_manager` | Owner-facing coordination and executive summaries | Read analytics, generate reports |
| `technical_manager` | Engineering analysis and safe change preparation | Read/report, run tests, propose patch, create PR; merge/deploy remain owner-gated |
| `financial_analytics_manager` | Revenue/cost/growth analysis | Read/report; pricing changes remain owner-gated |
| `user_assistant` | User writing and listing assistance | Writing help and listing metadata suggestions only |

## Permission levels

- **L1 — Read / Analyze**: read approved telemetry and produce reports.
- **L2 — Recommend**: produce proposals without mutating production state.
- **L3 — Safe / Reversible execution**: bounded engineering actions such as tests or preparing a PR.
- **L4 — Owner approval required**: sensitive business or production actions.

## Permanent safety boundaries

The policy engine returns `DENY` for these actions even if an `ownerApproved=true` value is supplied to the runtime authorization function:

- `delete_data`
- `transfer_funds`
- `change_owner_permissions`

These are not AI executor capabilities in AI-01.

## Owner-gated actions

The policy engine returns `OWNER_APPROVAL_REQUIRED` for:

- `merge_pr`
- `deploy_production`
- `change_prices`

AI-01 browser/runtime code does not contain a trusted path that converts these L4 results to `ALLOW`. A client-controlled approval flag cannot satisfy the gate.

A future trusted owner approval cannot expand an agent beyond its own role scope. For example, `user_assistant` cannot change prices even if a future valid server-side approval exists for a different authorized agent.

## Fail-closed rules

- Unknown action → `DENY / UNKNOWN_ACTION`
- Unknown agent → `DENY / UNKNOWN_AGENT`
- Action outside agent scope → `DENY / AGENT_SCOPE_DENIED`
- AI Command Center feature disabled → `DENY / FEATURE_DISABLED`
- Permanent forbidden action → `DENY / PERMANENTLY_FORBIDDEN`
- L4 action in AI-01 browser/runtime → `OWNER_APPROVAL_REQUIRED`

## Feature flag

`AI_COMMAND_CENTER_ENABLED` is **`false` by default**.

The owner console may show the four AI-01 roles and policy state, but no external AI request is sent and the owner prompt input remains disabled in this foundation slice.

## Audit design

AI-01 creates structured audit-record envelopes. Metadata is allowlisted; raw prompts, passwords, tokens, or arbitrary payload fields are not copied into the audit record by the foundation API.

Initial allowlisted metadata keys:

- `target`
- `resource`
- `reasonCode`
- `ticketId`
- `prNumber`

Persistent audit storage is **not** enabled in this slice. A future backend migration must use owner/admin-only access and RLS before persistence is connected.

## Approval design

`createApprovalRequest()` can create a pending request only for an action whose global policy is `OWNER_APPROVAL_REQUIRED` and whose requesting agent is scoped to that action.

AI-01 browser/runtime code never treats `ownerApproved=true` or any equivalent client-controlled value as proof of authorization. L4 actions remain `OWNER_APPROVAL_REQUIRED` until a future server-side verifier validates a persistent, scoped, expiring, one-time approval record bound to the exact action payload.

`createApprovalRequest()` creates only a pending request envelope. It does not authorize execution and it does not consume an approval.

Persistent approval storage and cryptographic binding of approvals to exact action payload digests are deferred to the backend integration slice.

## Provider boundary

AI-01 foundation does **not** embed an OpenAI key, Supabase service-role key, or any other provider secret in browser JavaScript.

A future model provider must be called through a protected backend / Edge Function. The browser must never receive a server secret.

## Owner console integration

`owner-control.html` loads:

1. `scripts/ai/vvip-ai-command-center.js`
2. `scripts/ai/vvip-ai-owner-console.js`

The UI adapter renders the four approved roles and safety levels under the existing owner-only control surface. The prompt input is intentionally disabled until the backend AI provider, persistent audit, approval verification, rate limits, and owner authorization are implemented.

## Secret hygiene correction discovered during AI-01

A tracked `.env.local` file existed on `main`, while `.gitignore` did not exclude environment files. AI-01 remediation removes `.env.local` from the feature branch and adds:

```gitignore
.env
.env.*
!.env.example
```

The file contents were not inspected as part of this work.

**Important:** deleting the tracked file from the branch does not erase prior Git history. Any credential that may have been stored in a previously committed environment file must be treated as potentially exposed and rotated through the relevant provider consoles before production reliance.

## Verification contract

The repository quality gate automatically runs root `tests/*.test.cjs`. The AI-01 policy contract lives in:

- `tests/ai-command-center-policy.test.cjs`

The tests cover default-disable behavior, the four-agent registry, permanent denial, owner-gated actions, rejection of client-side L4 approval, fail-closed behavior, specialist scoping, approval creation, and audit metadata redaction.

## Not implemented yet

The following are intentionally outside this foundation slice:

- external LLM/provider calls
- production deploy executor
- merge executor
- money movement of any kind
- data deletion executor
- owner-permission mutation
- persistent AI audit tables
- persistent owner approval tables
- trusted server-side L4 approval verification and consumption
- live financial data adapter
- live engineering/log adapter
- user-facing generative writing endpoint
- autonomous self-modifying production code

These must be added as separate reviewed slices behind the authorization foundation.
