# VVIP TIGER — Current Deletion & Supersession Manifest

**Status:** `CURRENT CONVERGENCE EVIDENCE / NON-AUTHORITY`
**Updated:** 2026-08-31
**Applies to:** protected PR #349, branch `feat/tiger-nexus-2026-20260829`

This manifest records only proven removals/supersessions performed during current owner convergence. It does **not** create product authority.

Mandatory first authority:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

## Safety rule — No Blind Deletion

**No blind deletion.** A path is removed only after:

1. a newer owner-approved/current authority proves the conflict;
2. the current replacement/authority is identified;
3. required immutable/security evidence is preserved;
4. regression coverage prevents restoration where practical;
5. **Git history** remains the historical provenance.

Conflicting current product material is not moved to `legacy/`, `archive/`, `trash/`, hidden compatibility, or fallback paths.

Applied database migration bytes are immutable historical evidence. Obsolete applied effects require separately authorized forward migration/current-state repair; migrations are not rewritten to fake history.

## Current replacement model

Current product: **TIGER NEXUS 2026**.

Current invariant:

`ONE FEED • ONE OBJECT • ONE PULSE`

Current primary authorities:

- `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
- `docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md`
- `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`
- `docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md`
- `config/fusion/current-authority.json`
- `config/finance/current-distribution.json`
- `project-control/authority/authority-registry.v1.json`

Current Pulse reference levels are **2 / 10 / 20 / 45 JOD**.

Current finance known allocation is 84%; `TAX_RESERVE` is cancelled and the remaining 16% is pending an explicit owner decision. `CSR = 3%` remains inside ACTUAL_OPERATIONS 43%. No replacement beneficiary is inferred.

## Proven removed parallel runtime/product surfaces

These paths were physically removed because they conflicted with the current single NEXUS/social product graph:

- `fusion-home-f02.html`
- `scripts/fusion/f02-feed.js`
- `scripts/fusion/marketplace-context.js`
- `scripts/fusion/runtime-adapters.js`
- `scripts/runtime/vvip-marketplace-repository.js`
- `scripts/runtime/vvip-my-listings.js`
- `scripts/vvip-pr31-create-listing-shell.js`
- `scripts/vvip-pr32-draft-preview.js`
- `scripts/vvip-pr33-publish-readiness.js`
- `scripts/vvip-production-marketplace.js`
- `styles/vvip-pr31-create-listing-shell.css`
- `styles/vvip-pr32-draft-preview.css`
- `styles/vvip-pr33-publish-readiness.css`
- `styles/vvip-production-marketplace.css`

Replacement: canonical NEXUS/social shell, Living Sector Object, current social feed/runtime, and `scripts/nexus/sector-discovery.js` over the same objects.

## Proven removed standalone Pulse client authority

Removed:

- `scripts/nexus/pulse-vault.js`
- `tests/nexus/pulse-vault.test.cjs`

Reason: standalone client Pulse Vault authority conflicted with the current server-authoritative runtime.

Replacement/evidence:

- `scripts/nexus/pulse-runtime.js`
- `scripts/nexus/pulse-surface.js`
- `scripts/nexus/proofview.js`
- `tests/nexus/pulse-runtime.test.cjs`
- `tests/nexus/pulse-vault-ui-contract.test.cjs`

## Proven removed fixed-sector artifact

Removed:

- `docs/owner-control/P10_THREE_SECTOR_STRUCTURED_FIELDS.md`

Reason: fixed three-sector current-tree product assumption conflicted with server-activated sectors.

Replacement: NEXUS activated-sector authority and `config/fusion/current-authority.json`.

## Proven removed competing owner authority/control plane

Removed:

- `docs/owner-control/OWNER_BINDING_DECISIONS_2026-08-12.md`
- `docs/owner-control/VVIP_TIGER_OWNER_MASTER_DECISIONS_2026-08-12.md`
- `docs/owner-control/VVIP_TIGER_OWNER_MASTER_REFERENCE.md`
- `docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.md`
- `docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml`
- `docs/owner-control/VVIP_TIGER_MASTER_EXECUTION_ROADMAP_COMPLETION.md`
- `docs/owner-control/VVIP_TIGER_PHASE_TRACKER.md`
- `docs/owner-control/phase-status.json`
- `docs/change-control/20260710-master-execution-roadmap.json`

Reasons included competing `OWNER-CANONICAL`/highest-reference claims, stale PR/phase lanes, fixed Three-Sector sequencing, publishing subscription/entitlement paths, old timing/quota rules, and fallback instructions.

Replacement: `TIGER_OWNER_BINDING_CURRENT.md` as mandatory first reference, current owner router, machine authority graph/config, and exact Git/verification evidence.

## Proven removed superseded Pulse design input

Removed:

- `docs/superpowers/specs/2026-08-18-tiger-pulse-ring-attention-allocation-engine-design.md`

Reason: it still declared itself `OWNER APPROVED / CURRENT DESIGN INPUT` while carrying a Pulse model that conflicted with the current 2/10/20/45 NEXUS/Pulse authority.

Replacement: current owner binding, current Pulse authority, NEXUS current design/runtime, and machine authority.

## Proven removed obsolete P01 execution gap matrix

Removed:

- `docs/owner-control/VVIP_TIGER_IMPLEMENTATION_GAP_MATRIX.md`

Reason: it was not neutral historical evidence. It still declared deleted `VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml` as a completed unified truth source, depended on deleted `phase-status.json`, treated obsolete P01/P02 sequencing as active next-step execution, and referenced archive/backups/old runtime assumptions. Retaining it in `docs/owner-control` could re-route future workers to the removed control plane.

Replacement/evidence:

- `TIGER_OWNER_BINDING_CURRENT.md`
- `TIGER_OWNER_CURRENT_REFERENCE_AR.md`
- `docs/MASTER_PROJECT_STATE.md` as explicitly non-authoritative current status
- `docs/superpowers/plans/2026-08-31-final-owner-convergence.md`
- current PR #349 exact-head state
- `tests/owner-control-historical-evidence-routing.test.cjs`

Git history preserves the P01 audit provenance.

## Superseded material corrected rather than deleted

Where a document contained substantial compatible material, it was preserved and surgically reconciled instead of being blindly deleted. Current examples include:

- `AGENTS.md` and active agent instruction surfaces — routed to the current owner binding and current PR #349 boundary;
- `docs/owner-control/TIGER_FACEBOOK_1_TO_1_FAMILIARITY_2026_CURRENT_OWNER_AUTHORITY.md` — reduced to a NEXUS-subordinate social familiarity authority with no parallel Marketplace creation path;
- `docs/owner-control/TIGER_PULSE_ENGINEERING_EXECUTION_REFERENCE.md` — reduced to a non-authoritative current engineering routing reference;
- `docs/owner-control/VVIP_TIGER_DISCOVERY_EXPERIENCE_SPEC.md` — converted to a NEXUS-subordinate same-object discovery/search reference;
- `docs/owner-control/P17_TRIAL_SUBSCRIPTIONS_AND_ENTITLEMENTS.md` — explicitly classified as historical phase evidence/non-authority and prevented from authorizing a current publication subscription/entitlement gate;
- `docs/owner-control/VVIP_TIGER_EXECUTION_CHARTER.md` — subordinated to the current owner binding and exact-head runner-executed GREEN gate.

## Regression guards

Current convergence protection includes, among others:

- `tests/final-owner-convergence.test.cjs`
- `tests/owner-latest-decision-governance.test.cjs`
- `tests/nexus/nexus-current-authority.test.cjs`
- `tests/nexus/nexus-no-conflicting-legacy.test.cjs`
- `tests/nexus/nexus-single-object-creation-path.test.cjs`
- `tests/nexus-2026-contract.test.cjs`
- `tests/agent-current-authority-routing.test.cjs`
- `tests/nexus-ui-authority-convergence.test.cjs`
- `tests/pulse-engineering-current-authority.test.cjs`
- `tests/discovery-current-authority.test.cjs`
- `tests/owner-control-historical-evidence-routing.test.cjs`

These contracts are intended to prevent restoration of parallel product/runtime surfaces, stale/competing owner authority, fixed sector counts, obsolete Pulse models, restored TAX_RESERVE allocation, invented allocation of the pending 16%, separate 1% allocation, stale agent instructions, or obsolete roadmap/phase execution control.

## What this manifest does not authorize

This manifest does not authorize:

- deletion merely because material is old;
- deletion of unique security/provenance evidence;
- rewrite of applied migrations;
- Production/Staging mutation;
- database/provider/credential mutation;
- Ready for Review or merge of PR #349;
- bypass/weakening of CI, review, security, or release gates;
- new product-development slices.

The governing rule remains:

**Preserve what is correct and compatible; update or remove only what is proven stale, conflicting, duplicated, or superseded.**
