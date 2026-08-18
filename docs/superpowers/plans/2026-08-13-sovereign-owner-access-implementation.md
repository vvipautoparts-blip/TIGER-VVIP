# TIGER VVIP — Sovereign Owner Access Implementation Plan

Date: 2026-08-13
Design: `docs/superpowers/specs/2026-08-13-sovereign-owner-access-design.md`
Safety boundary: repository implementation only. No remote database apply, no production activation, and no real owner personal data or secrets.

## Milestone SOA-01

Implement the owner-security foundation in TDD order.

### Task 1 — data-boundary contract

Create `tests/soa-owner-data-boundary.test.cjs` first. It must fail until the migration exists. Assert separate authority, public-profile, private-vault, audit, security-state, and authorization-lease tables; explicit state constraints; RLS; default-deny grants; append-only audit; no `SECURITY DEFINER`; no real owner seed data; and exact short-lived single-use L4 lease bindings with server/database-owned security timestamps.

Then create `supabase/migrations/20260813170000_soa_owner_security_foundation.sql` with the minimum schema required to make those tests pass.

Focused command: `node --test tests/soa-owner-data-boundary.test.cjs`

### Task 2 — owner access policy

Create `tests/soa-owner-access-policy.test.cjs` first. Cover OWNER authority states, assurance levels L1-L4, strong-factor enrollment before ACTIVE, maximum 120-second L4 lease lifetime, high-risk recovery hold, fail-closed malformed context, and the rule that legacy admin/super_admin never implies OWNER.

Then create `scripts/security/soa/owner-access-policy.js` with the minimum implementation.

Focused command: `node --test tests/soa-owner-access-policy.test.cjs`

### Task 3 — protected server boundary

Add command/query boundary tests before implementation. The boundary must accept only server-verified identity/assurance, require active SOA authority, mask private values by default, allowlist public fields, require fresh step-up for L3/L4, require an exact single-use lease for L4, and emit safe audit metadata without secret plaintext.

Planned files:
- `tests/soa-owner-command-boundary.test.cjs`
- `tests/soa-owner-query-boundary.test.cjs`
- `scripts/security/soa/owner-command-boundary.js`
- `scripts/security/soa/owner-query-boundary.js`
- `scripts/security/soa/owner-audit.js`

### Task 4 — owner-control UI gate

Write `tests/soa-owner-control-ui-contract.test.cjs` before integration. The owner console must not become authorized from PR35 browser assignments alone. Server-confirmed SOA state is required. Locked/restricted/recovery/reverification states must be explicit. Private owner values must not be stored in LocalStorage/sessionStorage or logs.

Planned integration:
- `scripts/security/soa/owner-control-gate.js`
- `owner-control.html`
- minimal bridge in `scripts/pr35/pr35-bootstrap.js`

### Task 5 — authentication assurance adapter

Write `tests/soa-clerk-owner-assurance.test.cjs`, then implement `scripts/security/soa/clerk-owner-assurance.js`. Browser evidence is advisory; final OWNER authority remains server/database controlled. No service-role secret belongs in browser code.

### Task 6 — recovery policy

Write `tests/soa-owner-recovery-policy.test.cjs`, then implement `scripts/security/soa/owner-recovery-policy.js`. Email/SMS alone must never restore sovereign OWNER authority. Total credential loss enters protected recovery and holds L4 authority for the approved high-risk interval.

### Verification

For each task: RED test -> minimal GREEN -> regression -> refactor while green.

Final repository verification:
- `node --test tests/soa-*.test.cjs`
- `bash scripts/quality-gate.sh`
- existing secret scan
- existing dangerous-SQL scan
- `git diff --check`

## Non-negotiable rules

No direct commit to main. No remote DB apply. No production deployment. No real owner PII or credentials in Git. No frontend-created OWNER authority. No legacy role may silently become SOA OWNER. Missing, stale, malformed, replayed, or mismatched evidence fails closed.