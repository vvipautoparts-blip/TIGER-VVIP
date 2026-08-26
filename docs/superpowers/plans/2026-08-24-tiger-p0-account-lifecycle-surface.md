# TIGER P0 Account Lifecycle Surface Plan

## Goal

Close the canonical Social account lifecycle slice without creating a second identity authority: Clerk remains the session and recovery provider, while PostgreSQL remains the Social profile lifecycle authority.

## Boundaries

- A signed-in flag without a current Clerk user and token-capable session must fail closed.
- Password and access recovery stay delegated to Clerk; TIGER collects or stores no password.
- The browser may read its own lifecycle state and request temporary deactivate/reactivate only.
- Trusted deletion remains service-role-only and terminal.
- Browser payloads expose profile UUID lifecycle state only, never Clerk subjects.
- No Production, Staging, provider, or real-user mutation is authorized by this slice.

## Work

1. Add RED session, runtime, controller, SQL, and publication contracts.
2. Add a subject-blind lifecycle-state RPC and exact authenticated grant.
3. Publish lifecycle read/deactivate/reactivate adapters.
4. Add the canonical account lifecycle controller and delegated Clerk security/recovery entry.
5. Prove active, deactivated, reactivated, and deleted states in local PostgreSQL.
6. Content-address the migration review and run Quality plus Social DB gates on one exact SHA.
