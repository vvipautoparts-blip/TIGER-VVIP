# Legacy Supabase Auth Credential Retirement Plan

**Goal:** Remove the historical Supabase email/password credential surface while preserving VVIP profiles and the binding Clerk subject-first identity model.

## Verified starting state

Production project `zelcngyyvbomuzokvuxo` currently has:

- 7 Supabase Auth users, all provider `email`;
- 7 non-empty encrypted password credentials;
- 6 confirmed email users;
- 4 Auth sessions;
- 6 refresh tokens, 4 not revoked;
- 7 Auth UUIDs matching `public.profiles.id`;
- no FK from `public.profiles` to `auth.users`;
- 6 profiles without Clerk subject;
- repository search: zero `signInWithPassword` and zero `supabase.auth` launch-code calls.

The deployed profile resolver must remain subject-first and must never bind the six unbound profiles by email.

## Official platform facts used by the plan

Supabase hosted projects configure Email authentication on **Auth > Providers**. Supabase documentation states that deleting an Auth user does not invalidate an already issued JWT until it expires, so user deletion alone is not a complete immediate-session revocation mechanism. Session/refresh-token retirement therefore must be explicitly verified rather than inferred from deletion.

## Protected execution sequence

### Gate A — pre-retirement snapshot

Read-only evidence:

- exact Auth user count / provider count;
- session and non-revoked refresh-token counts;
- `public.profiles` row count, Clerk-bound count and unbound count;
- hash-safe identity-overlap map (UUID counts only; no raw emails in Git evidence);
- Phase A resolver/RLS proof.

### Gate B — disable parallel authentication entry

In Supabase Dashboard for Production:

- Auth > Providers > Email;
- disable the Email provider/authentication method rather than merely hiding signup UI;
- ensure anonymous/phone/password alternatives are not enabled as unintended local VVIP identity paths.

This is an external provider-security mutation and requires owner/security authorization.

### Gate C — terminate legacy session refresh capability

Use supported Auth administration controls to terminate/remove the legacy Auth users or their sessions. Do not manipulate Supabase-managed Auth schema tables with ad-hoc SQL as the preferred execution method.

Because existing JWTs can remain valid until expiry even after user deletion, completion evidence must prove:

- no reusable legacy refresh-token/session path remains;
- no new Supabase password/email sign-in can be established;
- elapsed JWT-expiry boundary or explicit session validation prevents old sessions from authorizing sensitive VVIP actions.

### Gate D — retire legacy Auth users

Retire the seven historical Auth users only after confirming:

- `public.profiles` is not cascade-dependent on `auth.users`;
- no Storage objects are owned by the Auth users in a way that blocks supported deletion;
- no external consumer still depends on their Supabase Auth identities.

Never rewrite the six unbound profiles to a Clerk subject by email. Their correct behavior remains `identity_migration_required` until separately re-verified.

### Gate E — post-retirement proof

Require:

- Email/password provider disabled;
- legacy Auth credential count retired or otherwise made non-authenticating by supported provider controls;
- sessions/refresh capability retired;
- `public.profiles` row count unchanged unless an independently approved data operation says otherwise;
- Clerk-bound/unbound profile counts accounted for;
- Phase A subject-first resolver proof still green;
- browser launch tree still contains no Supabase password-auth runtime;
- Phase B remains untouched unless separately authorized.

## Hard boundaries

No auto-link by email. No profile deletion by association. No country activation. No Phase B migration. No real Production listing mutation. No direct edit of Supabase-managed Auth schema as an unsupported shortcut.
