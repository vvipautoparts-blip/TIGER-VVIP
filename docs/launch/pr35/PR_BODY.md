# PR35 — Owner Control and Tiger Care foundation

## Summary

Adds the static, Arabic-first PR35 foundation for permission- and scope-based
Owner Control, operational assignments, Tiger Care workflows, immutable audit
records, safe local adapters, and fail-closed production boundaries. The
canonical integration targets `private-profile-p03.html` and the new
`owner-control.html`, with focused modules under `scripts/pr35/`.

## Security and privacy

- Default-deny policy evaluation uses permissions plus effective assignment,
  state, time window, and hierarchical scope; role labels alone never authorize.
- Owner authority, delegation ceilings, self-elevation denial, cross-scope
  denial, requester IDOR protection, internal-note projection, and privileged
  offline denial have executable regression coverage.
- Audit records are append-only and hash-chained; sensitive actions require a
  reason, and secret-like metadata and prototype-pollution keys are rejected.
- Production adapters require verified enforcement and confirmation and fail
  closed when unconfigured. Browser policy remains UX support only.

## UX and resilience

- Arabic RTL is the default with English/LTR readiness, accessible dialogs and
  menus, focus management, live states, touch targets, responsive layout, and
  reduced-motion handling.
- User ticket submissions provide explicit sent/pending/failed states. Only
  non-privileged user submissions can use a session-scoped queue; privileged
  writes never queue offline.
- Network helpers bound pagination, debounce, timeout, cancellation, retry,
  backoff, jitter, idempotency, and deduplication behavior.

## Verification

Fresh focused tests, aggregate PR35 QA, historical smoke, syntax, security,
accessibility/RTL, weak-network, exact changed-file, protected-path, secrets,
remote-mutation, and whitespace gates all pass. Exact commands and exit codes
are recorded in `docs/launch/pr35/QA_EVIDENCE.md` and
`docs/launch/pr35/FINAL_REPORT.md`.

## Deployment boundary

- Production SQL applied: NO
- Remote Supabase changed: NO
- Clerk changed: NO
- Main merged: NO

The SQL artifact is review-only under `docs/security/sql-review/pr35/`. No
commit, push, merge, deployment, remote mutation, or production claim is part
of this pass.
