# V13.1 Authorization Local Migration Design

**Status:** STANDING_OWNER_AUTHORITY_APPROVED

**Date:** 2026-08-05

**Depends on:** PR #113 authorization envelopes and review-only RLS contract

## 1. Purpose

This slice converts the reviewed V13.1 authorization schema into a dark-launch Supabase migration candidate that can be inspected and rehearsed locally without activating production authorization, creating an owner, creating partners, activating a country, or changing remote Supabase state.

The migration establishes storage and denial boundaries only. It does not create the server-side privileged write adapter or expose a partner-management RPC. Those write paths remain a separate security slice because actor provenance, signed envelope verification, idempotency, and audit confirmation must be designed and tested together.

## 2. Selected approach

Three approaches were evaluated:

1. Copy the review SQL directly into migrations, including privileged RPCs. Rejected because the current server adapter is not yet present and accepting a trusted actor parameter before that boundary exists would create an ambiguous authority path.
2. Keep the SQL as documentation only. Rejected because it does not prove compatibility with the existing Supabase migration chain or Clerk text subjects.
3. Add an inert schema migration with default-deny privileges, local verification, and no privileged write RPC. Selected because it advances executable readiness while keeping production and authority membership unchanged.

## 3. Migration properties

The migration path is:

```text
supabase/migrations/20260805_v13_1_authorization_foundation.sql
```

It must:

- use Clerk subject identifiers as bounded `text` values;
- use UUID only for internal record identifiers;
- create authorization tables without `IF NOT EXISTS`, so unexpected prior objects fail visibly;
- create deterministic check constraints and indexes;
- enable and force RLS on every protected table;
- revoke table and function privileges from `public`, `anon`, and `authenticated`;
- create no browser mutation policies;
- create no owner, partner, assignment, country seal, or envelope row;
- create no production endpoint, secret, project ID, webhook, or provider configuration;
- create no privileged partner or assignment write RPC;
- expose only internal helper functions with execution revoked from browser roles;
- preserve append-only audit enforcement and immutable owner-root protection;
- use schema-qualified extension functions and a fixed function `search_path`;
- fail closed if required database capabilities are absent.

## 4. Dark-launch boundary

After the migration is applied locally, the authorization schema exists but is operationally inert:

```text
owner roots = 0
partner principals = 0
delegated assignments = 0
country authority seals = 0
authorization envelopes = 0
browser write privileges = 0
browser executable privileged RPCs = 0
```

No code may interpret the empty owner table as permission to bootstrap an owner. Owner bootstrap and recovery require a separate reviewed process with independently supplied legal and operational evidence.

## 5. Identity model

The trusted application identity remains Clerk JWT `sub` and is represented as `text` end to end. The migration must not cast the subject to UUID.

Canonical identity helper:

```sql
create function public.vvip_current_actor_id()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
    select nullif(current_setting('request.jwt.claim.sub', true), '');
$function$;
```

Execution is revoked from `public`, `anon`, and `authenticated` in this slice. The helper exists for later server-reviewed policy/RPC work, not direct browser use.

## 6. Tables

The migration creates:

- `vvip_authority_roles`
- `vvip_authority_permissions`
- `vvip_authority_principals`
- `vvip_authority_assignments`
- `vvip_authority_assignment_revisions`
- `vvip_country_authority_seals`
- `vvip_authorization_envelope_audit`
- `vvip_authorization_audit_events`

Catalog tables are created empty. Static role and permission catalog synchronization is deferred to the server-adapter slice so JavaScript contracts, database rows, and manifest hashes can be changed atomically.

## 7. Owner and partner invariants

A partial unique index permits at most one active `OWNER_ROOT`. It does not create one.

A principal mutation trigger rejects:

- update or delete of an owner-root row with `OWNER_ROOT_IMMUTABLE`;
- direct browser-originated insert, update, or delete with `CLIENT_AUTHORITY_FIELDS_DENIED`;
- partner-to-partner mutation with `PEER_PARTNER_MUTATION_DENIED` when a later trusted path supplies actor context.

Because this foundation grants no mutation privilege and defines no write RPC, these trigger checks are defense in depth rather than the primary authorization boundary.

## 8. RLS and privileges

Every protected table receives both:

```sql
ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY
```

This slice creates no browser-facing write policies. It also creates no browser-facing read policies. Direct access remains denied until the server adapter and bounded projection requirements are implemented.

Explicit revocations cover:

```text
PUBLIC
anon
authenticated
```

The `service_role` is not granted new table or function privileges by this migration. Supabase's existing trusted service-role behavior is not expanded or redefined here.

## 9. Audit integrity

Authorization audit rows are append-only. A trigger rejects update and delete with `AUTHORIZATION_AUDIT_APPEND_ONLY`.

The migration creates the storage boundary but does not implement hash generation or privileged audit insertion. The later server adapter must submit a canonical hash and previous-hash link, and the database write RPC must validate both before persistence.

## 10. Local verification

Two verification layers are required.

### 10.1 Static CI contract

A Node test validates:

- the migration exists in the expected path;
- the review SQL is not copied blindly;
- identity columns remain text;
- no owner/partner/country seed exists;
- no privileged write RPC exists;
- no `IF NOT EXISTS` hides schema collisions;
- RLS and FORCE RLS exist for every protected table;
- browser privileges are revoked;
- no browser write policy exists;
- no remote command or project identifier exists;
- the review-only rollback file remains outside migrations.

### 10.2 Optional local Supabase rehearsal

A shell script may run only against the local Supabase stack. It must:

- require `supabase` CLI;
- require an explicit `VVIP_ALLOW_LOCAL_SUPABASE_RESET=1` environment flag;
- reject any linked remote project reference;
- call only `supabase db reset --local`;
- query the local database to confirm tables, RLS, privileges, empty authority state, and trigger presence;
- run a second local reset to prove repeatability;
- never call `supabase db push`, `migration up --linked`, or any remote database command.

The local rehearsal is not required in GitHub Actions unless Docker and Supabase CLI are intentionally provisioned in a later infrastructure PR.

## 11. Rollback review artifact

A rollback file is placed at:

```text
docs/security/sql-review/v13.1/v13_1_authorization_foundation_rollback_review.sql
```

It is labelled `REVIEW ONLY — LOCAL ROLLBACK — DO NOT APPLY REMOTELY` and is not part of the migration chain. It drops objects in dependency-safe reverse order for local review only. No automated script executes it.

## 12. Failure behavior

The migration and verification fail closed when:

- an expected object already exists;
- Clerk identity types drift from text;
- any browser privilege appears;
- any authority seed row appears;
- a privileged write function is introduced;
- local verification detects a linked remote project;
- the local reset is not explicitly authorized;
- RLS or FORCE RLS is missing;
- the dangerous SQL scanner reports a critical or high finding.

## 13. Explicit exclusions

This slice does not:

- deploy or push a migration remotely;
- create the owner root;
- create partner memberships;
- seed roles or permissions;
- activate Jordan or another country;
- create a country seal;
- implement the server authorization adapter;
- implement signed-envelope database verification;
- grant browser read or write access;
- implement owner recovery;
- change Clerk configuration;
- claim production readiness.

## 14. Completion criteria

The slice is complete only when:

- static migration tests pass;
- all existing CJS, Python, cleanroom, project-control, secret, SQL, and QA gates remain green;
- CodeQL and Dependency Review pass on the exact final SHA;
- the migration contains zero production identities or country data;
- PR evidence states clearly that no remote database command was executed;
- the PR remains Draft while its parent stack is unmerged.
