# P08 Backup, Rollback, and Approval Gate

## Current Gate State

`CLOSED`

This document does not authorize Production mutation. The gate remains closed until every mandatory evidence item is reviewed and passed.

## Required Pre-Mutation Evidence

- Exact verified remote target.
- Database engine/version.
- Backup timestamp.
- Backup identifier.
- Backup retention window.
- Restore point or tested restore method.
- Operator identity.
- Approved maintenance window.
- Approved forward migration list.
- Approved rollback list.
- Expected duration.
- Stop conditions.
- Confirmation that irreversible operations are absent, or separately documented and approved.

## Backup Evidence

Evidence `P08-E07` must record:

- Sanitized backup identifier.
- Backup creation timestamp.
- Target reference.
- Retention policy.
- Restore method.
- Verification method.
- Operator.
- Reviewer.
- Review date.

No database content or secret may be committed as evidence.

## Rollback Rehearsal

Evidence `P08-E08` requires:

1. Approved non-production rehearsal environment.
2. Recorded start state.
3. Exact forward sequence.
4. Forward verification results.
5. Exact rollback sequence.
6. Rollback verification results.
7. Restored-state comparison.
8. Recovery time.
9. Data-loss result.
10. Known differences.
11. Database reviewer decision.

Any unexplained difference keeps the gate closed.

## Review Requirements

Evidence `P08-E13`, `P08-E14`, and `P08-E15` require:

- Security approval.
- Owner approval.
- Zero unresolved pull-request review threads.

Approval must name:

- Exact scope.
- Exact commit or PR.
- Evidence set reviewed.
- Decision.
- Conditions.
- Reviewer.
- Date.

## Separation of Duties

Required roles:

- Technical implementer.
- Database reviewer.
- Security reviewer.
- Owner.

For a Production-sensitive gate, one person must not satisfy all four roles.

## Gate Decision

The gate may move from `CLOSED` to `READY_FOR_SEPARATE_PRODUCTION_REVIEW` only when:

- `P08-E04` through `P08-E15` are `REVIEWED_PASS`.
- No closure blocker is `OPEN`, `EVIDENCE_REQUIRED`, `REJECTED`, or `BLOCKED_EXTERNAL`.
- The intended Production-sensitive implementation has its own approved plan.
- The intended implementation has exact rollback instructions.
- Security and owner approvals name the exact intended implementation.

This state still does not authorize automatic deployment or merge.
