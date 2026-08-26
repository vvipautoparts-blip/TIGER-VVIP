# TIGER P0 Account Lifecycle Migration Security Review

Reviewed migration:

- `supabase/migrations/20260824143000_social_account_lifecycle_surface.sql`
- SHA-256: `3616254febcc3ad53b8b71faaf428bfb4dca35dc369e280ffd86d3eb64c7b1bf`

## Steel Shield classification

Before content-addressed approval, these exact bytes produced:

- `CRITICAL=0`
- `HIGH=1`
- `BROAD_GRANT_TO_AUTHENTICATED=1`

The single HIGH finding is the exact `EXECUTE` grant on the subject-blind lifecycle-state RPC. `PUBLIC`, `anon`, and prior authenticated privileges are revoked first. The migration creates no table, policy, trigger, extension, browser CRUD grant, destructive DDL, or data mutation.

## Identity and lifecycle boundary

The browser supplies no subject or profile identifier. `vvip_social_get_my_lifecycle_state()` derives the Clerk-backed actor only through `vvip_marketplace_actor_id()`, validates that authority, and selects the matching internal row. It serializes exactly `ok`, `state`, and `profile_id`; the Clerk subject remains private.

The state read deliberately remains available to an authenticated owner whose Social profile is deactivated or terminally deleted. That is required to render the correct recovery or terminal state without weakening any public profile/content visibility rule. A missing profile is represented explicitly and safely. Unknown stored states fail closed.

Self-deactivation and self-reactivation remain the already reviewed subject-blind RPCs. Trusted deletion remains available only to `service_role`, creates the established neutral tombstone, and cannot be reversed from the browser. Raw projection CRUD remains unavailable to authenticated clients.

## Session and recovery boundary

The canonical browser gate now treats a session as active only when Clerk reports signed-in state, a valid Clerk user identifier, and a token-capable session object together. Recovery and security management are delegated to Clerk's hosted user-profile surface; no first-party password reset endpoint or password material is introduced.

## Behavioral proof requirement

`tests/sql/tiger-p0-account-lifecycle-surface.sql` is wired into the exact-head, local-only TIGER Social DB Rehearsal. It proves least privilege, active/deactivated/reactivated/deleted state presentation, subject-free exact payload shape, browser deletion denial, terminal reactivation denial, missing-auth denial, and final fail-closed PASS-marker enforcement.

This review does not apply the migration to Production or Staging and does not authorize provider credentials, real-user data, or remote database mutation.

## Approval rule

This review approves only SHA-256 `3616254febcc3ad53b8b71faaf428bfb4dca35dc369e280ffd86d3eb64c7b1bf`. Any byte drift invalidates the approval and must re-enter Steel Shield classification, behavioral proof, and content-addressed review.
