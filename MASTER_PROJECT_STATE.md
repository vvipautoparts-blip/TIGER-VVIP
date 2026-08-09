# MASTER PROJECT STATE — VVIP TIGER

> This file is the project-state authority for continuation. GitHub remains the code authority. Chat sessions are temporary execution sessions.

## Continuation protocol

Every work session must follow:

```text
READ → VERIFY → PLAN → EXECUTE
```

Never redo verified work without evidence of drift. Never infer Production authority from technical eligibility.

## Repository / frozen release

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Default branch: `main`
- Frozen release source H2: `35352136090bd39d9dd6bddc6682c9b9a2d3cafc`
- H2 is merge commit for PR #181.
- PRG control branch: `ops/prg-v1-production-release-gate-20260809`

## Phase A

- Production Phase A: VERIFIED.
- Production ledger contains `20260808221204 global_launch_phase_a_identity_convergence`.
- Production live profile resolver is subject-first and semantically fail-closed against email ownership transfer.

## Phase B source and remote state

- Migration: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`
- Frozen SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`
- Sovereign Staging proof: PASS.
- Production ledger entry: ABSENT.
- Production Phase B target authority/marketplace table count: 0.
- Production `listing-media` bucket: ABSENT.
- Production classification: `PHASE_B_ABSENT_CLEAN`.

## Identity

- Repository IDENTITY-01 migration: `supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql`
- Frozen H2 SHA-256: `ee361b3bbdbef9695ac23d6ad597c49c4732f19ee45d1154745e5e387e12d0d6`
- Staging ledger contains `20260808211445 identity_01_fail_closed_profile_resolver_staging_proof`.
- Staging runtime transaction proof: PASS; rollback verified; synthetic residue zero.
- Production standalone IDENTITY-01 ledger entry: ABSENT.
- Production Phase A-deployed resolver: semantically canonical and hardened (`pg_catalog,public`, exact subject first, no email ownership-transfer path, anon/public execute denied).
- Classification: `SEMANTICALLY_CANONICAL_FROM_PHASE_A_READ_ONLY_INSPECTION`.
- Do not reapply standalone IDENTITY-01 unless future drift proves it necessary.
- Hygiene observation: browser-only compatibility `p_email` can create a separate profile sharing an email with an unbound legacy row; it does not claim that row. Treat as future data-quality/identity-hardening work, not an ownership-transfer vulnerability.

## Completed gates

### SRPC v1
- H0 source proof: PASS.
- Staging Phase B proof: PASS.
- Runtime proof + rollback residue zero: PASS.
- Cryptographic attestation: VERIFIED.

### Steel Shield / H1
- H1: `1e7fb3c1e43415e5bfaee957b6ab553ae68bc139`.
- Migration bytes unchanged.
- Fresh H1 CI: GREEN.

### SMG v1
- Exact merge authorization consumed for PR #181 only.
- PR #181 merged to H2.

### RCG v1
- H2 source defect: FALSE.
- Old Production artifact failure root cause: missing environment configuration, not source code.

### PCG v1
- Clerk Production publishable configuration: VERIFIED.
- Clerk frontend API: `clerk.tigerautoparts.shop`.
- Supabase Production URL/public key: VERIFIED.
- `TIGER_DEFAULT_COUNTRY_CODE`: intentionally ABSENT.
- Verification #04: `PCG_VALUES_VERIFIED_ARTIFACT_ELIGIBLE`.
- Production deployment: FALSE.

### EHG v1
- `production-build`: independent reviewer `nzuodezuode-byte`, prevent self-review, admin bypass disabled, `main` only, 0 tags.
- `github-pages`: same controls, `main` only, 0 tags.
- Human Gate proof: blocked before first step; no runner; self-approval unavailable.
- Proof workflow safely cancelled.
- EHG: `CLOSED`.

## PRG v1 — current machine state

PRG machine preparation is complete to the maximum safe non-owner boundary.

Evidence:
- `reports/prg/v1/baseline.json`
- `reports/prg/v1/identity-staging-proof.json`
- `reports/prg/v1/production-read-only-preflight.json`
- `reports/prg/v1/provider-readiness.json`
- `reports/prg/v1/advisors-baseline.json`
- `reports/prg/v1/production-db-authorization-candidate.json`
- `reports/prg/v1/web-release-candidate.json`
- `reports/prg/v1/owner-intervention-queue.md`
- `reports/prg/v1/machine-preparation-closure.json`

Latest completed consolidated validator before this state update:
- workflow: `PRG v1 Read-Only Proof`
- run `31321793137`
- job `93265819851`
- verified control SHA `adbecfdbc3c0c9df2566c9b60eade18950d416ee`
- conclusion: SUCCESS
- artifact `9040380317`
- artifact digest `sha256:3ba580a585cc04d3c8777349ba3d826d56793a80df2f6195ec90b67338acdb9d`

Machine closure state:

```text
PRG_MACHINE_PREPARATION_CLOSED_AWAITING_OWNER_AND_EXTERNAL_ACTIONS
```

## Production project

- Ref: `zelcngyyvbomuzokvuxo`
- Name: `vvipautoparts-blip's Project`
- Region: `ap-northeast-2`
- Status at PRG preflight: `ACTIVE_HEALTHY`
- Postgres: `17.6.1.127`
- Two migration-ledger reads were identical.
- No Production mutation was performed by PRG.

## Staging

- Branch: `lc04-sovereign-staging-20260807`
- Branch id: `98c087dc-8120-4d72-9e29-05d329e1bf1c`
- Project ref: `mduummtnlupktjaujgyx`
- Parent: `zelcngyyvbomuzokvuxo`
- Status observed: `ACTIVE_HEALTHY`

## Production advisor baseline

Captured before Phase B because Phase B is absent in Production.

Security baseline classes include existing findings such as:
- RLS enabled/no policy on selected existing surfaces;
- mutable search_path on selected legacy functions;
- intentional authenticated SECURITY DEFINER advisory for `vvip_resolve_own_profile`;
- anonymous-policy classification on existing RLS surfaces;
- leaked-password protection disabled in Supabase Auth.

Performance baseline includes existing unindexed-FK, RLS init-plan, unused-index, multiple-permissive-policy and Auth connection-strategy findings.

Never claim Production has zero advisor warnings globally. Post-Phase-B comparison must require **zero new Phase-B-attributable material security regressions**.

## Provider/domain readiness

### Clerk
- Production instance exists.
- Production publishable key verified without recording raw secret material in Git.
- Frontend API: `clerk.tigerautoparts.shop`.
- Production DNS connection remains an external DNS/provider action.

### GitHub Pages
- H2 `CNAME`: `tigerautoparts.shop`.
- GitHub Pages API currently reports `cname=null` and `html_url=https://vvipautoparts-blip.github.io/TIGER-VVIP/`.
- Pages custom-domain configuration therefore remains a GitHub UI/external action.

## Prepared but NOT authorized

Production DB candidate is prepared for the current no-drift state:
- Production ref `zelcngyyvbomuzokvuxo` only.
- If later exactly authorized and state remains unchanged, the only allowed DB mutation is the exact Phase B migration with the frozen hash.
- Standalone IDENTITY-01 is not part of that mutation while Production remains semantically canonical.
- No country activation, owner seed, user/business/listing seed, broad `db push`, manual ledger write, or unscoped DDL/DML.

Web release candidate is prepared but blocked on:
1. Production DB authorization/post-apply verification.
2. Clerk Production DNS readiness.
3. GitHub Pages custom-domain readiness.

## Consolidated mandatory owner/external intervention

See `reports/prg/v1/owner-intervention-queue.md`.

Only these intervention classes remain:
1. Connect Clerk Production DNS for `clerk.tigerautoparts.shop` through the DNS provider.
2. Configure/verify GitHub Pages custom domain `tigerautoparts.shop`.
3. Review a **fresh** no-drift Production DB capsule and only then provide exact DB authorization.
4. During actual authorized release, `nzuodezuode-byte` approves `production-build` and `github-pages`; exact Web authorization remains separate.

Optional/not part of current dark-launch gate:
- Country activation.
- Owner seeding.
- `TIGER_DEFAULT_COUNTRY_CODE`.
- Google SSO custom credentials unless Google is explicitly selected as a launch provider.
- Passkeys/premium Clerk features.

## Hard authority flags

```text
PRODUCTION_DB_AUTHORIZED=false
PRODUCTION_WEB_AUTHORIZED=false
PRODUCTION_DEPLOYED=false
PRODUCTION_DB_MUTATED_BY_PRG=false
COUNTRY_ACTIVATED=false
OWNER_SEEDED=false
DEFAULT_COUNTRY_CODE_CONFIGURED=false
```

## Resume procedure when owner returns

1. Re-read `main`, this file, PRG evidence, Production project identity, migration ledger, environment protections, GitHub Pages state, and provider/domain state.
2. Fail closed on any drift.
3. Complete external DNS/domain actions with the owner only where no connector exists.
4. Present one consolidated fresh Production DB authorization capsule.
5. Only after exact owner DB authorization: apply exact Phase B migration and perform post-apply proofs.
6. Then prepare/present separate Web release capsule and authorization.
7. Never infer Production authority from earlier pin/merge/general approvals.
