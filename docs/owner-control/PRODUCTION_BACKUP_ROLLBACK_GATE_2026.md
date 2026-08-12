# Production Backup and Rollback Gate — 2026

## Status and authority

This is a reusable owner-control gate for any Production-sensitive change. The default state is `CLOSED`.

This document does not authorize a Production write. It defines the minimum evidence required before a separate Production change may be considered for approval.

## Core reliability model

A Production-sensitive change is not ready merely because its forward path is understood. Readiness requires evidence for **backup, restore, rollback, stop conditions, recovery objectives, and exact change identity**.

The gate is fail-closed:

- Missing backup evidence = `CLOSED`.
- Untested restore path = `CLOSED`.
- Unrehearsed rollback for a reversible change = `CLOSED`.
- Unexplained state difference after rehearsal = `CLOSED`.
- Unknown irreversible step = `CLOSED`.
- Scope/SHA drift after approval = prior approval is stale and must be renewed.

## Required pre-change evidence

Record all of the following before requesting Production approval:

- Exact repository and approved commit/SHA.
- Exact Production target, independently verified.
- Exact forward change list.
- Exact rollback/recovery list.
- Operator identity.
- Independent reviewer identity.
- Approved maintenance window.
- Backup/restore-point identifier, sanitized.
- Backup/restore-point creation timestamp.
- Retention/expiry window.
- Restore method and prerequisites.
- Verification method for restored state.
- Expected forward duration.
- Expected rollback/recovery duration.
- Declared RTO target for this change.
- Declared acceptable data-loss objective (RPO) for this change.
- Explicit stop/abort conditions.
- Inventory of irreversible or externally irreversible operations.
- Confirmation that secrets and Production data are not embedded in the evidence package.

## Backup evidence contract

Backup evidence must identify the protected target and prove that a usable restore path exists. Record only sanitized metadata:

- Backup/restore-point identifier.
- Target identifier.
- UTC creation time.
- Retention/expiry.
- Backup class (snapshot, point-in-time recovery, logical export, provider-managed restore point, or other approved mechanism).
- Restore prerequisites.
- Verification method.
- Operator.
- Reviewer.
- Review timestamp.

A backup that has not been tested or whose restoration procedure is unknown is not sufficient evidence by itself.

## Restore and rollback rehearsal

Where technically possible, rehearse in an approved non-Production environment that represents the relevant schema/configuration shape.

The rehearsal record must include:

1. Exact starting state and source SHA.
2. Exact forward sequence.
3. Forward verification results.
4. Exact rollback/recovery sequence.
5. Rollback verification results.
6. Restored-state comparison against the starting contract.
7. Measured recovery time.
8. Data-loss result relative to the declared RPO.
9. Known environmental differences from Production.
10. Unexpected warnings/errors.
11. Reviewer decision.

Any unexplained difference blocks the gate.

## Irreversible operations

An operation is treated as irreversible when rollback cannot reliably reconstruct the prior state within the approved RTO/RPO. Examples can include destructive data changes, external provider actions, DNS transitions, credential revocation, or third-party side effects.

For every irreversible operation:

- Name it explicitly.
- Explain why it is required.
- Define the compensating recovery path.
- Define the blast radius.
- Define the decision point after which rollback is no longer equivalent.
- Require separate owner approval naming that operation.

Do not hide irreversible operations inside a generic migration or deployment approval.

## Stop conditions

The operator must abort or stop progression when any approved stop condition occurs, including:

- Target identity mismatch.
- Repository SHA mismatch.
- Backup/restore-point missing, expired, or unverified.
- Unexpected migration/schema drift.
- Permission/RLS/policy drift outside the approved change.
- Verification failure.
- Unexpected write outside the declared scope.
- Error rate or health signal outside the approved threshold.
- Rollback prerequisite unavailable.
- Reviewer/owner approval no longer matches the exact change.

A stop condition is not overridden by time pressure.

## Separation of duties

For a high-impact Production change, distinguish at minimum:

- Technical implementer/operator.
- Domain/database/platform reviewer as applicable.
- Security reviewer for security-sensitive scope.
- Owner/business authority.

One identity should not silently satisfy every role for a high-impact change. Any reduced separation must be explicit, justified, and owner-approved before execution.

## Exact approval binding

Every approval must name:

- Exact repository/PR.
- Exact head/commit SHA.
- Exact target environment.
- Exact change scope.
- Evidence package reviewed.
- Backup/restore identifier class.
- Rollback/recovery plan.
- Stop conditions.
- Decision and conditions.
- Reviewer identity and UTC timestamp.

If the SHA, target, or scope changes, the approval is stale.

## Gate states

Allowed states:

- `CLOSED` — required evidence incomplete or blocked.
- `READY_FOR_SEPARATE_PRODUCTION_REVIEW` — evidence complete; Production execution still not authorized.
- `APPROVED_FOR_EXACT_CHANGE` — may be assigned only by the explicit Production authorization process and only to the exact bound SHA/target/scope.
- `BLOCKED` — a safety, security, restore, rollback, or identity condition prevents execution.

This document itself cannot transition a change to `APPROVED_FOR_EXACT_CHANGE`.

## READY criteria

The gate may reach `READY_FOR_SEPARATE_PRODUCTION_REVIEW` only when:

- Exact target identity is verified.
- Exact SHA/scope is frozen.
- Backup/restore-point evidence is valid and within retention.
- Restore method is known and verified to the level required by risk.
- Rollback/recovery rehearsal passed where applicable.
- RTO/RPO expectations are recorded and achievable.
- All irreversible operations are separately disclosed.
- Stop conditions are executable and understood.
- No unresolved security/review blocker remains.
- Independent reviewers have signed the evidence record.

`READY_FOR_SEPARATE_PRODUCTION_REVIEW` is not deployment permission and never implies automatic merge, automatic release, or automatic Production mutation.