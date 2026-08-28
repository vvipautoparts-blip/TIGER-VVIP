# TIGER Media DB Convergence — Implementation Plan

**Date:** 2026-08-28
**Authority:** `docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md` §9 and `docs/ai/SUPABASE_SAFETY_POLICY.md`
**Starting main:** `21ba2b13a0dd2616eb2a51b9d83065d1ec1aac04` (merged PR #341)
**Production project:** `zelcngyyvbomuzokvuxo` / Seoul `ap-northeast-2`

## Goal

Close the Supabase convergence gate before any live Sealed Build or AWS runtime activation. The repository must prove the complete Media Data Cell database contract locally, provide deterministic bounded live-verification evidence, and provide an owner-only production promotion runbook. Autonomous agents must never mutate the Production Supabase project.

## Current verified baseline

Read-only Production inspection on 2026-08-28 established:

- project `zelcngyyvbomuzokvuxo` is `ACTIVE_HEALTHY` in `ap-northeast-2`;
- migration `20260816090001` is missing;
- migration `20260827120000` is missing;
- `public.vvip_marketplace_listing_media` is present;
- `public.vvip_media_finalization_jobs` is missing.

Therefore Production is **NOT CONVERGED** and the live Sealed Build remains blocked.

## Non-negotiable safety boundary

1. No autonomous `supabase link`, `db push`, `db reset`, `migration repair`, remote DDL, or remote DML.
2. Production mutation may be performed only by the owner or an explicitly approved protected runbook, per `docs/ai/SUPABASE_SAFETY_POLICY.md`.
3. Repository workflows added by this slice must not have automatic Production mutation triggers.
4. Live verification must read catalog/policy metadata only; it must not read marketplace user rows or Storage object contents.
5. Evidence must contain no access token, database password, service key, JWT, connection string, or user data.
6. AWS runtime, Sealed Build caller, Dark Bootstrap, Global Edge and Production deployment remain out of scope until DB convergence is proven live.

## Target architecture

The convergence gate has three independent layers:

### A. Local contract rehearsal

Extend the existing `media-finalizer-db-rehearsal.yml` so a clean local Supabase instance proves the complete §9 contract after both forward-only migrations are applied. Keep the current owner-binding/replay tests and add catalog/privilege/RLS/Storage assertions.

### B. Deterministic live verifier

Add a read-only SQL verifier and a small evidence normalizer. The verifier reports only bounded metadata for:

- exact migration versions;
- required relations and canonical columns;
- request/claim/complete/fail RPC presence;
- request RPC authenticated privilege where intended;
- trusted RPC service-role-only privileges;
- SECURITY DEFINER fixed-search-path properties;
- RLS enablement and required Media policies;
- private raw-media bucket/policy authority and canonical publication constraints;
- replay/lease/token-hash schema invariants that are catalog-verifiable.

The normalizer fail-closes unless every required check is `PASS`, then emits canonical JSON plus SHA-256 suitable for later Sealed Build input.

### C. Owner-only Production promotion runbook

Add a documented, exact migration-set runbook. It must pin project ref `zelcngyyvbomuzokvuxo`, require a clean current `main`, run local rehearsal first, apply only the two approved forward migrations under owner control, then run the read-only live verifier and Supabase advisors. No agent in this implementation will execute the Production mutation step.

## Task 1 — TDD: complete database-contract assertions

**Files:**

- Create `tests/media-finalizer-db-convergence-contract.test.cjs`
- Create `tests/sql/media-finalizer-db-contract.sql`
- Update `.github/workflows/media-finalizer-db-rehearsal.yml`

**RED:** tests must initially require the missing full-contract SQL fixture and rehearsal wiring.

**GREEN:** implement bounded local proofs for migration presence/order, job table, canonical listing-media fields, RPC privilege boundaries, RLS, token hash/lease constraints, Storage authority and canonical write protection.

**Verification:** `node --test tests/media-finalizer-db-convergence-contract.test.cjs tests/media-finalizer-identity-binding-migration.test.cjs` plus the existing local Supabase rehearsal workflow.

## Task 2 — TDD: deterministic convergence evidence

**Files:**

- Create `scripts/release/media-cell-db-convergence-evidence.cjs`
- Create `tests/media-finalizer-db-convergence-evidence.test.cjs`

The helper accepts a bounded JSON result from the read-only verifier, enforces exact keys/status values/project ref/migration set, canonicalizes recursively, and returns:

- `state: VERIFIED_LIVE` only for a complete PASS set;
- `projectRef`;
- `region`;
- exact required migrations;
- contract-check summary;
- advisor-classification digest;
- `evidenceSha256` over canonical stable evidence.

No timestamps or volatile advisor ordering participate in the identity.

**RED:** missing helper/fail-open behaviors must fail.

**GREEN:** strict validation and deterministic hashing.

## Task 3 — Read-only live verification SQL

**Files:**

- Create `tests/sql/media-finalizer-live-verification.sql`
- Create `tests/media-finalizer-live-verification-contract.test.cjs`

The SQL must be SELECT/catalog-only and return one bounded rowset. Static tests must reject mutation verbs and require every §9 check. The same query can be executed through an owner-approved Supabase connection after migration promotion.

## Task 4 — Advisor classification gate

**Files:**

- Create `config/media-finalizer-supabase-advisor-classification.json`
- Create `tests/media-finalizer-supabase-advisors.test.cjs`

Classify only release-relevant current WARNs as one of:

- `FIXED`
- `INTENTIONAL_AND_TESTED`
- `NOT_APPLICABLE_WITH_EVIDENCE`

Do not suppress unrelated project-wide warnings. A release-relevant warning that is unclassified fails the convergence evidence gate.

## Task 5 — Owner-only Production runbook

**Files:**

- Create `docs/operations/TIGER_MEDIA_DB_CONVERGENCE_RUNBOOK.md`
- Create `tests/media-finalizer-db-convergence-runbook.test.cjs`

Runbook requirements:

1. verify exact current protected `main`;
2. verify project ref `zelcngyyvbomuzokvuxo` and region `ap-northeast-2`;
3. run repository quality gates and local DB rehearsal;
4. verify pending migration set is exactly `20260816090001`, `20260827120000` and nothing else in this slice;
5. owner executes the approved migration promotion using the project-standard safe mechanism;
6. immediately run read-only live verification and advisors;
7. emit/store bounded convergence evidence SHA;
8. fail closed if any check differs.

The runbook must explicitly forbid `db reset`, `migration repair`, destructive rollback, or autonomous execution.

## Task 6 — Exact-head PR governance

1. Run full PR CI on the exact head.
2. Require 9/9 existing repository workflows GREEN plus the strengthened Media DB rehearsal.
3. Request Codex review on the exact head.
4. Resolve every valid finding under RED → GREEN TDD.
5. Obtain independent approval from the repository reviewer path.
6. Merge with expected-head SHA only.

## Task 7 — Owner Production boundary and post-apply verification

After this PR merges, stop before Production mutation. The owner/approved runbook performs the exact migration promotion. Then perform only read-only live verification through the connected Supabase project.

The DB gate is complete only when Production proves:

`DB_CONVERGENCE=VERIFIED_LIVE`

and a deterministic `evidenceSha256` exists for the exact live contract. Only then may the next plan create/invoke the live Sealed Build caller.

## Definition of done

This slice is complete when:

- repository local DB rehearsal proves the full Media DB contract;
- deterministic live-verification tooling is merged to `main`;
- owner-safe Production runbook is merged;
- no automated Production mutation exists;
- after owner promotion, the Seoul Production database passes every live verifier check and relevant advisor warning is classified;
- the exact `VERIFIED_LIVE` evidence SHA is available to the Sealed Build as its DB prerequisite.
