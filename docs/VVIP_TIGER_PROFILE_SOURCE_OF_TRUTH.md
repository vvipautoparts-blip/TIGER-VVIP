# VVIP TIGER — Profile Source of Truth Decision

## 1. Decision Summary

The long-term official profile source of truth for VVIP TIGER should be `public.profiles`.

The official linkage key should be `clerk_user_id`.

`vvip_clerk_profiles` should be treated as a transitional or current temporary runtime path until the profile flow is unified.

## 2. Current Audit Findings

- `profile-loader.js` exists but is not actually wired into the official profile pages that were audited.
- `clerk-private-profile.html` is the current official private profile route.
- `clerk-private-profile.html` uses an inline script.
- The current official route uses Clerk + Supabase with `clerk_user_id`.
- The current official route reads, creates, and updates data in `vvip_clerk_profiles`.
- `private-profile.html` is only a redirect to `clerk-private-profile.html`.
- `profile-loader.js` and `require-auth.js` contain older paths that depend on Supabase session logic.
- `auth.js` still contains older Firebase-based auth remnants in the repository.

## 3. Why public.profiles Should Become Canonical

- `public.profiles` already exists as the platform-wide profile table.
- `clerk_user_id` has already been prepared inside it through the bridge SQL.
- It is better suited for expansion across account data, status, trials, subscriptions, permissions, and sectors.
- It reduces profile data duplication.
- It aligns with the decision that one Clerk user should map to one Supabase profile row.

## 4. Risk

- The current risk is the presence of two profile sources: `public.profiles` and `vvip_clerk_profiles`.
- Changing `profile-loader.js` alone will not affect the official flow if it is not actually used.
- Changing `clerk-private-profile.html` directly without a formal decision can further confuse the profile data source.
- `vvip_clerk_profiles` should not be deleted before a clear migration plan exists.

## 5. Next Implementation Recommendation

- The next phase should happen on a separate branch.
- The change should stay limited to `clerk-private-profile.html` or to extracting a shared loader from the official path.
- The goal should be to make the official path read, create, and update `public.profiles` through `clerk_user_id`.
- Keep a safe fallback or a clear report when no profile row exists yet.
- Do not delete `vvip_clerk_profiles` in the same phase.
- Do not touch payments or sensitive permissions in that phase.

## 6. Non-Goals

- No code changes in this phase.
- No table deletion.
- No RLS changes.
- No Firebase cleanup.
- No UI change.
- No `profile-loader.js` change now.