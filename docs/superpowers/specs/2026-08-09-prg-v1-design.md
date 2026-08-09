# PRG v1 — Production Release Gate

## Purpose

PRG v1 is the final sovereign release boundary for VVIP TIGER. It converts verified repository/staging evidence into a tightly scoped Production release without allowing proof, automation, or a provider to self-grant Production authority.

## Constitutional rule

**Proof may establish eligibility; only the owner may grant Production authority.**

## Frozen application source

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- H2 / current approved release source: `35352136090bd39d9dd6bddc6682c9b9a2d3cafc`
- Phase B migration SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`
- Phase B migration path: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`
- Identity remediation path: `supabase/migrations/20260808_vvip_identity_fail_closed_profile_resolver.sql`

## Verified prerequisites already closed

- SRPC controlled Staging promotion evidence: verified.
- Steel Shield pin and fresh H1 CI: verified.
- SMG exact-head merge: completed to H2.
- RCG H2 source/artifact diagnosis: source defect false.
- PCG v1: `PCG_VALUES_VERIFIED_ARTIFACT_ELIGIBLE`.
- EHG v1: closed; `production-build` and `github-pages` require independent reviewer `nzuodezuode-byte`, prevent self-review, disallow admin bypass, and allow only `main`.
- EHG Human Gate proof: blocked before first step and safely cancelled.

## Mandatory blockers before Production authorization

1. **IDENTITY-01 remote-state proof**
   - Repository remediation exists but is explicitly documented as not remotely applied.
   - Staging proof must demonstrate no email-based ownership transfer.
   - Production migration must not occur without separate exact authorization.

2. **Production database exact-state preflight**
   - Resolve Production project identity at runtime.
   - Read official migration ledger twice with no intervening mutation.
   - Determine whether Phase B and IDENTITY-01 are absent/present/canonical.
   - No broad `db push`; only exact named migration(s), if authorized.

3. **Clerk Production domain readiness**
   - Production publishable key has already been source-verified for `clerk.tigerautoparts.shop`.
   - Exact custom-domain/DNS readiness must be verified before production identity launch.

4. **No implicit country activation**
   - `TIGER_DEFAULT_COUNTRY_CODE` remains absent.
   - Country activation is a separate owner-governed action and is not implied by web deployment.

## Authority separation

### Production DB authority

A future immutable authorization capsule must enumerate:
- exact Production Supabase project ref;
- exact migration paths and hashes;
- exact preflight ledger/schema state;
- allowed operations only;
- `country_activation=false`;
- `owner_seed=false` unless separately authorized.

Recommended exact human phrase after the capsule is complete:

`APPROVE_PRODUCTION_DB_EXACT`

This phrase is invalid until a future capsule binds it to exact immutable state.

### Web deployment authority

After Production DB verification (or if no DB mutation is required), a separate release capsule must bind:
- exact H2 source;
- exact PCG artifact eligibility;
- exact hardened environments;
- exact domain/provider readiness;
- exact post-DB verification state.

Recommended exact phrase after that capsule is complete:

`APPROVE_PRODUCTION_WEB_EXACT`

This phrase is invalid until a future capsule binds it to exact immutable state.

## Fail-closed stop conditions

- PRG-001 SOURCE_HEAD_DRIFT
- PRG-002 PHASE_B_BYTE_DRIFT
- PRG-003 IDENTITY_MIGRATION_BYTE_DRIFT
- PRG-004 PRODUCTION_PROJECT_IDENTITY_MISMATCH
- PRG-005 PRODUCTION_LEDGER_RACE
- PRG-006 PRODUCTION_SCHEMA_DRIFT
- PRG-007 IDENTITY_REMOTE_PROOF_MISSING
- PRG-008 CLERK_DOMAIN_NOT_READY
- PRG-009 PCG_NOT_CLOSED
- PRG-010 EHG_NOT_CLOSED
- PRG-011 OWNER_DB_AUTHORIZATION_MISSING
- PRG-012 OWNER_WEB_AUTHORIZATION_MISSING
- PRG-013 POST_AUTHORIZATION_DRIFT
- PRG-014 COUNTRY_AUTHORITY_LEAK
- PRG-015 OWNER_SEED_AUTHORITY_LEAK
- PRG-016 PRODUCTION_MIGRATION_FAILURE
- PRG-017 PRODUCTION_RUNTIME_FAILURE
- PRG-018 PRODUCTION_DEPLOY_FAILURE
- PRG-019 POST_RELEASE_VERIFICATION_FAILURE

## State machine

1. `PRG_BASELINE_FROZEN`
2. `IDENTITY_STAGING_VERIFIED`
3. `PRODUCTION_READ_ONLY_PREFLIGHT_COMPLETE`
4. `PRODUCTION_DB_CAPSULE_READY`
5. `AWAITING_OWNER_DB_AUTHORIZATION`
6. `PRODUCTION_DB_APPLIED_OR_ACCOUNTED`
7. `PRODUCTION_DB_VERIFIED`
8. `WEB_RELEASE_CAPSULE_READY`
9. `AWAITING_OWNER_WEB_AUTHORIZATION`
10. `PRODUCTION_BUILD_APPROVED`
11. `PRODUCTION_DEPLOY_APPROVED`
12. `PRODUCTION_RUNTIME_VERIFIED`
13. `PRG_CLOSED`

## Hard boundary now

At creation of this specification:

- `production_db_authorized=false`
- `production_web_authorized=false`
- `production_deployed=false`
- `country_activated=false`
- `owner_seeded=false`

PRG preparation itself grants no Production authority.