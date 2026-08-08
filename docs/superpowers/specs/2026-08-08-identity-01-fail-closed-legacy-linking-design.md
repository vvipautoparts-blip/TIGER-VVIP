# VVIP TIGER IDENTITY-01 — Fail-Closed Legacy Profile Linking

## Status

Approved for repository implementation under the binding Federated Identity Sovereignty ADR. This slice is non-production and does not authorize a remote migration, Production database mutation, identity-provider dashboard change, deployment, or user-account reassignment.

## Problem

Historical migration `20260710_vvip_tiger_atomic_profile_resolver_rpc.sql` defines `public.vvip_resolve_own_profile(text)`. Its primary identity path correctly resolves by the authenticated Clerk JWT subject, but a legacy fallback can claim an unbound profile by matching email and then assign the current `clerk_user_id`.

That fallback returns `legacy_profile_recovered` and conflicts with the binding rule:

```text
NO_AUTOMATIC_ACCOUNT_LINKING_BY_EMAIL
```

Email is an attribute. It is not proof of ownership and must never transfer an existing profile to a new external subject.

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

### 3. Browser email is never identity evidence

The compatibility `p_email` argument comes from browser/runtime context and is never trusted for ownership lookup, legacy account detection, or account linking.

It may temporarily be used only as profile/contact data when creating a genuinely new profile already owned by the authenticated subject.

### 4. Legacy detection uses verified JWT email only

The resolver may inspect email claims carried inside the authenticated JWT. Only that verified claim may be used to determine whether an **unbound** historical profile exists for migration handling.

No branch in the replacement function may execute an existing-row ownership transfer such as:

```sql
update public.profiles
set clerk_user_id = v_clerk_user_id
where lower(email) = ...;
```

The browser-supplied `p_email` must never appear inside the legacy lookup block. This also prevents authenticated callers from probing the legacy account inventory using arbitrary email values.

### 5. Legacy unbound match fails closed

If there is no subject-bound profile and an unbound historical profile exists for the JWT-verified email:

```text
ok=false
status=identity_migration_required
profile omitted
```

The response contains only a generic safe message. It must not return or expose the historical profile row.

If the JWT does not carry a verified email, the resolver does not attempt legacy detection from `p_email`.

### 6. New profile creation remains subject-bound

If no subject-bound profile and no verified-email legacy migration condition exists, a new profile may be created with:

```text
clerk_user_id = authenticated JWT subject
```

The stored email may use the verified JWT claim or the compatibility hint, but the subject remains the sole ownership anchor. A browser email hint can therefore affect only the caller's newly created profile data; it cannot acquire an existing profile.

### 7. Conflict behavior

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

That argument is compatibility/profile data only. The database function does not treat it as identity evidence.

When backend returns `identity_migration_required`, current frontend already fails closed because it renders only payloads with `ok === true && profile`; otherwise it returns a safe fallback status/message. A later UX slice may give a dedicated migration/re-verification experience.

## TDD contract

A permanent repository test must prove:

- a new forward migration exists;
- historical migration remains present and unchanged by this slice;
- replacement resolver is subject-first;
- `identity_migration_required` exists;
- `legacy_profile_recovered` is absent from the new migration;
- no email-matching `UPDATE` can assign `clerk_user_id`;
- legacy detection uses JWT-verified email and excludes `p_email`;
- legacy unbound matching is existence-only/fail-closed and does not return a profile;
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
