# VVIP TIGER — Legacy Authentication Runtime Removal

- **Original date:** 2026-08-08
- **Convergence update:** 2026-08-15
- **Architecture decision:** `docs/architecture/ADR-2026-08-08-federated-identity-sovereignty.md`
- **Policy:** `project-control/security/federated-identity-policy.v1.json`
- **Status:** REMOVED FROM CURRENT PRODUCT TREE

## Removed executable legacy authentication/recovery files

The following historical runtimes were removed after repository evidence showed that they were outside the official Clerk/federated identity path or contradicted delegated recovery:

```text
auth.js
auth-supabase.js
scripts/supabase-auth-bridge.js
scripts/require-auth.js
reset-password.js
```

### Why removal was required

`auth.js`, `auth-supabase.js`, `scripts/supabase-auth-bridge.js`, and `reset-password.js` retained executable first-party password authentication/recovery behavior from older Firebase/Supabase experiments. Keeping executable copies in the product tree contradicted the binding Federated Identity Sovereignty decision even when they were no longer linked from the official UI.

`scripts/require-auth.js` was a separate legacy session-authority guard. It called `window.vvipSupabase.auth.getSession()` and treated a Supabase-managed browser session as the authority for private-profile access. It also logged the session user's email to the browser console. The current architecture instead obtains a short-lived external Clerk session token for the Supabase data client with Supabase session persistence and automatic refresh disabled. Keeping the legacy guard executable would preserve a second, contradictory browser-session model and unnecessary identity logging.

The current identity path is external/federated through Clerk, with Supabase used as the data and authorization layer under the externally authenticated session.

## Recovery compatibility route

`reset-password.html` is intentionally retained as a legacy URL compatibility surface, but it no longer loads Firebase or implements password reset. It redirects to:

```text
index.html?recovery=provider
```

This preserves old bookmarks/routes while returning recovery responsibility to the external identity entry path.

## Evidence of non-use before removal

The historical audit `docs/VVIP_TIGER_LEGACY_AUTH_AUDIT.md` had already classified the retired authentication runtimes as old/non-official. Repository searches before the 2026-08-08 removal found no current HTML `<script src>` references to `auth.js`, `auth-supabase.js`, or `scripts/supabase-auth-bridge.js`.

`reset-password.js` was still referenced only by the legacy reset page; that page was converted in the same slice to a provider-recovery compatibility redirect before the script was removed.

For the 2026-08-15 convergence, repository search found the executable expression `vvipSupabase.auth.getSession` only in `scripts/require-auth.js`. The official private-profile/runtime path is Clerk-based, and the older audit had already classified `scripts/require-auth.js` as non-official. `scripts/profile-loader.js`, another historical companion named by the July audit, was already absent from the current tree.

## Files intentionally retained

`auth-flow.html` is retained because it is a safe redirect to `index.html` and does not implement authentication or password handling.

`reset-password.html` is retained only as the delegated-recovery compatibility redirect described above.

Historical documentation is retained only where it does not create an executable authentication surface. Git history preserves deleted source for forensic or rollback inspection without leaving it active in the current product tree.

## Regression prevention

`tests/federated-identity-sovereignty.test.cjs`:

- requires all five retired executable runtime paths to remain absent, including `scripts/require-auth.js`;
- scans owned authentication/runtime surfaces for first-party password sign-in/reset/sign-up constructs;
- verifies the legacy reset URL is redirect-only and contains no Firebase or reset form;
- proves the current browser identity bridge obtains external Clerk session tokens with `persistSession: false` and `autoRefreshToken: false` for Supabase.

A future local-password or parallel Supabase browser-session authority may not be reintroduced silently. Any change to the federated-only architecture requires an explicit owner-approved superseding ADR.

## Remaining independent identity gap

Removal of legacy authentication runtimes does **not** resolve the separate historical profile-linking issue in `vvip_resolve_own_profile`: the `legacy_profile_recovered` email-matching ownership-transfer path remains a known gap and requires independent forward-migration treatment before Production identity launch.

```text
LEGACY_PASSWORD_RUNTIME=REMOVED
LEGACY_SUPABASE_SESSION_GUARD=REMOVED
LOCAL_PASSWORD_RECOVERY=REMOVED
DELEGATED_RECOVERY=REQUIRED
FEDERATED_IDENTITY_POLICY=BINDING
EMAIL_AUTO_LINKING_GAP=OPEN
PRODUCTION_DB_MUTATION=NOT_AUTHORIZED
```
