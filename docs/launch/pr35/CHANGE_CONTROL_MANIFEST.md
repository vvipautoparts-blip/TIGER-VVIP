# PR35 Change Control Manifest

Baseline: `c71ecbddd00d91f5ee5414e86e74cbbbdb168d84`
Branch: `feat/pr35-owner-control-tiger-care-foundation`
Pass 01: documentation baseline
Pass 02: local authorization, scoped assignments, and immutable audit foundation
Pass 03: local Tiger Care lifecycle, routing, SLA, drafts/queue, bounded network,
and fail-closed adapter foundation
Pass 04: canonical mobile UI integration for authorized private-profile actions,
Owner Control, Tiger Care submission/operations, accessibility, RTL, and
weak-network state behavior
Pass 05: fail-closed production adapter boundaries and review-only SQL/RLS
design; no remote system is configured or contacted and no SQL is applied
Pass 06: integrated preliminary QA, hostile audit-field and requester-cancellation
root-cause fixes, narrow historical smoke compatibility, and documented legacy audit
Pass 07: independent review Round 1 validation, production identity fail-closed
correction, truthful session-backed offline Care queue state, and regression evidence
Pass 08: independent review Round 2 validation, owner-only authority revocation
enforcement, complete hierarchical scope inputs, and exact allowlist reconciliation
Pass 09: independent review Round 3 validation, effective-assignment scope enforcement
for local Care staff operations, delegation ceiling enforcement for assignment state
changes, online-hint-independent transport-failure queuing, regression coverage, and
exact allowlist reconciliation
Pass 10: independent review Round 4 validation, bounded Clerk initialization before
authorization-dependent mounting, terminal successful queue handling without replay,
regression coverage, final handoff report, and exact allowlist reconciliation
Pass 10 V2 final: read-only product verdict completed at
`2026-07-14T19:07:55Z`; fresh focused/aggregate/boundary evidence, four-review
resolution verification, exact 58-path preliminary freeze, QA evidence, PR
body, and final PASS report; documentation and manifest only

## Authorized implementation change classes

- Canonical runtime integration for owner console, account Tiger Care, and listing menus.
- New pure domain, controller, adapter, i18n, styling, and test modules.
- A volatile, memory-only development assignment/audit repository and a
  fail-closed future remote repository interface; neither uses browser
  persistence nor performs remote operations.
- Service-worker cache exclusion/version update.
- Review-only SQL/RLS design in the mandated directory.
- QA, reviews, report, PR body, and change-control evidence.

## Forbidden changes

No production deployment/config mutation, remote SQL, migrations, Clerk/Supabase mutation, secrets, payment, direct management phone, legacy deletion, fake adapter/email success, or file outside `CHANGED_FILES.allowlist`.

## Gates

1. Every code behavior starts with a failing focused test.
2. Domain, security, accessibility, smoke, weak-network, and allowlist gates produce fresh executable evidence; PASS requires every gate to exit zero and zero unresolved blocking findings.
3. Four independent review rounds are recorded and every concrete finding is resolved with executable regression coverage.
4. Review-only SQL is clearly marked and is never executed.
5. The sorted changed/untracked Git list (excluding only the temporary owner-provided `AGENTS.override.md`) exactly equals both `CHANGED_FILES.allowlist` and `CHANGED_FILES.final`; baseline HEAD stays unchanged during Codex phases.
6. Final report includes command, UTC timestamp, exit status, and artifact path for every PASS claim.

Rollback is file-level reversal by the outer orchestrator after review; Codex performs no reset, checkout, commit, push, merge, or PR creation.
