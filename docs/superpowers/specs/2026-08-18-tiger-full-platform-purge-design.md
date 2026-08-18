# TIGER Full Platform Purge Design

**Date:** 2026-08-18  
**Status:** Owner-approved design, implementation not yet started  
**Branch:** `chore/tiger-full-purge-20260818`  
**Baseline:** `59064cbe87b7645f6764cd25fcf689a781042c0e`

## 1. Goal

Transform TIGER-VVIP into one clean product surface with no legacy product experience reachable from the current tree or public release.

The retained product is:

`TIGER Social Core -> Marketplace as an internal module -> Auth/Security/Data/CI/Operations`

The purge must remove current-tree clutter, legacy entry points, duplicate shells, obsolete product routes, stale preview/release material, dead scripts/assets, and experimental files that are not required by the retained architecture.

This is a current-tree and release-surface purge. It does **not** rewrite Git history. Historical commits remain an audit record unless a later, separately authorized history-rewrite operation is approved.

## 2. Non-negotiable outcomes

1. `index.html` resolves to the TIGER Social Core home experience, not a Marketplace-first or legacy shell.
2. No legacy product page is reachable from current navigation, route maps, deep links, public release manifests, or generated release artifacts.
3. Marketplace remains available only as a module/destination inside Social Core. It must not remain as a separate competing platform shell.
4. No deceptive or dead UI controls are retained. Unsupported features remain fail-closed/non-interactive until implemented.
5. No legacy JavaScript, CSS, HTML, image, manifest, route, or configuration file is included in the public release unless a dependency audit proves it is still required by the retained product.
6. No obsolete root-level specification, experiment, migration duplicate, temporary report, local artifact, generated archive, or superseded implementation file remains in the current tree unless a current workflow, security gate, migration chain, or owner-control authority explicitly depends on it.
7. Auth authority, RLS, security rehearsals, release provenance, SBOM/attestation controls, branch protection assumptions, and production promotion safeguards must remain intact or become stricter.
8. `main` is never edited directly. The purge is implemented and verified on an isolated branch and reviewed through a PR.
9. No production deployment, production database mutation, secret change, DNS change, or destructive remote environment action is part of this purge.
10. The purge is complete only when a machine-checkable Legacy Residue Gate passes on the exact final SHA.

## 3. Keep surface

The purge retains only files that belong to at least one of these categories:

### Product runtime
- TIGER Social Core home/feed shell.
- Social composer and post/feed runtime.
- Friends/social graph runtime.
- Reactions runtime.
- Current profile/auth/navigation shell required by Social Core.
- Marketplace module runtime that is actually reachable from the new Social Core navigation.
- Current media/runtime code required by the retained product.

### Identity and security
- Clerk identity integration and protected-action authority.
- Supabase data access/RLS runtime.
- Security headers/configuration required by the current architecture.
- Secret scanning, CodeQL, dependency review, CleanGuard, Zero-Residue, LC03/04/05/06, and related active security gates.

### Data
- Canonical Supabase migrations required to reconstruct the current schema.
- Social Core posts/friendships/reactions migrations.
- Any canonical Marketplace data migrations still required by the internal Marketplace module.
- Migration review/baseline files required by Steel Shield or equivalent controls.

### Delivery and operations
- Current quality gate scripts.
- Current release-candidate/production artifact builders and verifiers.
- GitHub Actions workflows that are active and required by current CI/CD/security.
- AWS/OIDC/IaC material that is part of the approved production architecture and is not an obsolete experiment.

### Governance
- Current owner authority documents.
- Current Social Core parity matrix.
- Current golden architecture design/implementation references.
- This purge design and its implementation plan.
- Current project-control manifests that active integrity checks require.

## 4. Delete surface

A file is a purge candidate when it meets one or more conditions below and no Keep-surface dependency exists:

1. Legacy Marketplace-first HTML/page shell replaced by Social Core.
2. Superseded home/profile/login/page variants that are not referenced by the retained navigation/runtime.
3. Old route-map entries that expose deprecated pages.
4. Old CSS/JS dedicated only to deleted shells.
5. Old static assets referenced only by deleted pages.
6. Duplicate or superseded scripts with a current canonical replacement.
7. Historical top-level implementation specs/guides that are not current owner authority and are not required by active integrity checks.
8. Temporary QA output, preview snapshot, local test artifact, generated archive, copied release package, or build output committed to the repository.
9. Obsolete hosting configuration from abandoned runtime paths, provided no active workflow depends on it.
10. Dead Firebase/Replit/other experimental configuration not used by the approved delivery architecture.
11. Orphan files with zero inbound references from current runtime, build, CI, migrations, or governance.

Deletion is dependency-driven, not name-driven. A file with an old-looking name is retained until its dependency status is proven; a modern-looking file is deleted if it is dead.

## 5. Marketplace consolidation rule

Marketplace is retained as a product capability but loses independent platform authority.

The final navigation hierarchy is:

- Home / Feed
- Friends
- Messages
- Notifications
- Profile
- Marketplace

Marketplace routes must enter through the Social Core shell or a clearly subordinate module route. Any old landing page that makes Marketplace appear to be the entire TIGER platform is deleted.

Reusable Marketplace domain/data code may be migrated into a clean module namespace before its old shell files are removed. Copying dead code forward is prohibited.

## 6. Repository structure target

The purge should converge toward a small, legible top-level structure. Exact names may follow existing conventions, but responsibilities must be clear:

- `.github/` — active CI/CD/security only.
- `assets/` — current product assets only.
- `scripts/` — current runtime/build/security scripts, grouped by responsibility.
- `styles/` — current product styles only.
- `supabase/` — canonical migrations/config needed by current schema.
- `infra/` or existing canonical IaC location — approved deployment infrastructure only.
- `docs/owner-control/` — current owner authority only.
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — current active architecture/implementation documents needed for ongoing execution.
- `project-control/` — only files required by active integrity/governance checks.
- `tests/` — current tests and residue/security gates.
- `index.html` — Social Core entry point.

Root-level one-off specs, duplicate SQL files, local utilities, and superseded product pages should not remain unless an active dependency requires them.

## 7. Legacy Residue Gate

Add a deterministic test/gate that fails the build when any forbidden residue returns.

The gate must validate at minimum:

- no deleted legacy HTML entry points exist;
- no route map/nav link references deleted pages;
- no public release manifest contains deleted legacy paths;
- no forbidden Marketplace-first landing copy returns to `index.html`;
- no legacy-only script/style is allowlisted by the release builder;
- no committed local preview/build/archive artifacts match forbidden patterns;
- no duplicate obsolete root SQL migration is present when the canonical migration exists under `supabase/migrations/`;
- no known abandoned hosting config returns unless explicitly allowlisted by current architecture.

The gate must be part of `scripts/quality-gate.sh` or an equivalent mandatory gate, not an optional/manual check.

## 8. Release policy

The public release builder becomes an explicit allowlist of the retained product surface. Deletion from source is preferred; release exclusion alone is not sufficient for dead product code.

The purge is not complete until the release-candidate artifact is inspected and contains only the new Social Core product surface and required runtime assets.

Production Pages promotion remains fail-closed and continues to require an exact approved `main` SHA plus the sealed production artifact. This purge does not weaken that contract.

## 9. Verification

On the exact final purge SHA, require:

- VVIP Quality Gate PASS.
- Legacy Residue Gate PASS.
- V14 Release Candidate PASS.
- CodeQL PASS.
- TIGER CleanGuard PASS.
- TIGER Social DB Rehearsal PASS.
- LC03 Supabase Security Rehearsal PASS.
- LC04 Production Legacy RPC Rehearsal PASS.
- LC05 Credential Surface Isolation Rehearsal PASS.
- LC06 RLS Performance Hardening Rehearsal PASS.
- Project Control Integrity PASS.
- Dependency Review PASS.
- Zero-Residue Full History PASS.

Additionally inspect the generated release artifact and prove that deleted legacy routes/pages/assets are absent.

## 10. Safety boundaries

This design authorizes current-tree cleanup on an isolated branch only.

It does **not** authorize:

- force-pushing or rewriting repository history;
- deleting GitHub audit history;
- deleting production databases or buckets;
- mutating Production Supabase/AWS/Clerk;
- changing secrets, DNS, payment configuration, or production identities;
- bypassing branch protection or merging directly to `main`;
- weakening security/release gates to make the purge pass.

## 11. Definition of done

The purge is done only when all of the following are true on one exact SHA:

1. A user opening the retained entry point sees Social Core, never the old Marketplace-first platform.
2. Current navigation cannot reach a deleted legacy product page.
3. Public release artifact contains no legacy product shell or orphaned asset.
4. Repository current tree has no known obsolete product/runtime/build artifacts outside explicit dependency-backed exceptions.
5. Marketplace exists only as an internal Social Core module.
6. All required quality/security/data gates are green.
7. The purge PR documents every retained exception with a concrete dependency reason.
8. `main` has not been directly modified.
