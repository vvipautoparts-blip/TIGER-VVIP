# VVIP TIGER — MASTER PROJECT STATE

> GitHub is the code authority. This file is the project-state authority for continuation. Chat sessions are temporary execution sessions.

## Continuation protocol

```text
READ → VERIFY → PLAN → EXECUTE
```

Never reuse stale authorization. Never infer authority from a completed deployment. Fail closed on source, database, provider, or evidence drift.

## Current source truth

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Default branch: `main`
- Current `main` / deployed Web source: `3d8bbfc8611e53510b3bb776b8d9752df6595d8d`
- Historical Phase B product merge H2: `35352136090bd39d9dd6bddc6682c9b9a2d3cafc`
- H2 is an ancestor of current `main`.
- H2 → current `main`: 6 commits, 0 behind; effective changed files are release-harness/test only:
  - `.github/workflows/pages.yml`
  - `tests/pages-production-artifact-isolation.test.cjs`
  - `tests/test_vvip_public_release.py`
- PR #183 isolated the missing-production-config test from ambient environment variables.
- PR #184 moved the Production Pages build output outside the checkout source tree and added a regression test.
- No Phase B migration bytes or product runtime files changed in this H2 → current-main drift.

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

## Production Web deployment — observed reality

GitHub Actions run:
- workflow: `Deploy TIGER VVIP production artifact`
- run: `31338179484`
- source: `3d8bbfc8611e53510b3bb776b8d9752df6595d8d`
- build job `93307359324`: SUCCESS
- deploy job `93308077474`: SUCCESS
- GitHub Pages deployment `5823332376`: SUCCESS
- deployed Pages URL: `https://vvipautoparts-blip.github.io/TIGER-VVIP/`
- artifact ID: `9045047873`
- artifact digest: `sha256:f7c7f16fd1ec49b27738c01560ca7a972a376700ae5ef9ee77ae87f66187f7fd`
- artifact release manifest: `releaseEligible=true`, `sourceSha=3d8bbfc8611e53510b3bb776b8d9752df6595d8d`
- artifact Production runtime config targets Supabase Production and keeps `defaultCountryCode` empty.

Current GitHub Pages API still reports:

```text
cname=null
html_url=https://vvipautoparts-blip.github.io/TIGER-VVIP/
https_enforced=true
```

Thus Web is deployed on the default Pages URL, but `tigerautoparts.shop` is not yet configured as the Pages custom domain.

## Provider state

### GitHub Pages
- Production deployment exists and succeeded.
- Custom domain remains not configured in Pages API.

### Clerk
- Production publishable configuration was previously verified.
- configured frontend API target: `clerk.tigerautoparts.shop`.
- Current external DNS readiness must be verified through Clerk/DNS provider before relying on the custom domain.
- Do not expose Clerk secret keys.

## Advisor reconciliation

Fresh post-Phase-B security advisors include existing baseline warnings plus expected Phase-B advisory classes.

Phase-B-specific observations include:
- `rls_enabled_no_policy` INFO on server-only authority/audit tables — intentional because browser DML grants are absent;
- authenticated SECURITY DEFINER warning for `vvip_marketplace_review_listing` — intentional trusted review RPC, constrained by authority checks and previously runtime-proven on Staging;
- anonymous-policy warnings on marketplace/storage read surfaces — policy inspection confirms anon access is read-only and requires ACTIVE listing + active country; owner mutation policies are authenticated-only.

Never claim global zero advisor warnings. Release criterion is zero new **material** Phase-B-attributable security regressions.

## Reconciliation governance

The earlier PRG branch `ops/prg-v1-production-release-gate-20260809` is historical evidence and is stale as current state because Production changed after its closure.

Current reconciliation branch:
`ops/production-reconciliation-20260810`

This reconciliation records already-observed state. It does **not** retroactively invent authorization for past Production actions and does not grant authority for future Production writes.

## Current hard state flags

```text
PRODUCTION_DB_PHASE_B_APPLIED=true
PRODUCTION_DB_POST_APPLY_STRUCTURAL_PROOF=PASS
PRODUCTION_WEB_DEPLOYED=true
PRODUCTION_WEB_DEPLOYMENT_URL=https://vvipautoparts-blip.github.io/TIGER-VVIP/
CUSTOM_DOMAIN_CONFIGURED=false
COUNTRY_ACTIVATED=false
OWNER_SEEDED=false
DEFAULT_COUNTRY_CODE_CONFIGURED=false
FUTURE_PRODUCTION_WRITE_AUTHORIZED=false
```

## Remaining owner/external work

1. Configure/verify GitHub Pages custom domain `tigerautoparts.shop`.
2. Connect/verify Clerk Production DNS for `clerk.tigerautoparts.shop` through Clerk + the DNS provider.
3. Keep country activation and Owner seeding as separate sovereign gates; they are not implied by the current dark launch.
4. Any future Production mutation requires a fresh exact-scope authorization after no-drift verification.

## Resume procedure

1. Read this file and reconciliation evidence.
2. Re-read current `main`, Production migration ledger, Pages state, and provider state.
3. Compare against the exact values above.
4. If drift exists, reconcile first; do not reuse old capsules.
5. Never retroactively label an already-completed action as owner-authorized unless contemporaneous evidence proves it.
