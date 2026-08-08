# VVIP TIGER — MASTER PROJECT STATE

> Durable continuation ledger. Current repository bytes/refs, exact-head CI/test/security evidence, current provider state, and current PR metadata override stale prose or chat history.

## Snapshot

- **State date:** 2026-08-09 (+03:00)
- **Repository:** `vvipautoparts-blip/TIGER-VVIP`
- **Default branch:** `main`
- **Audited main SHA at RC creation:** `4cc292e626fea39f3b0e56b98781d521efef789d`
- **Active execution cursor:** PR `#181` — `release: VVIP TIGER global launch candidate`
- **Active branch:** `feat/launch-home-runtime-convergence-20260808`
- **Last exact source SHA used for a Production mutation:** `22fbd9232d0f28bb604eb5ddb1b0f8e7d23f6d65`
- **OWNER GLOBAL LAUNCH AUTHORIZATION:** `ACTIVE`
- **Required execution loop:** `READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT -> CONTINUE`

## Source-of-truth precedence

1. Current repository bytes and refs.
2. Exact-head CI/test/security evidence.
3. Current remote environment/provider state.
4. Current PR/commit metadata.
5. This Master Project State.
6. Historical chat/prose.

A stale chat statement, PR description, or older checkpoint must never override current GitHub/provider evidence.

## Self-reference rule

This document intentionally does not embed the SHA of the commit that contains its latest edit because editing it changes that SHA. At session start, resolve the active branch/PR head from GitHub.

## Binding owner execution directive

Read `docs/global/OWNER_GLOBAL_LAUNCH_EXECUTION_DIRECTIVE_20260808.md` before broad continuation work.

Routine owner reconfirmation is not required between phases. Owner authorization covers dependency-chain merges, remote migrations, Production DB/Edge/configuration changes, deployment/release, provider configuration, and necessary bounded launch actions when technical prerequisites are satisfied and the relevant tools/accounts exist.

Authorization never permits bypassing a failing gate, inventing evidence, exposing secrets, weakening identity/security architecture, or making unbounded financial commitments.

## Current release candidate — PR #181

- **State:** Draft + OPEN + UNMERGED at the latest audit.
- **Base:** `main`.
- **Branch:** `feat/launch-home-runtime-convergence-20260808`.
- The raw development homepage is not the Production artifact. `tools/vvip_public_release.py` builds the public artifact and injects Runtime Loader, runtime config, marketplace repository, rollback/auth/My Listings/Production marketplace in fail-closed order.
- `scripts/vvip-production-marketplace.js` constructs the real marketplace repository and reads public listings through `listPublic()`.
- Production artifact generation rejects Clerk test keys/development domains, sample-listing markers, secret Supabase browser configuration, and invalid release configuration.

## Exact-head release evidence used for Production Phase A

Exact SHA: `22fbd9232d0f28bb604eb5ddb1b0f8e7d23f6d65`.

Before any Phase A Production DDL, all observed required workflows on that exact SHA completed `SUCCESS`:

- Project Control Integrity — `31280961954`
- Documentation Sovereign Knowledge Plane — `31280961947`
- TIGER CleanGuard — `31280962025`
- Dependency Review — `31280961968`
- V14 Release Candidate — `31280961989`
- VVIP Quality Gate — `31280961946`
- CodeQL — `31280961971`
- LC03 Supabase Security Rehearsal — `31280961974`
- LC04 Production Legacy RPC Rehearsal — `31280961952`
- LC05 Credential Surface Isolation Rehearsal — `31280962035`
- LC06 RLS Performance Hardening Rehearsal — `31280961945`
- TSRF Sovereign Phone OTP Rehearsal — `31280962011`

The Phase A migration was content-addressed in Steel Shield with SHA-256:

`173766f1203890d3461db6b67cc95b1d9ca28d23c65026ff9393115ad4433c31`

Any byte drift invalidates that reviewed baseline.

## Global Launch Phase A — Identity/Profile Production Convergence

**Status: `VERIFIED IN PRODUCTION`.**

Canonical evidence:

`docs/global/GLOBAL_LAUNCH_PHASE_A_PRODUCTION_EVIDENCE_20260809.md`

Migration:

`supabase/migrations/20260808223000_global_launch_phase_a_identity_convergence.sql`

Production migration ledger entry after application:

- version `20260808221204`
- name `global_launch_phase_a_identity_convergence`

### Verified Production outcomes

- Production profile cardinality stayed `8`.
- Legacy unbound profiles stayed `6`.
- Distinct bound Clerk subjects stayed `2`.
- Duplicate Clerk-subject groups stayed `0`.
- No user row was deleted, auto-linked by email, or reassigned.
- `vvip_private` now exists.
- The six observed legacy authorization helpers moved from `public` to `vvip_private` while preserving their actual Production OIDs.
- The migrated helper set no longer exists in `public`.
- `profiles` has RLS enabled + forced.
- browser access to `profiles` is authenticated `SELECT` only.
- the remaining browser profile policy is subject-first using Clerk JWT `sub`.
- `vvip_resolve_own_profile(text)` exposes the fail-closed `identity_migration_required` state.
- `otp_codes`, `email_verifications`, and retired `vvip_clerk_profiles` are server-only: forced RLS, zero browser policies, no anon/authenticated table privileges.
- a transaction-scoped Production behavioral proof returned `identity_migration_required`, created no identity link, rolled back, and left `0` synthetic rows.

Phase A does **not** imply marketplace Production readiness, Clerk Production promotion, Web deployment, mobile release, or global launch completion.

## Identity architecture — binding

- Federated identity only.
- No first-party VVIP password authority or local password reset.
- Canonical identity is external issuer/subject; current Clerk JWT `sub` is the subject anchor.
- Email/phone are attributes, not account identity.
- Automatic account ownership transfer solely by email is forbidden.
- Provider secrets/private signing keys are forbidden in browser code/repository.
- VVIP TIGER retains authorization, roles/capabilities, account state, RLS/data policy, approvals, and audit evidence.

## Cost workstream — verified repository slices

- `#169` COST-01 — lean global cost governor foundation.
- `#170` COST-02 — bounded static CDN delivery lane.
- `#177` COST-03 — public-read single-flight + 30-second public result reuse, with identity/private/write boundaries excluded.
- `#178` COST-04 — cover-only display-critical media signing with cross-listing path deduplication; non-cover media metadata retained without signing URLs.

COST-04 verified exact source head remains `81402daf4e093a3b4c728d191bded0b3582b697a`. Structural reductions are proven; no invented monetary/percentage savings are claimed.

## Current Production database boundary

After Phase A:

- identity/profile legacy surface is converged and verified.
- **marketplace schema is still absent in Production.**
- therefore public Web marketplace launch is functionally blocked until marketplace Production convergence is completed and verified.

Do not deploy a public marketplace artifact that assumes tables/RPCs not present in Production.

## Next automatic action — Global Launch Phase B

**Phase B: Marketplace Production Convergence.**

Requirements:

1. inspect current Production fingerprint and the already-proven Staging marketplace contract;
2. identify the minimum final tables/indexes/functions/RLS/storage contracts required by the current runtime;
3. do **not** blindly replay the historical migration chain;
4. create a forward-only convergence artifact against the actual Production drift;
5. TDD RED -> minimal GREEN;
6. prove canonical/local replay plus isolated Staging behavior/idempotence;
7. content-address any security-sensitive migration through Steel Shield rather than adding a broad exception;
8. rerun the complete exact-head release/security plane;
9. only when all required gates are GREEN on the same SHA, re-fingerprint Production and apply Phase B;
10. verify table/RPC/RLS/storage behavior immediately after application and checkpoint the evidence.

After Phase B, continue automatically through remaining Production Edge/runtime configuration, Clerk Production promotion, actual Staging/Production artifact deployment evidence, browser E2E, and synchronized Android+iPhone readiness.

## Known external/deferred launch evidence

These are execution gaps, not requests for renewed owner approval:

- PR36 real-image browser E2E remains `DEFERRED` until genuine browser/file evidence is produced.
- Clerk Production environment/publishable-key promotion remains unresolved; current known Clerk environment was Test.
- Production marketplace database contract remains `BLOCKED` pending Phase B.
- Production Web deployment evidence remains pending.
- backup/restore/rollback drills remain required where a later irreversible mutation warrants them.
- synchronized Android + iPhone releases remain incomplete.
- any genuinely human-only UI acceptance remains external evidence; automate objective acceptance wherever possible.

## Safety/architecture invariants — always binding

- `EXACT_HEAD_EVIDENCE=REQUIRED`
- `QUALITY_SECURITY_GATES=MUST_PASS`
- `DEPENDENCY_ORDER=MUST_BE_VALID`
- `ROLLBACK_RECOVERY_EVIDENCE=REQUIRED_WHERE_IRREVERSIBLE`
- `SECRETS_IN_BROWSER_OR_REPO=FORBIDDEN`
- `EMAIL_AUTO_LINKING=FORBIDDEN`
- `LOCAL_PASSWORD_AUTHORITY=FORBIDDEN`
- `PRIVATE_BUCKET_PUBLICATION_AS_COST_SHORTCUT=FORBIDDEN`
- `FABRICATED_EVIDENCE=FORBIDDEN`
- `UNBOUNDED_SPEND=FORBIDDEN`

## Canonical continuity states

- `APPROVED`
- `IMPLEMENTED`
- `VERIFIED`
- `IN_PROGRESS`
- `BLOCKED`
- `DEFERRED`
- `STALE`

`IMPLEMENTED != VERIFIED`. `DEFERRED != COMPLETE`.

## Session checkpoint

**Checkpoint status:** `PHASE_A_PRODUCTION_VERIFIED_PHASE_B_NEXT`

A fresh session must resolve PR #181 and its current exact head from GitHub, read the Phase A Production evidence file, re-read current Production/Staging state rather than trusting stale IDs/OIDs, and continue automatically into Phase B. It must not restart VVIP TIGER from zero or re-request routine owner authorization already granted.
