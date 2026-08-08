# VVIP TIGER — MASTER PROJECT STATE

> Durable continuation ledger. Current repository bytes, refs, PR metadata, and exact-head CI/test evidence override this document if they differ.

## Snapshot

- **State timestamp:** 2026-08-08 23:11 +03:00
- **Repository:** `vvipautoparts-blip/TIGER-VVIP`
- **Default branch:** `main`
- **Audited `main` SHA:** `4cc292e626fea39f3b0e56b98781d521efef789d`
- **Continuity protocol:** `IN_PROGRESS`
- **Required session sequence:** `READ -> VERIFY -> PLAN -> EXECUTE -> VERIFY -> CHECKPOINT`

## Source-of-truth precedence

1. Current repository bytes and refs.
2. Exact-head CI/test/security evidence.
3. Current PR/commit metadata.
4. This Master Project State.
5. Historical chat/prose.

A stale chat statement must never override current GitHub evidence.

## Active execution cursor

### Current product/security cursor

- **PR:** `#172` — `AUTH-ADR-01: lock federated identity sovereignty`
- **State:** `IN_PROGRESS` — Draft + OPEN + UNMERGED + mergeable at last audit.
- **Branch:** `docs/federated-identity-sovereignty-20260808`
- **Exact head:** `0a3fd6f1ad169eb532ed70f5189ac134f6960d1e`
- **Immediate base branch:** `fix/tsrf-staging-workflow-context-20260808`
- **Immediate base PR:** `#171`
- **Base head:** `fb185581415ba617ada79ae58ecab1952bc56cff`

### Exact-head evidence observed for PR #172

- `VVIP Quality Gate` run `31276071924` — **PASS**.
- `Project Control Integrity` run `31276071918` — **PASS**.

No broader claim is implied beyond the workflows actually observed on this exact SHA.

### Current continuity workstream

- **Branch:** `docs/vvip-tiger-continuity-protocol-20260808`
- **Base source:** exact PR #172 head `0a3fd6f1ad169eb532ed70f5189ac134f6960d1e`
- **Purpose:** persist this protocol and bind future agent startup/handoff behavior.
- **State:** `IN_PROGRESS` until exact final continuity head passes the repository checks that GitHub actually runs.

## Binding architecture — identity

**Status: `APPROVED` + repository implementation present on PR #172.**

- VVIP TIGER is **federated-identity only**.
- No first-party VVIP passwords.
- No local password hashes.
- No local password reset/recovery runtime.
- No parallel Supabase/Firebase password authority.
- Authentication is delegated to the approved external identity provider/runtime.
- OIDC is the authentication protocol; OAuth 2.0 is authorization transport.
- PKCE/state/nonce protections apply where relevant.
- Canonical account identity is verified external `(issuer, subject)`.
- Email and phone are attributes, not account identity.
- Automatic account linking or ownership transfer solely by email is forbidden.
- Provider secrets/private signing keys must never enter browser code.
- VVIP TIGER retains authorization, roles/capabilities, account status, RLS/data policy, owner approvals, and audit evidence.

## Current runtime identity alignment

**Status: `IMPLEMENTED`; exact production readiness remains `BLOCKED`.**

- Clerk is the current external identity runtime.
- `scripts/runtime/vvip-runtime-loader.js` uses the external Clerk session token for Supabase data access.
- Browser Supabase session persistence and automatic token refresh remain disabled in the current identity line.
- Current profile/RLS identity uses Clerk JWT `sub` as the authoritative subject anchor.
- `reset-password.js` is retired from the current product tree on PR #172.
- `reset-password.html` is compatibility routing only and returns users to provider-managed recovery.

## Known identity gap

**Status: `BLOCKED` pending a separate forward migration.**

Historical migration `20260710_vvip_tiger_atomic_profile_resolver_rpc.sql` contains legacy behavior that may claim an unbound historical profile by email and assign the current Clerk subject.

This conflicts with the binding rule:

`NO AUTOMATIC ACCOUNT LINKING BY EMAIL`

The historical migration must not be rewritten. The required remediation is a new forward-only, fail-closed **IDENTITY-01** migration that returns an explicit migration/review-required state rather than transferring profile ownership by email.

## Immediate predecessor chain

- `#169` COST-01 — lean global cost governor foundation.
- `#170` COST-02 — bounded static CDN delivery lane.
- `#171` FIX-LAUNCH-01 — repaired TSRF staging workflow context; exact repaired head green for Quality Gate / Project Control.
- `#172` AUTH-ADR-01 — current identity sovereignty cursor.

All remain subject to their recorded Draft/merge/production boundaries; continuity work does not silently authorize merge.

## Parallel protected workstreams

### TIGER SOVEREIGN AI

**Status: `IN_PROGRESS` / protected stack.**

- AI-01 begins at PR `#137`.
- AI work continues through later Draft PRs including AI-13 `#151`, AI-14 `#152`, AI-15 `#153`, AI-16 `#154`, AI-17 `#155`, and AI-18 `#156`.
- Do not merge stack members ahead of dependencies.
- Repository/automated evidence may be green for individual slices, but real staging/runtime/manual/protected-owner evidence remains separate.
- No broad continuation instruction constitutes Merge Approval, DB Promotion Approval, Production Activation Approval, or live L4 authority.

### Marketplace / V14

**Status: `IN_PROGRESS` / external activation blocked.**

- PR `#134` contains the production-capable V14 marketplace convergence line.
- Production activation remains evidence- and owner-gated.

## Deferred / unresolved cross-cutting evidence

- **PR36 real-image browser E2E:** `DEFERRED` / still a real-evidence gate where referenced by later readiness contracts.
- **Manual owner AI browser acceptance:** `BLOCKED` until performed on the appropriate exact release candidate.
- **Real staging/runtime evidence:** `BLOCKED` where current PRs explicitly require it.
- **Backup/restore/rollback production drills:** not inferred from repository-only tests.

## Hard boundaries — do not infer authority

- `MAIN=LOCKED`
- `PRODUCTION_DB=LOCKED`
- `PRODUCTION_EDGE=LOCKED`
- `PROVIDER_DASHBOARD_CONFIG=LOCKED` unless separately and explicitly authorized.
- `PRODUCTION_DEPLOY=NOT_AUTHORIZED`
- `REAL_CHARGES=NOT_AUTHORIZED`
- `MONEY_MOVEMENT=NOT_AUTHORIZED`
- `PROTECTED_OWNER_L4_DECISIONS=NOT_SYNTHESIZED`
- `EMAIL_AUTO_LINKING=FORBIDDEN`
- `LOCAL_PASSWORD_AUTHORITY=FORBIDDEN`

Repository continuation may create ordinary non-production branches, commits, tests, documentation, and Draft PRs within the existing safety model. It must not silently cross protected merge/production/financial/identity-authority gates.

## Canonical continuity states

- `APPROVED`
- `IMPLEMENTED`
- `VERIFIED`
- `IN_PROGRESS`
- `BLOCKED`
- `DEFERRED`
- `STALE`

`IMPLEMENTED != VERIFIED` unless current evidence supports verification.

## Exact stopping point

The latest audited product/security line is PR `#172` at exact head `0a3fd6f1ad169eb532ed70f5189ac134f6960d1e` with the observed Quality Gate and Project Control runs passing. Federated identity sovereignty is repository-defined, executable legacy password runtime has been removed on that line, and the remaining explicit identity defect is legacy email-based profile claiming in the historical resolver migration.

## Next safe action

After the continuity protocol itself is verified, continue with **IDENTITY-01** as a separate non-production, forward-only remediation slice:

1. inspect the exact historical resolver and current profile/RLS contracts;
2. write a fail-closed regression contract proving email-only profile ownership transfer is rejected;
3. add a new forward migration without rewriting historical migrations;
4. preserve Clerk `(issuer, subject)` / JWT `sub` identity authority;
5. prove local/static migration safety and repository gates;
6. open/keep the remediation PR Draft + unmerged;
7. perform no remote Supabase apply, provider configuration, merge, or production activation.

## Session checkpoint

**Checkpoint status:** `CONTINUITY_BOOTSTRAP_IN_PROGRESS`

The continuity branch was created from the exact PR #172 head. The design and implementation plan are being committed first. This file must be updated with the final continuity PR number, exact final head, and observed CI evidence before the continuity slice is marked `VERIFIED`.
