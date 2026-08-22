# Documentation Index

**Status:** CURRENT NAVIGATION INDEX

This file is navigation only. It is not independent owner authority and must never override exact repository state, exact-head CI evidence, Issue #312, or explicit release gates.

## Start Here — Current Authority

1. `AGENTS.md` — repository working conventions and continuity protocol.
2. `docs/MASTER_PROJECT_STATE.md` — current execution-state ledger; historical finance statements remain constrained by Issue #312.
3. `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` — canonical precedence for discovery/commerce and zero-brokerage authority.
4. `README.md` — project overview; resolve any conflict through the authorities above.
5. `docs/superpowers/specs/2026-08-22-tiger-one-field-living-discovery-design.md` — ONE FIELD living-discovery product contract.

## Canonical Runtime Entry Points

- `index.html` — unified application/authentication entry.
- `auth-clerk-index.js` — canonical Clerk authentication gate.
- `scripts/runtime/vvip-runtime-loader.js` — Clerk session + Supabase data-layer runtime bridge.
- `scripts/vvip-pr29-home-marketplace.js` — canonical Home/marketplace feed interactions.
- `private-profile-p03.html` — canonical private account center.
- `scripts/vvip-p03-profile.js` — private account-center interactions.
- `scripts/vvip-p03-profile-identity.js` — authenticated profile resolver bridge.
- `reset-password.html` — compatibility redirect to external-provider recovery only.

## Current ONE FIELD / Living Discovery Runtime

- `scripts/discovery/one-field-runtime-orchestrator.js` — end-to-end ONE FIELD orchestration.
- `scripts/discovery/one-field-runtime-controller.js` — runtime controller and state transition boundary.
- `scripts/discovery/one-field-runtime-adapters.js` — runtime adapters for discovery inputs/outputs.
- `scripts/discovery/one-field-runtime-view.js` — user-facing rendering/view contract.
- `scripts/discovery/one-field-intent-scene.js` — intent-scene parsing/normalization.
- `scripts/discovery/one-field-hybrid-retrieval.js` — hybrid retrieval.
- `scripts/discovery/one-field-fit-facets.js` — hard-fit/facet constraints.
- `scripts/discovery/one-field-semantic-core.js` and `one-field-semantic-capsule.js` — semantic contracts.
- `scripts/social/one-field-post-commit.js` — social/posting integration boundary.
- `scripts/authorization/one-field-posting-as.js` — Posting-As authorization.

For external advertised-goods/services commerce, contact handoff is terminal under Issue #312.

## Current Validation / Release Evidence

- `scripts/quality-gate.sh` — full repository quality gate.
- `.github/workflows/vvip-quality-gate.yml` — protected PR quality workflow.
- `.github/workflows/tiger-cleanguard.yml` — cleanup/residue guard.
- `.github/workflows/zero-residue-full-history.yml` — historical residue evidence.
- `.github/workflows/project-control-integrity.yml` — owner/project-control integrity.
- `.github/workflows/tiger-social-db-rehearsal.yml` — isolated Social DB rehearsal.
- `.github/workflows/tsrf-staging-evidence.yml` — protected real-Staging evidence gate; not equivalent to CI/rehearsal.
- `.github/workflows/production-release-artifact.yml` — immutable current-main release artifact/SBOM/provenance path.
- `.github/workflows/v14-release-candidate.yml` — release-candidate convergence controls.

Every PASS/readiness statement must name the exact SHA and evidence source. Historical PASS/100%/production-ready prose is not current evidence.

## Data / Database Authority

- `supabase/migrations/` — ordered current migration sources, subject to exact-environment application evidence.
- `supabase/migrations/20260822023000_zero_brokerage_legacy_transaction_write_lock.sql` — fail-closed legacy external-commerce write lock.
- `docs/architecture/LEGACY_SUPABASE_SCHEMA_BLOCK.md` — explicit tombstone for root `supabase-schema.sql` legacy commerce semantics.
- Root `supabase-schema.sql` is historical evidence; it is not remote-apply authority.

## Historical Documentation / Tombstones

The following names or categories may exist in Git history or historical snapshots but are **not current runtime/readiness authority**:

- `PROJECT-SUMMARY.md`
- `FINAL-VERIFICATION.md`
- `USER-GUIDE.md`
- `UNIFIED-PLATFORM-STATUS.md`
- historical Firebase runtime/auth setup
- documentation containing test credentials or reusable user/password fixtures
- old commission/payment/checkout/escrow/order implementation plans for external advertised-goods/services commerce

Historical content is retained in Git provenance where necessary; it must not be resurrected by copying old setup steps or treating stale filenames as current entry points.

## Conflict Rule

Use this precedence:

1. current repository bytes/refs and explicit fail-closed code/database controls;
2. exact-head CI/test/security evidence;
3. current PR/commit metadata;
4. Issue #312 + `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` for commerce/discovery authority;
5. `docs/MASTER_PROJECT_STATE.md` within non-conflicting scope;
6. historical snapshots/prose.

When two current-looking artifacts conflict on external commerce, fail closed to:

**DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS**
