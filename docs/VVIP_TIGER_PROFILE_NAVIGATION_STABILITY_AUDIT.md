# VVIP TIGER Profile & Navigation Stability Audit

## Purpose
This document records the post-stabilization audit outcome for profile and navigation runtime paths in VVIP TIGER. It serves as an official reference for the currently approved production flow and for safe next-phase planning.

## Audit Scope
The audit reviewed the active runtime path and related profile/navigation behavior without applying runtime code changes. The focus was limited to the checked profile and navigation flow and its linked legacy compatibility surface.

## Current Git Baseline
- Branch: main
- Tracking: main...origin/main
- Working tree: clean
- Latest known merge: 34ffe28 merge: stabilize Clerk private profile runtime

## Official Runtime Path
- index.html is the current Clerk-based entry page.
- clerk-private-profile.html is the official private profile runtime.
- public-profile.html is the current public-facing profile page.
- private-profile.html is a legacy compatibility redirect only.

## Private Profile Routing
Private profile navigation resolves to clerk-private-profile.html as the official destination. The private-profile.html page is retained as a compatibility redirect layer and is not treated as the authoritative runtime implementation.

## Public Profile Routing
The public-facing profile/feed experience runs on public-profile.html and remains connected to the current private-profile route via links to clerk-private-profile.html.

## Logout Behavior
- Official private profile logout uses Clerk signOut.
- Legacy Firebase logout remains only in old unused auth.js and is not part of the current checked runtime path.

## Supabase Profile Source
- Official table: public.profiles
- Official Clerk link column: clerk_user_id
- The old vvip_clerk_profiles path is not operational in the checked runtime files.

## Legacy Files Observed
- auth.js appears legacy/unlinked in the checked pages.
- require-auth.js appears legacy/unlinked in the checked pages.
- profile-loader.js appears legacy/unlinked in the checked pages.
- Do not delete or modify these files in this documentation phase.

## Firebase Remnants
Firebase logic is still present in legacy files but is not linked to the currently checked Clerk runtime path for entry/private profile flow.

## Risk Notes
- Legacy files may confuse future developers if not documented.
- private-profile.html should remain documented as legacy redirect until all links are safely migrated.
- Any cleanup must happen in a separate branch and phase.

## Approved Next Actions
- Run manual smoke test.
- Then optionally create a separate safe cleanup phase for legacy auth/profile files.
- Do not start UI redesign or search/account blueprint implementation before runtime path remains stable.

## Status
- Audit result: stable.
- Action type: documentation only.
- No runtime changes included.
