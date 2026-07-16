# P08 Rollback and Recovery Runbook

1. Stop deployment on the verified target and preserve logs and migration identifiers.
2. Confirm the approved backup is complete and restore procedure has been rehearsed.
3. Reapply the last approved policy and grants snapshot only when it has been security-reviewed.
4. Validate Clerk subject ownership, administrative scope, and private Storage access with negative tests.
5. Record the incident, policy version, operator, target, and resulting evidence in the audit trail.

Do not use broad access predicates as an emergency rollback. A production rollback is blocked until the rehearsal evidence is accepted.