# VVIP TIGER — MASTER PROJECT STATE

> Canonical continuity record. GitHub code/evidence is the implementation source of truth. This file summarizes only verified state and must not claim a gate closed without durable evidence.

**Updated:** 2026-08-09 17:53 +03:00  
**Repository:** `vvipautoparts-blip/TIGER-VVIP`  
**Current main / H2:** `35352136090bd39d9dd6bddc6682c9b9a2d3cafc`

## Operating protocol

`READ → VERIFY → PLAN → EXECUTE`

No evidence → no release. Autonomous technical preparation continues without per-step owner interruption. Human-only or sovereign actions are accumulated in one Owner Action Queue. Production mutation, production deployment, country activation, persistent owner seeding, real Production data mutation, credential retirement, or provider-security changes require their explicit gate.

## Verified completed gates

- Phase A Production identity convergence: VERIFIED.
- Phase B code PR #181: MERGED into H2.
- SRPC Phase B Staging proof: VERIFIED.
- Steel Shield Phase B migration pin: VERIFIED GREEN.
- SMG exact merge: COMPLETED; H2 is current `main`.
- RCG H2 diagnosis: CLOSED; no H2 source defect found.
- PCG v1: CLOSED with `PCG_VALUES_VERIFIED_ARTIFACT_ELIGIBLE`.
- EHG v1: CLOSED; `production-build` and `github-pages` require `nzuodezuode-byte`, prevent self-review, disable administrator bypass, and allow `main` only.
- EHG Human Gate Proof: PASS and safely cancelled without deployment.

## Phase B exact release subject

- Migration: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`
- SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`
- Production Supabase ref: `zelcngyyvbomuzokvuxo`
- Staging ref used for proof: `mduummtnlupktjaujgyx`

## Production read-only Phase B state

Current classification: `STATE_0_CLEAN_PRE_PROMOTION`.

Verified:
- Phase A ledger present exactly once.
- Phase B ledger absent.
- all 12 Phase B target tables absent.
- Phase B marketplace/authority helper functions absent.
- `listing-media` bucket absent.
- `profiles` has RLS + FORCE RLS.
- anonymous profile table privileges: none.
- authenticated profile privilege: SELECT only.
- duplicate non-empty Clerk subject groups: zero.
- current profile resolver is subject-first and fail-closed: no `legacy_profile_recovered`, includes `identity_migration_required`, no detected email ownership update pattern.

Production Phase B has **not** been applied.

## Staging Phase B reference state

Phase B ledger present exactly once. Authority principals, countries, listings, media, favorites and listing audit business rows are all zero. `listing-media` bucket exists. This remains a dark-launch zero-business-state reference.

## Production configuration

`production-build` contains verified Production values for:
- Clerk publishable key (raw value not recorded in evidence)
- Supabase Production URL
- Supabase public publishable key

`TIGER_DEFAULT_COUNTRY_CODE` remains absent intentionally. No country is activated by configuration.

## Identity state

### Deployed resolver — verified compliant

The historical email ownership-transfer resolver gap is closed in Production. Current resolver is exact-subject first, returns `identity_migration_required` for unbound legacy detection, exposes no `legacy_profile_recovered` path, and has no detected email ownership update pattern.

### Legacy Supabase Auth credential surface — blocking

A separate historical credential surface remains in Production even though current repository runtime uses Clerk and contains no `signInWithPassword` or `supabase.auth` code path:
- 7 Supabase Auth users, all provider `email`.
- all 7 contain encrypted password credentials.
- 6 confirmed email users.
- 4 sessions.
- 6 refresh tokens, 4 not revoked.
- latest observed legacy sign-in/session activity was 2026-07-05.
- 7 Auth user UUIDs match existing `public.profiles.id` values, but `profiles` has no FK to `auth.users`.
- six profiles remain without Clerk subject and must **not** be auto-linked by email.

Binding policy is `FEDERATED_IDENTITY_ONLY` and explicitly forbids a parallel Supabase password system. Therefore Production public release remains blocked until this credential surface is retired through its own audited security gate while preserving `public.profiles`.

## Production advisors / legacy schema review

Security and performance advisors were re-read before Phase B Production mutation.

- Server-only `email_verifications`, `otp_codes`, `vvip_clerk_profiles`: FORCE RLS and no browser grants; informational.
- `parts_sync_vehicle_reference_ids()` and `set_updated_at()`: mutable search path warning, but not SECURITY DEFINER and no anon/authenticated/public EXECUTE; hardening debt, not browser reachable.
- `vvip_resolve_own_profile(text)`: intentional authenticated SECURITY DEFINER RPC, anon/public execute denied, fixed search path, subject-first fail-closed behavior verified.
- Legacy public tables still grant broad SQL privileges and rely on RLS. Actual READ ONLY test as `anon` exposed zero sensitive legacy rows. All sensitive legacy tables currently contain zero rows. `account_types` contains 27 rows and intentionally exposes 8 active registration options.
- Current H2 marketplace runtime uses the new `vvip_marketplace_*` substrate, not the legacy tables.

Legacy browser-grant minimization remains a later hardening task, not a current sensitive-data leak.

## Existing public GitHub Pages deployment — containment required

The currently public GitHub Pages deployment is **not H2**.

Latest successful deployment:
- Deployment ID `5760416157`
- Workflow run `30999967177`
- SHA `4cc292e626fea39f3b0e56b98781d521efef789d`
- Deployed 2026-08-05
- URL `https://vvipautoparts-blip.github.io/TIGER-VVIP/`

That old workflow uploaded the entire repository (`path: .`). Its old `index.html` contains Clerk Development markers (`pk_test_` and `.clerk.accounts.dev`). It must not be treated as Production. Strongest action is to temporarily unpublish/disable Pages until the controlled Production release replaces it.

## External readiness still open

- Clerk Production instance exists and its publishable key decodes to `clerk.tigerautoparts.shop`.
- Clerk Production DNS connection has not yet been independently verified complete.
- GitHub Pages API currently reports no custom domain (`cname=null`); repository Pages settings + DNS remain an external prerequisite for `tigerautoparts.shop`.
- Google sign-in custom Production credentials are conditional on whether Google login is required at launch.

## Production release workflow review

The release pipeline is functionally fail-closed behind two verified Environment gates, but pre-release hardening is recommended before Production because `.github/workflows/pages.yml` currently:
- triggers on every push to `main` as well as manual dispatch;
- references GitHub Actions by mutable major tags;
- grants Pages/id-token permissions at workflow scope rather than deploy-job scope;
- dynamically upgrades pip;
- installs pytest without a pinned version in the workflow.

No hardening code change has been made silently because it would create a new release source and requires a dedicated reviewed design/change cycle.

## Active gate

`PRG v1 — Production Release Gate`

Current state:

`PRG_PREPARED_WITH_BLOCKERS_NOT_PRODUCTION_AUTHORIZATION_ELIGIBLE`

Current blocking classes:
1. stale public GitHub Pages development deployment containment;
2. Clerk Production DNS verification;
3. GitHub Pages custom-domain/DNS readiness;
4. legacy Supabase email/password credential retirement;
5. release-workflow hardening decision.

Future sovereign authorization phrase, only after blockers are cleared and exact state is revalidated:

`APPROVE_PRODUCTION_RELEASE_EXACT`

That phrase is **not currently eligible** and will not authorize country activation, persistent owner seeding, real application data mutation, secret changes, Environment bypass, or legacy credential retirement.

## Owner Action Queue

Canonical queue: `reports/prg/v1/owner-action-queue.json` on `ops/prg-v1-production-release-20260809`.

The technical operator continues all independent work automatically. Human actions are accumulated rather than requested one-by-one.

## Evidence locations

- `reports/ehg/v1/closure.json` on `ops/ehg-v1-environment-hardening-20260809`
- `reports/pcg/v1/verification-04.json` on `ops/pcg-v1-production-config-20260809`
- `reports/prg/v1/preflight.json`
- `reports/prg/v1/release-workflow-review.json`
- `reports/prg/v1/external-readiness.json`
- `reports/prg/v1/production-advisors-review.json`
- `reports/prg/v1/legacy-auth-retirement-review.json`
- `reports/prg/v1/current-pages-deployment-review.json`
- `reports/prg/v1/authorization-capsule.json`
- `reports/prg/v1/owner-action-queue.json`

## Hard boundaries

`PRODUCTION_DB_MUTATION = NOT_AUTHORIZED`  
`PRODUCTION_DEPLOYMENT = NOT_AUTHORIZED`  
`LEGACY_AUTH_RETIREMENT = NOT_AUTHORIZED`  
`COUNTRY_ACTIVATION = NOT_AUTHORIZED`  
`PERSISTENT_OWNER_SEEDING = NOT_AUTHORIZED`  
`REAL_PRODUCTION_DATA_MUTATION = NOT_AUTHORIZED`
