# P08 Secure Migration Sequence

Status: design-only. Do not run against a remote project from PR76.

1. Verify exact target reference, current database version, backup completion, and approved maintenance window.
2. Rehearse locally only after resolving the historical missing-table dependency reported in the audit; do not patch the historical migration in this PR.
3. Create or reconcile canonical schema objects before any policy references them.
4. Install audited helper functions using fixed search paths and least privilege.
5. Enable RLS and install the per-entity policies specified in the RLS matrix. Use the Clerk JWT `sub` contract only.
6. Create the six private-by-default Storage buckets and their object policies.
7. Run negative and positive policy tests, then capture policy, bucket, and grants evidence.
8. Execute rollback rehearsal from a tested backup plan before requesting production approval.

Broad historical policies are replacement candidates, not approved deployment inputs. This sequence is intentionally non-executable.