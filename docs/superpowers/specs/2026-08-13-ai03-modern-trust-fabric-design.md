# AI-03 Modern Persistent Trust Fabric Design

Status: **approved roadmap execution / repository-only design**
Date: **2026-08-13**
Base: AI-02 final candidate `f07e4c1520eb599387eb42792dd5d1742b00ebb5`

## Purpose

AI-03 converts AI-02's deliberately in-process trust model into a persistent PostgreSQL/Supabase trust substrate without enabling live AI execution. It provides durable owner approvals, append-only audit evidence, usage accounting, prompt-version records, and fail-safe agent runtime state.

AI-03 is a database-control-plane slice only. It does not add model-provider calls, public AI UI, tool execution, production deployment, money movement, destructive AI actions, or production activation.

## Architectural boundary

The trust fabric is server-only. Browser roles (`anon`, `authenticated`) receive no table or function authority over privileged AI control-plane objects. `service_role` is the intended backend boundary for repository-phase design; later runtime code must derive identity from verified server authentication before invoking any privileged function.

A compromised service-role secret is outside RLS containment and remains an operational secret-management risk addressed by later security/operations stages.

## Database objects

### `ai_approval_requests`
Stores exact owner-gated requests with immutable binding fields:

- owner subject;
- requesting agent;
- action;
- canonical payload digest;
- execution-scope digest and scope document;
- optional Decision Passport id;
- reason;
- lifecycle state;
- database timestamps.

Allowed L4 actions remain `merge_pr`, `deploy_production`, and `change_prices`.

The lifecycle is one-way:

- `pending -> approved | rejected | expired | revoked`
- `approved -> consumed | expired | revoked`

No delete is allowed. Immutable binding fields cannot change after insert.

### `ai_audit_events`
Append-only Black Box projection with correlation id, actor, agent, action, decision, reason, bounded metadata, optional approval/model/prompt references, previous hash, event hash, and database timestamp.

### `ai_usage_ledger`
Append-only provider/model/token/tool/cost/latency accounting using integer micro-USD cost units.

### `ai_prompt_versions`
Append-only prompt registry. A new prompt revision is a new row; mutation/deletion of an existing version is forbidden.

### `ai_agent_runtime_state`
One row per approved agent. Defaults are fail-safe:

- `enabled = false`
- `shadow_mode = true`
- `kill_switch = true`
- `max_level = L1`
- `trust_score = 0`
- `daily_budget_microusd = 0`
- `requests_per_minute = 0`
- `max_concurrency = 1`

## Fail-closed migration rules

Security-critical trust tables use plain `CREATE TABLE`, not `CREATE TABLE IF NOT EXISTS`. If an unexpected object already exists, migration application must stop rather than silently accept schema drift.

The migration is wrapped in one transaction. It does not drop tables, truncate data, disable RLS, mutate the `auth` schema, grant browser privileges, or use `SECURITY DEFINER`.

## Approval consumption

`consume_ai_owner_approval(...)` is the only designed one-time consumption RPC in AI-03.

Properties:

1. `SELECT ... FOR UPDATE` locks the approval row.
2. The row must currently be `approved`.
3. Owner, agent, action, payload digest, and execution-scope digest must match exactly.
4. Expiry uses database time (`clock_timestamp()`), not a caller-supplied timestamp.
5. Expired approval transitions to `expired` and returns denial.
6. Successful consumption transitions exactly one row to `consumed`.
7. Concurrent second consumption returns replay/conflict denial.
8. Browser roles cannot execute the function.

No `p_now` parameter exists.

## Approval mutation guard

A trigger rejects:

- DELETE;
- changes to owner/agent/action/payload/scope/created/expiry binding fields;
- invalid lifecycle transitions.

Transition timestamps are stamped by database time, not client input.

## Append-only guards

Audit events, usage ledger rows, and prompt-version rows reject UPDATE and DELETE at the database trigger boundary.

## RLS and grants

RLS is enabled on all AI-03 tables. Browser roles receive explicit `REVOKE ALL`. No browser policy grants privileged access.

Repository design grants only required table/function privileges to `service_role`. Runtime integration remains a later layer and must not expose the service-role secret to browser JavaScript or model context.

## Content-addressed security review

A migration is not considered reviewed merely because its filename matches an exception. The final reviewed byte sequence is sealed by SHA-256 in three places:

1. security-review document;
2. dedicated Node contract test asserting the exact expected digest;
3. Steel Shield reviewed-migration hash map, only if the scanner produces reviewed false positives that require an exception.

Any one-byte migration change invalidates the seal and requires a new review/hash.

A test that merely checks `/^[0-9a-f]{64}$/` is insufficient and is explicitly rejected by this design.

## Verification stages

### Repository stage

- TDD RED before migration creation;
- static trust-fabric contracts;
- dangerous-SQL scan;
- exact content-addressed review;
- full GitHub CI / CodeQL / dependency checks.

### Local/non-production runtime stage

Only after repository review:

- apply migration to isolated non-production PostgreSQL/Supabase;
- verify browser-role denial;
- verify service-role intended access;
- test immutable bindings;
- test append-only guards;
- race two concurrent approval consumptions and require one success / one replay denial;
- verify rollback/cleanup strategy in disposable environment.

### Remote promotion stage

Remote preview/staging/production database mutation requires separate exact owner authorization. Repository approval does not authorize remote apply.

## Threat model decisions

- **Client identity spoofing:** database functions trust only backend invocation; runtime must derive owner subject server-side.
- **Replay:** row lock + one-way consumed state.
- **Time manipulation:** database clock only.
- **Schema drift:** no `IF NOT EXISTS` on trust tables.
- **Browser privilege escalation:** explicit revokes + no permissive privileged RLS policies.
- **Audit rewriting:** append-only triggers; stronger cryptographic provenance remains a later layer.
- **Service-role compromise:** not solved by RLS; covered by secret management, rotation, monitoring, and incident response later.
- **Scanner exception drift:** exact SHA pin only after security review.

## Acceptance criteria

AI-03 repository implementation is complete only when:

- every repository contract passes on exact final SHA;
- migration security review is content-addressed;
- dangerous-SQL findings are either zero or byte-pinned reviewed false positives;
- no browser privilege exists;
- no unresolved security-review thread remains;
- AI-03 remains unapplied to remote environments unless separately authorized.

Global launch readiness remains blocked after AI-03; later AI-04+ stages are still required.
