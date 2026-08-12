# VVIP TIGER — MASTER PROJECT STATE (ARCHIVE PRE-2026-08-12)

> Archived verbatim from the prior `docs/MASTER_PROJECT_STATE.md` before the 2026-08-12 owner checkpoint. This file is provenance/history only. Current continuation authority is `docs/MASTER_PROJECT_STATE.md`.

> GitHub is the code authority. This file is the project-state authority for continuation. Chat sessions are temporary execution sessions.

## Continuation protocol

```text
READ → VERIFY → PLAN → EXECUTE
```

Never reuse stale authorization. Never infer authority from a completed deployment. Fail closed on source, database, provider, or evidence drift.

## Current source truth

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Default branch: `main`
- Current `main` / verified deployed Web source: `ce0a9654dc8bcd3e06dd2e1425093649a5ca8ae2`
- Historical Phase B product merge H2: `35352136090bd39d9dd6bddc6682c9b9a2d3cafc`
- H2 is an ancestor of current `main`.
- PR #183 isolated the missing-production-config test from ambient environment variables.
- PR #184 moved the Production Pages build output outside the checkout source tree and added a regression test.
- PR #185 closed post-deployment public-artifact/runtime gaps and added live same-SHA dependency verification after Pages deployment.

## Phase A

Production Phase A remains verified after Phase B:

```text
PHASE_A_REGRESSION=PASS
```

Fresh read-only post-Phase-B proof verified:
- `profiles` exists with RLS + FORCE RLS;
- authenticated profile table privilege remains SELECT-only;
- browser privilege violation count = 0;
- retired credential surfaces remain server-only;
- public helper count = 0;
- duplicate Clerk subject groups = 0.

## Phase B — Production reality

Migration:
`supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`

Frozen SHA-256:
`9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`

Production Supabase:
- ref: `zelcngyyvbomuzokvuxo`
- region: `ap-northeast-2`
- Phase B ledger entry: `20260809223120 global_launch_phase_b_marketplace_convergence`
- classification: `PHASE_B_APPLIED_DARK_LAUNCH_CANONICAL`

Fresh read-only structural reconciliation verified:
- all 12 Phase B authority/marketplace target tables exist;
- RLS + FORCE RLS are enabled on all 12;
- expected Phase B indexes, triggers, functions, policies and privilege boundaries are present;
- `listing-media` bucket exists, is private, 10 MiB, JPEG/PNG/WebP only;
- authority role/permission/principal/assignment/country/audit row counts are all zero;
- marketplace listing/media/favorite/audit row counts are all zero.

Therefore:

```text
PRODUCTION_DB_PHASE_B_APPLIED=true
PRODUCTION_DB_POST_APPLY_STRUCTURAL_PROOF=PASS
COUNTRY_ACTIVATED=false
OWNER_SEEDED=false
MARKETPLACE_SEED_RESIDUE=0
```

## Identity

Repository IDENTITY-01 migration:
`supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql`

Frozen H2 SHA-256:
`ee361b3bbdbef9695ac23d6ad597c49c4732f19ee45d1154745e5e387e12d0d6`

- Sovereign Staging runtime proof: PASS, transaction rolled back, synthetic residue zero.
- Production does not need standalone IDENTITY-01 while the deployed Phase A resolver remains semantically canonical.
- Production resolver is subject-first, does not transfer ownership by browser email, has hardened search path, and denies anon/public execute.
- Compatibility `p_email` duplicate-email hygiene remains future hardening; it is not an ownership-transfer vulnerability.

## Production Web deployment — verified reality

GitHub Actions:
- workflow: `Deploy TIGER VVIP production artifact`
- run: `31387230464` / run #247
- verified attempt: `2`
- source: `ce0a9654dc8bcd3e06dd2e1425093649a5ca8ae2`
- build job `93514395561`: SUCCESS
- deploy job `93514395308`: SUCCESS
- GitHub Pages deployment `5835409741`: SUCCESS
- deployed Pages URL: `https://vvipautoparts-blip.github.io/TIGER-VVIP/`
- artifact ID: `9064183402`
- artifact digest: `sha256:c943ae4b3f3739912d68ad9b7adde8ab745975fd9780933bdeb8d8d3989c9cc0`

The deploy job performed a live post-deployment same-SHA verification and passed all required public-surface/runtime checks. Evidence includes:

```text
VVIP_RUNTIME_DEPENDENCIES=PASS
VVIP_POST_DEPLOY_SMOKE=PASS
```

The live verification fetched the production public files, checked that `runtime-config.js` contained the exact deployed SHA, rejected test Clerk configuration, probed the live Clerk production CDN endpoints, and probed Supabase REST for `vvip_marketplace_listings` with the public browser key.

Therefore:

```text
PRODUCTION_WEB_DEPLOYED=true
PRODUCTION_WEB_RUNTIME_VERIFIED=true
PRODUCTION_WEB_SOURCE_SHA=ce0a9654dc8bcd3e06dd2e1425093649a5ca8ae2
```

## Custom-domain boundary

Current GitHub Pages API still reports:

```text
cname=null
html_url=https://vvipautoparts-blip.github.io/TIGER-VVIP/
https_enforced=true
```

The apex DNS already contains the four GitHub Pages A records and `www` points to `vvipautoparts-blip.github.io`. Clerk Production DNS records were added at the DNS provider and Clerk configuration reached verified state; the live Clerk CDN probe also passed inside run #247.

However, `tigerautoparts.shop` is not yet registered as the GitHub Pages custom domain in the Pages API. Do not equate the verified default Pages runtime with completed custom-domain launch until the Pages custom-domain setting and apex HTTPS are verified.

## Provider state

### GitHub Pages
- Production deployment succeeded and live same-SHA verification passed.
- Default Pages URL is the currently verified production URL.
- Custom domain remains not configured in GitHub Pages API (`cname=null`).

### Clerk
- Production publishable configuration is active.
- configured frontend API target: `clerk.tigerautoparts.shop`.
- Clerk Production DNS configuration was corrected at the DNS provider.
- Live Clerk CDN dependency probe passed during run #247 attempt 2.
- Do not expose Clerk secret keys.

### Supabase
- Production project remains `zelcngyyvbomuzokvuxo`.
- Marketplace Phase B schema is present and dark-launched.
- Live browser-key REST dependency probe passed during run #247 attempt 2.

## Advisor reconciliation

Fresh post-Phase-B security advisors include existing baseline warnings plus expected Phase-B advisory classes.

Phase-B-specific observations include:
- `rls_enabled_no_policy` INFO on server-only authority/audit tables — intentional because browser DML grants are absent;
- authenticated SECURITY DEFINER warning for `vvip_marketplace_review_listing` — intentional trusted review RPC, constrained by authority checks and previously runtime-proven on Staging;
- anonymous-policy warnings on marketplace/storage read surfaces — policy inspection confirms anon access is read-only and requires ACTIVE listing + active country; owner mutation policies are authenticated-only.

Never claim global zero advisor warnings. Release criterion is zero new **material** Phase-B-attributable security regressions.

## Reconciliation governance

The earlier PRG branch `ops/prg-v1-production-release-gate-20260809` is historical evidence and is stale as current state because Production changed after its closure.

This state file records already-observed state. It does **not** retroactively invent authorization for past Production actions and does not grant authority for future Production writes.

## Current hard state flags

```text
PRODUCTION_DB_PHASE_B_APPLIED=true
PRODUCTION_DB_POST_APPLY_STRUCTURAL_PROOF=PASS
PRODUCTION_WEB_DEPLOYED=true
PRODUCTION_WEB_RUNTIME_VERIFIED=true
PRODUCTION_WEB_DEPLOYMENT_URL=https://vvipautoparts-blip.github.io/TIGER-VVIP/
PRODUCTION_WEB_SOURCE_SHA=ce0a9654dc8bcd3e06dd2e1425093649a5ca8ae2
CLERK_LIVE_DEPENDENCY_PROBE=PASS
SUPABASE_LIVE_DEPENDENCY_PROBE=PASS
POST_DEPLOY_SMOKE=PASS
CUSTOM_DOMAIN_CONFIGURED=false
COUNTRY_ACTIVATED=false
OWNER_SEEDED=false
DEFAULT_COUNTRY_CODE_CONFIGURED=false
FUTURE_PRODUCTION_WRITE_AUTHORIZED=false
```

## Remaining owner/external work

1. Configure `tigerautoparts.shop` as the GitHub Pages custom domain and verify apex HTTPS/certificate readiness.
2. Keep country activation and Owner seeding as separate sovereign gates; they are not implied by the current dark launch.
3. Any future Production mutation requires fresh exact-scope authorization after no-drift verification.

## Resume procedure

1. Read this file first.
2. Re-read current `main`, Production migration ledger, Pages state, and provider state.
3. Compare against the exact values above.
4. If drift exists, reconcile first; do not reuse old capsules.
5. Never retroactively label an already-completed action as owner-authorized unless contemporaneous evidence proves it.
