# MASTER PROJECT STATE — VVIP TIGER

> This file is the project-state authority for continuation. GitHub remains the code authority. Chat sessions are temporary execution sessions.

## Continuation protocol

Every new work session must follow:

```text
READ → VERIFY → PLAN → EXECUTE
```

Never redo verified work without evidence of drift. Never infer Production authority from technical eligibility.

## Repository

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Default branch: `main`
- Current frozen release source H2: `35352136090bd39d9dd6bddc6682c9b9a2d3cafc`
- H2 is merge commit for PR #181.
- PRG control branch: `ops/prg-v1-production-release-gate-20260809`

## Phase A

- Production Phase A: VERIFIED.
- Production ledger includes `20260808221204 global_launch_phase_a_identity_convergence`.
- Production live profile resolver is subject-first and semantically fail-closed against email ownership transfer.

## Phase B source

- Migration path: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`
- Frozen SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`
- Phase B has been proven on sovereign Staging.
- Phase B is **not** present in Production migration ledger.
- Production Phase B target authority/marketplace table count is currently 0.
- Production `listing-media` bucket is currently absent.
- Production classification: `PHASE_B_ABSENT_CLEAN`.

## Identity

- Repository IDENTITY-01 migration path: `supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql`
- Frozen H2 SHA-256: `ee361b3bbdbef9695ac23d6ad597c49c4732f19ee45d1154745e5e387e12d0d6`
- Staging ledger contains `20260808211445 identity_01_fail_closed_profile_resolver_staging_proof`.
- Staging runtime transaction proof: PASS; rollback verified; synthetic residue zero.
- Production does not have the standalone IDENTITY-01 ledger entry, but its Phase A-deployed resolver is semantically canonical and hardened (`pg_catalog,public`, subject-first, no email ownership transfer, anon/public execute denied).
- Do not reapply standalone IDENTITY-01 to Production unless future drift proves it necessary.
- Observed hygiene note: browser-only compatibility `p_email` can create a separate profile sharing an email with an unbound legacy row; it does not claim the legacy row. This is not a current ownership-transfer vulnerability but may be tightened later as identity/data-quality hardening.

## Completed release gates

### SRPC v1

- Exact H0 source proof: PASS.
- Staging Phase B proof: PASS.
- Runtime proof + rollback residue zero: PASS.
- Cryptographic attestation: VERIFIED.

### Steel Shield / H1

- Pin-only commit H1: `1e7fb3c1e43415e5bfaee957b6ab553ae68bc139`.
- Migration bytes unchanged.
- Fresh H1 CI: GREEN.

### SMG v1

- Exact merge authorization used only for PR #181/H1/base.
- PR #181 merged with merge commit H2.

### RCG v1

- H2 source defect: FALSE.
- Production artifact builder works with valid Production-shaped configuration.
- Root cause of old H2 build failure was missing `production-build` configuration, not source code.

### PCG v1

- `TIGER_CLERK_PUBLISHABLE_KEY`: VERIFIED.
- Clerk frontend API: `clerk.tigerautoparts.shop`.
- `TIGER_SUPABASE_URL`: VERIFIED.
- `TIGER_SUPABASE_PUBLISHABLE_KEY`: VERIFIED.
- `TIGER_DEFAULT_COUNTRY_CODE`: ABSENT intentionally.
- Verification #04: `PCG_VALUES_VERIFIED_ARTIFACT_ELIGIBLE`.
- Production deployment: FALSE.

### EHG v1

- `production-build`: required reviewer `nzuodezuode-byte`, prevent self-review, admin bypass disabled, `main` only, 0 tags.
- `github-pages`: same controls, `main` only, 0 tags.
- Human Gate proof: workflow blocked before first step, no runner, no steps, self-approval unavailable.
- Proof workflow safely cancelled.
- EHG state: `CLOSED`.

## PRG v1 current state

- PRG specification and execution plan created.
- PRG read-only proof run: `31320991777` = SUCCESS.
- Proof control SHA: `93ba1ec53391290e7f90f73bcc54f2882b01a407`.
- Proof artifact ID: `9040157642`.
- Proof artifact digest: `sha256:6810de3231076196722c3b6d7f71f8b1f9bfc844a944cf0b8a99d2d9e29f2f26`.
- H2 exact proof: PASS.
- Phase B byte proof: PASS.
- IDENTITY-01 byte proof: PASS.
- PCG closed proof: PASS.
- EHG closed proof: PASS.
- Country activation configured: FALSE.
- Production read-only preflight: COMPLETE.
- Production DB authorization candidate: PREPARED, not authorized.

## Production project

- Supabase Production ref: `zelcngyyvbomuzokvuxo`.
- Name: `vvipautoparts-blip's Project`.
- Region: `ap-northeast-2`.
- Status at PRG preflight: `ACTIVE_HEALTHY`.
- Postgres: `17.6.1.127`.
- Two migration-ledger reads during PRG were identical.
- No Production mutation was performed during PRG preflight.

## Staging project

- Branch: `lc04-sovereign-staging-20260807`.
- Branch id: `98c087dc-8120-4d72-9e29-05d329e1bf1c`.
- Project ref: `mduummtnlupktjaujgyx`.
- Parent: `zelcngyyvbomuzokvuxo`.
- Status observed: `ACTIVE_HEALTHY`.

## Provider/domain readiness

### Clerk

- Production instance exists.
- Production publishable key verified without storing raw secret material in Git.
- Frontend API = `clerk.tigerautoparts.shop`.
- Clerk Production DNS connection still requires external DNS/provider action.

### GitHub Pages

- Repository H2 contains `CNAME` = `tigerautoparts.shop`.
- GitHub Pages API currently reports `cname=null` and `html_url=https://vvipautoparts-blip.github.io/TIGER-VVIP/`.
- GitHub Pages custom-domain setting therefore still requires owner/UI action.

## Remaining mandatory owner intervention

See `reports/prg/v1/owner-intervention-queue.md`.

Consolidated classes:

1. Connect Clerk Production DNS records for `clerk.tigerautoparts.shop` through the DNS provider.
2. Configure/verify GitHub Pages custom domain `tigerautoparts.shop`.
3. Review a fresh no-drift Production DB capsule and, only then, provide exact DB authorization.
4. During the actual authorized release, `nzuodezuode-byte` must approve protected `production-build` and `github-pages`; exact Web deployment authorization remains separate.

## Current hard authority flags

```text
PRODUCTION_DB_AUTHORIZED=false
PRODUCTION_WEB_AUTHORIZED=false
PRODUCTION_DEPLOYED=false
PRODUCTION_DB_MUTATED_BY_PRG=false
COUNTRY_ACTIVATED=false
OWNER_SEEDED=false
DEFAULT_COUNTRY_CODE_CONFIGURED=false
```

## Next machine actions

Until owner returns, the technical agent should:

1. Validate all PRG evidence in a fresh branch-scoped CI run.
2. Re-read current `main`, PCG, EHG, Production project identity, and migration ledger for drift.
3. Prepare final Production DB no-drift capsule, but do not activate its authorization phrase.
4. Prepare Web release readiness capsule as BLOCKED on domain/DNS until external action is complete.
5. Prepare a Draft documentation/state PR if appropriate; do not merge automatically.
6. Do not deploy Production, activate a country, seed an owner, or change Production data.
