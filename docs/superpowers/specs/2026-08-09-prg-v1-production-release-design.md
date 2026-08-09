# PRG v1 — Production Release Gate Design

## Status

APPROVED FOR PREPARATION / PRODUCTION AUTHORITY NOT GRANTED.

The owner authorized autonomous technical preparation and asked that all human-only actions be accumulated for a final handoff. This document therefore permits read-only Production inspection, evidence generation, isolated control-plane work, and non-Production verification. It does not permit Production database mutation, GitHub Pages deployment approval, country activation, owner seeding, billing changes, or provider-secret changes.

## Frozen release subject

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Exact application source H2: `35352136090bd39d9dd6bddc6682c9b9a2d3cafc`
- Phase B migration: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`
- Frozen Phase B SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`
- Production Supabase ref: `zelcngyyvbomuzokvuxo`
- PCG v1: CLOSED / `PCG_VALUES_VERIFIED_ARTIFACT_ELIGIBLE`
- EHG v1: CLOSED
- Production deployment: false
- Production DB mutation during PRG preparation: forbidden

## Constitutional rule

**One owner authorization may authorize the exact deterministic release sequence, but no proof system or automation may create that authorization for itself. GitHub Environment approvals remain independent enforcement gates.**

Any drift in H2, migration bytes, Production project identity, PCG values, environment protection, or required reviewer invalidates a future authorization before execution.

## Release decomposition

PRG uses four independent layers so a failure cannot silently escalate into the next layer.

### Layer 1 — External identity/domain readiness

Before public deployment, Production Clerk must remain a Production instance and its publishable key must resolve to `clerk.tigerautoparts.shop`. Required DNS/provider setup is treated as an external prerequisite. No external-provider configuration is inferred from repository readiness.

The GitHub Pages release artifact contains `CNAME=tigerautoparts.shop`, but GitHub Pages currently reports no active custom CNAME before deployment. That is not treated as proof that the domain is ready.

### Layer 2 — Production database exact promotion

Only the exact frozen Phase B migration may be applied to Production, once, through `Supabase.apply_migration`. No `db push`, queue runner, manual ledger write, broad migration replay, country activation, authority principal seeding, or application data mutation is permitted.

Precondition: Production must show Phase A present, Phase B absent, all 12 Phase B target tables absent, and the fail-closed identity resolver active.

Postcondition: exactly one Phase B migration ledger row exists; all 12 target tables exist with expected RLS/FORCE RLS and privileges; no authority principal, country seal, listing, media, favorite, or audit business rows are seeded by the promotion.

### Layer 3 — Production database runtime verification

After exact migration promotion, read-only/static checks and rollback-contained synthetic runtime proofs must verify: inactive country denied, owner DRAFT path gated by active country, self-promotion to ACTIVE denied, unauthorized review denied, authorized review path works only under synthetic authority, append-only audit mutation denied, and synthetic residue returns to zero. Phase A identity/RLS properties must remain intact.

No country remains active after the proof and no synthetic owner remains seeded.

### Layer 4 — Exact H2 public artifact and Pages deployment

The existing `pages.yml` build must consume the three verified `production-build` secrets, build from exact H2, produce `releaseEligible=true`, and stop at the protected environment gates. `production-build` and `github-pages` each require independent reviewer `nzuodezuode-byte`, prevent self-review, disable administrator bypass, and allow `main` only.

The final Pages deployment may occur only after database verification is green and the external identity/domain prerequisite is satisfied.

## Future owner authorization

The single ChatGPT authorization phrase is:

`APPROVE_PRODUCTION_RELEASE_EXACT`

It is valid only when bound to the exact H2, exact migration digest, exact Production project ref, current environment protections, and a completed PRG preflight capsule. Its scope is:

1. apply the exact Phase B migration to the exact Production project;
2. perform controlled post-migration verification with rollback-contained synthetic proof;
3. trigger the exact H2 production artifact workflow after DB verification is green.

It does **not** authorize country activation, persistent owner seeding, real listings/data insertion, billing/provider purchase, relaxing environment protections, changing secrets, or bypassing GitHub reviewer approvals.

GitHub still requires the independent human reviewer to approve `production-build` and later `github-pages`. Those approvals cannot be synthesized by PRG.

## Fail-closed stop conditions

- PRG-001 H2 drift
- PRG-002 Phase B byte drift
- PRG-003 Production project identity mismatch
- PRG-004 Phase A regression
- PRG-005 Unexpected Phase B partial state
- PRG-006 External identity/domain readiness incomplete
- PRG-007 PCG value proof invalid/stale
- PRG-008 Environment protection drift
- PRG-009 Owner authorization missing/out of scope
- PRG-010 Migration apply rejected
- PRG-011 Post-migration schema/runtime failure
- PRG-012 Synthetic residue detected
- PRG-013 Build artifact ineligible
- PRG-014 Required reviewer gate missing/bypassed
- PRG-015 Pages deployment verification failure
- PRG-016 Country/owner/data authority leak

## Current read-only Production preflight observation

Production currently reports:

- Phase A ledger count = 1.
- Phase B ledger count = 0.
- all 12 Phase B target tables absent.
- `profiles` RLS = enabled and FORCE RLS = enabled.
- `vvip_resolve_own_profile(text)` exists.
- no `legacy_profile_recovered` path in current resolver.
- `identity_migration_required` fail-closed status is present.
- exact-subject lookup is present.
- no detected email ownership-update pattern.

This is the desired clean pre-promotion `STATE_0`, not authorization to mutate Production.

## Completion states

`PRG_PREPARED` means all read-only/static prerequisites and owner-action inventory are complete.

`PRODUCTION_RELEASE_AUTHORIZED` requires the exact owner phrase after all external prerequisites are complete.

`PRODUCTION_DB_VERIFIED` requires exact migration + postflight evidence.

`PRODUCTION_DEPLOYED_VERIFIED` requires the protected GitHub Pages deployment plus live post-deploy proof.

No earlier state implies a later state.
