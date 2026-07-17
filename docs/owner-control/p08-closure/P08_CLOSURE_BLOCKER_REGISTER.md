# P08 Closure Blocker Register

## Status Model

Allowed states:

- `OPEN`
- `EVIDENCE_REQUIRED`
- `READY_FOR_REVIEW`
- `ACCEPTED`
- `REJECTED`
- `BLOCKED_EXTERNAL`

A blocker may move to `ACCEPTED` only when its evidence path is populated and the named reviewer has recorded acceptance. Resolved blockers remain in this register.

## Register

| ID | Description | Source artifact | Risk | Required resolution | Required evidence | Allowed action boundary | Owner | Reviewer | Current state | Last evidence date | Evidence path | Closure note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P08-B01 | Historical OTP migration references missing `public.otp_codes`. | `../p08/P08_CURRENT_SECURITY_AND_SCHEMA_AUDIT.md` | Local reset cannot complete; migration order is not deterministic. | Approve and implement a new reconciliation migration or reviewed ordered migration manifest without editing history. | Failure reproduction, approved design, checksums, and two consecutive green resets. | Local-only until a separate implementation PR is approved. | Database implementer | Database reviewer | OPEN | — | — | — |
| P08-B02 | Green local reset has not been achieved. | `../p08/P08_EVIDENCE_MANIFEST.json` | Schema and policy behavior cannot be validated deterministically. | Produce two consecutive green local resets using the selected migration sequence. | Sanitized reset logs, migration list, checksums, and assertion results. | Local-only. | Database implementer | Security reviewer | OPEN | — | — | — |
| P08-B03 | Exact remote project target has not been independently verified. | `../p08/P08_PRODUCTION_APPROVAL_GATE.md` | Inspection or later mutation could target the wrong project. | Verify the project by two independent approved signals. | Sanitized target-verification record with timestamp and operator. | Read-only metadata inspection only. | Technical operator | Owner | EVIDENCE_REQUIRED | — | — | — |
| P08-B04 | Remote schema, policies, grants, functions, and buckets have not been inspected. | `../p08/P08_EVIDENCE_MANIFEST.json` | Repository design may differ from deployed state. | Perform the approved read-only inspection and classify drift. | Timestamped inspection report, command log, drift report, and no-change declaration. | Read-only remote inspection only. | Technical operator | Security reviewer | EVIDENCE_REQUIRED | — | — | — |
| P08-B05 | Current backup and restore point are not verified. | `../p08/P08_PRODUCTION_APPROVAL_GATE.md` | Later remote mutation could be unrecoverable. | Verify backup identifier, timestamp, retention, and restore method. | Sanitized backup verification record. | No remote mutation authorized. | Database operator | Owner | EVIDENCE_REQUIRED | — | — | — |
| P08-B06 | Rollback rehearsal has not been completed. | `../p08/P08_ROLLBACK_AND_RECOVERY_RUNBOOK.md` | Forward changes may not be safely reversible. | Complete a rehearsal in an approved non-production environment. | Forward/rollback logs, restored-state comparison, RTO, and data-loss result. | Non-production rehearsal only. | Database implementer | Database reviewer | EVIDENCE_REQUIRED | — | — | — |
| P08-B07 | RLS positive and negative test evidence is incomplete. | `../p08/P08_RLS_POLICY_MATRIX.json` | Unauthorized access may remain possible or valid access may fail. | Execute the approved identity and operation matrix for all required entities. | Per-row PASS/FAIL evidence with sanitized logs. | Local or approved staging only. | Test operator | Security reviewer | EVIDENCE_REQUIRED | — | — | — |
| P08-B08 | Six Storage bucket policy checks are incomplete. | `../p08/P08_STORAGE_POLICY_MATRIX.json` | Files may be public or cross-user accessible. | Verify private defaults, ownership paths, and allowed/denied operations for all six buckets. | Per-bucket PASS/FAIL evidence with sanitized logs. | Local or approved staging only. | Test operator | Security reviewer | EVIDENCE_REQUIRED | — | — | — |
| P08-B09 | Security approval is not recorded. | `../p08/P08_PRODUCTION_APPROVAL_GATE.md` | Closure could bypass specialist review. | Security reviewer evaluates the complete evidence set. | Signed security review record. | Review only. | Security reviewer | Owner | EVIDENCE_REQUIRED | — | — | — |
| P08-B10 | Owner approval is not recorded. | `../p08/P08_PRODUCTION_APPROVAL_GATE.md` | Phase completion could occur without owner authorization. | Owner reviews the complete evidence set and decision record. | Signed owner approval record. | Review only. | Owner | Owner | EVIDENCE_REQUIRED | — | — | — |
| P08-B11 | Zero unresolved pull-request review threads is not proven. | `../p08/P08_PRODUCTION_APPROVAL_GATE.md` | Known concerns may remain unresolved. | Resolve or formally disposition every review thread. | Pull-request review-thread report showing zero unresolved threads. | Review only. | PR author | Security reviewer | EVIDENCE_REQUIRED | — | — | — |
| P08-B12 | Post-merge verification evidence is not available. | `../phase-status.json` | Merge success may be assumed without verification. | Run the approved post-merge verification after the relevant implementation PR merges. | Post-merge report tied to exact merge SHA. | Verification only. | Technical operator | Owner | EVIDENCE_REQUIRED | — | — | — |

## Update Rules

- Do not delete blocker rows.
- Do not change blocker IDs.
- `BLOCKED_EXTERNAL` must name the external dependency in the closure note.
- `READY_FOR_REVIEW` requires a non-empty evidence path.
- `ACCEPTED` requires a non-empty evidence path, reviewer identity, review date, and closure note.
- Any newly discovered closure blocker receives the next sequential ID.
