# VVIP TIGER IDENTITY-01 — Fail-Closed Legacy Profile Linking

## Status

Approved for repository implementation under the binding Federated Identity Sovereignty ADR. This slice is non-production and does not authorize a remote migration, Production database mutation, identity-provider dashboard change, deployment, or user-account reassignment.

## Problem

Historical migration `20260710_vvip_tiger_atomic_profile_resolver_rpc.sql` defines `public.vvip_resolve_own_profile(text)`. Its primary identity path correctly resolves by the authenticated Clerk JWT subject, but a legacy fallback can claim an unbound profile by matching email and then assign the current `clerk_user_id`.

That fallback returns `legacy_profile_recovered` and conflicts with the binding rule:

```text
NO_AUTOMATIC_ACCOUNT_LINKING_BY_EMAIL
```

Email is an attribute/hint. It is not proof of ownership and must never transfer an existing profile to a new external subject.

## Goal

Replace the resolver through a new forward migration so an authenticated external subject can never acquire an existing unbound profile solely from email equality.

## Non-goals

IDENTITY-01 does not:

- rewrite historical migrations;
- migrate or reassign any existing user;
- add an owner/admin account-recovery UI;
- change RLS policies;
- change provider configuration;
- remove the existing `p_email` parameter yet, because current browser compatibility still supplies it;
- apply the migration remotely.

## Resolver contract

### 1. Authentication boundary

The resolver remains executable only by `authenticated` and must require a non-empty external subject from `auth.jwt()->>'sub'`.

### 2. Subject-first lookup

The resolver first searches:

```sql
where clerk_user_id = v_clerk_user_id
```

If found, return `profile_loaded` with that profile.

### 3. Email is non-authoritative

The resolver may derive an email hint from JWT email claims and the compatibility `p_email` argument, but that value may not be used to assign `clerk_user_id` on an existing row.

No branch in the replacement function may execute an existing-row ownership transfer such as:

```sql
update public.profiles
set clerk_user_id = v_clerk_user_id
where lower(email) = v_email;
```

### 4. Legacy unbound match fails closed

If there is no subject-bound profile and an unbound historical profile exists with the same normalized email:

```text
ok=false
status=identity_migration_required
profile=null / omitted
```

The response contains only a generic safe message. It must not expose the legacy profile row or prove additional private data beyond the caller's supplied/claimed email context.

### 5. New profile creation remains subject-bound

If no subject-bound profile and no unbound legacy email match exists, a new profile may be created with:

```text
clerk_user_id = authenticated JWT subject
```

The email is stored only as profile/contact data. The subject is the ownership anchor.

### 6. Conflict behavior

If insertion encounters a uniqueness race/conflict:

- re-read by exact `clerk_user_id`;
- if found, return `profile_loaded_after_conflict`;
- otherwise return fail-closed `profile_conflict`.

No conflict recovery may fall back to email ownership transfer.

## SQL migration strategy

Create a new migration after the historical resolver migration. The new migration:

- begins/commits transactionally;
- `create or replace function public.vvip_resolve_own_profile(p_email text default null)`;
- preserves `security definer` and explicit `search_path = public` used by the current reviewed resolver;
- preserves public/anon revocation and authenticated execute grant;
- does not alter tables, indexes, RLS policies, or existing rows.

## Runtime compatibility

The browser bridge can continue calling:

```text
vvip_resolve_own_profile({ p_email: normalizeEmail(user) })
```

When backend returns `identity_migration_required`, current frontend already fails closed because it renders only payloads with `ok === true && profile`; otherwise it returns a safe fallback status/message. A later UX slice may give a dedicated migration/re-verification experience.

## TDD contract

A permanent repository test must prove:

- a new forward migration exists;
- historical migration remains present and unchanged by this slice;
- replacement resolver is subject-first;
- `identity_migration_required` exists;
- `legacy_profile_recovered` is absent from the new migration;
- no email-matching `UPDATE` can assign `clerk_user_id`;
- legacy unbound matching is existence-only/fail-closed;
- new insert is explicitly bound to `v_clerk_user_id`;
- conflict recovery re-reads by subject only;
- permissions remain revoked for `public`/`anon` and granted only to `authenticated`;
- no table/RLS mutation is introduced in the new migration.

## Hard boundaries

- `MAIN=LOCKED`
- `PRODUCTION_DB=LOCKED`
- `REMOTE_MIGRATION=NOT_AUTHORIZED`
- `PRODUCTION_EDGE=LOCKED`
- `IDENTITY_REASSIGNMENT=NOT_AUTHORIZED`
- `PROVIDER_CONFIG=NOT_MUTATED`
- `REAL_CHARGES=NOT_AUTHORIZED`
