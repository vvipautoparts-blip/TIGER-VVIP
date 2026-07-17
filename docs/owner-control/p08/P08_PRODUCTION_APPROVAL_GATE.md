# P08 Production Approval Gate

Production is not authorized by PR76. Approval requires all of the following:

- Exact remote project target verified independently.
- Current backup and restore point verified.
- Green local reset and policy test evidence.
- A completed rollback rehearsal.
- Security and owner approval.
- Zero unresolved review threads.
- Remote read-only inspection confirms the reviewed baseline.

The current local migration dependency blocker means this gate is closed.

## Closure Evidence Orchestration

Use the [P08 Closure Readiness Package](../p08-closure/README.md) to track blockers, evidence, read-only inspection, local recovery, RLS and Storage verification, backup, rollback, and sign-off. The Production gate remains closed until the required evidence is reviewed and passed.
