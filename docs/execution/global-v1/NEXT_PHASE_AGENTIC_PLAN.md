# VVIP TIGER — Next Phase Agentic Engineering Plan

## Authoritative baseline

`f917ca5d653fbc859d04fe9e9fa52f63e68ac722`

## Execution order

1. Register and validate the final business-model decision.
2. Inventory all conflicting requirements, code, schemas, tests, and documentation.
3. Produce a safe-removal and replacement plan; do not delete by name alone.
4. Establish the Agentic Engineering Command Center.
5. Create isolated Git worktrees and specialist branches.
6. Execute Backend/Security, Frontend/UX, Publishing Cards, and QA tracks.
7. Require independent review and CI evidence before integration.
8. Integrate through a controlled merge train.
9. Validate in Staging.
10. Proceed to limited production only after mandatory gates pass.

## Specialist tracks

### Architecture and orchestration

Owns requirement traceability, worktree allocation, dependency boundaries,
integration sequencing, cost controls, and execution-state continuity.

### Backend, database, RLS, and security

Owns identity, authorization, ownership, RLS, migrations, audit logs,
publishing entitlements, quota enforcement, and server-side security.

### Frontend, UX, mobile, RTL/LTR, and PWA

Owns publishing-card interfaces, listing creation, search, messaging journeys,
mobile responsiveness, accessibility, offline behavior, and weak-network recovery.

### Publishing cards and payments

Owns the four-card catalog, monthly entitlements, provider-hosted checkout,
webhooks, payment ledger, entitlement ledger, renewals, expiry, refunds, and
country activation behind feature flags.

### QA, CI, performance, backup, and recovery

Owns automated tests, CI gates, CodeQL, dependency and secret scanning,
performance evidence, backup policy, restore testing, and readiness classification.

### Independent reviewer

Does not author the feature under review. It challenges architecture, security,
data integrity, payment correctness, tests, and compliance with the final owner decision.

## Immediate next action

Create a complete conflict inventory against decision
`VVIP-TIGER-BM-2026-07-25`, then prepare isolated worktrees from the approved
change-control commit.
