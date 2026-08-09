# PRG v1 Production Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare and, only after exact sovereign authorization, execute a fail-closed Production release of Phase B database substrate and exact H2 public artifact.

**Architecture:** PRG separates external-provider readiness, Production DB exact migration, post-migration verification, and GitHub Pages deployment. Read-only preparation can run autonomously. Production mutation and deployment require exact owner authorization plus existing GitHub Environment reviewer enforcement.

**Tech Stack:** GitHub Actions/Environments/Pages, Supabase Postgres, Clerk Production instance, Python release builder, repository evidence JSON.

## Global Constraints

- H2 = `35352136090bd39d9dd6bddc6682c9b9a2d3cafc`.
- Phase B SHA-256 = `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`.
- Production Supabase = `zelcngyyvbomuzokvuxo`.
- `APPROVE_PRODUCTION_RELEASE_EXACT` is required before any Production DB mutation or production workflow trigger by the technical operator.
- Environment approvals remain independently required from `nzuodezuode-byte`.
- Country activation, persistent owner seeding and real application data mutation are out of scope.
- Never use broad `supabase db push`, manual migration-ledger writes or auto-bypass.

---

### Task 1: Freeze PRG preflight capsule

**Files:**
- Create: `reports/prg/v1/preflight.json`
- Create: `reports/prg/v1/owner-action-queue.json`

**Interfaces:**
- Consumes: H2, PCG closure, EHG closure, GitHub Pages state, Production read-only SQL.
- Produces: immutable authorization subject and human-only blocker queue.

- [ ] Re-read `main` and require exact H2.
- [ ] Re-hash/freeze Phase B migration from existing cryptographic evidence.
- [ ] Re-read Production project identity and migration ledger.
- [ ] Verify Production Phase A present / Phase B absent / 12 target tables absent.
- [ ] Verify fail-closed identity resolver and Phase A RLS properties.
- [ ] Record GitHub Pages source/domain state and protected environment state.
- [ ] Record external Clerk/DNS actions that cannot be completed by connected tools.
- [ ] Commit evidence without raw secrets.

### Task 2: Static release-workflow security review

**Files:**
- Read: `.github/workflows/pages.yml`
- Read: `tools/vvip_public_release.py`
- Create: `reports/prg/v1/release-workflow-review.json`

**Interfaces:**
- Consumes: H2 workflow/build source.
- Produces: supply-chain and deterministic-build readiness assessment.

- [ ] Verify workflow scopes and environment boundaries.
- [ ] Verify build cannot deploy when `releaseEligible=false`.
- [ ] Verify public builder strips development Clerk surfaces and forbidden markers.
- [ ] Identify mutable action tags or dependency drift risks and classify whether a pre-release hardening PR is required.
- [ ] Do not modify `main` during review.

### Task 3: External identity/domain readiness inventory

**Files:**
- Create: `reports/prg/v1/external-readiness.json`

**Interfaces:**
- Consumes: verified Clerk Production publishable-key fingerprint, user-visible Clerk setup state, GitHub Pages state.
- Produces: explicit external prerequisite list.

- [ ] Require Clerk Production key/frontend API mapping to `clerk.tigerautoparts.shop`.
- [ ] Record Clerk DNS connection as human/external action until independently proven complete.
- [ ] Record social-provider configuration as conditional on launch UX requirements rather than silently assuming completion.
- [ ] Require GitHub Pages custom-domain verification after actual deployment.

### Task 4: Prepare exact Production authorization capsule

**Files:**
- Create: `reports/prg/v1/authorization-capsule.json`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: non-self-authorizing exact release subject.

- [ ] Set `owner_authorized=false`.
- [ ] Bind H2, migration digest, Production project ref, PCG/EHG evidence and current environment protections.
- [ ] Set scope to exact Phase B migration + postflight + exact H2 workflow trigger.
- [ ] Explicitly set country activation/owner seeding/real data mutation/bypass to false.
- [ ] Set state `AWAITING_EXTERNAL_PREREQUISITES_OR_OWNER_AUTHORIZATION`.

### Task 5: Execute exact Production DB promotion — future authorized step

**Production mutation:** requires exact owner authorization.

- [ ] Revalidate all capsule locks immediately before mutation.
- [ ] Stop on any drift; never repair/rebase silently.
- [ ] Apply exactly one named migration via `Supabase.apply_migration`.
- [ ] Verify exactly one ledger entry and all 12 target objects.
- [ ] Verify no seeded authority/country/listing/business rows.

### Task 6: Execute rollback-contained Production runtime proof — future authorized step

- [ ] Run synthetic proof in a transaction and roll back.
- [ ] Verify inactive country denial, trusted review boundaries and append-only audit.
- [ ] Verify synthetic residue = zero after rollback.
- [ ] Re-run Phase A identity/RLS regression proof.
- [ ] Persist sanitized evidence only.

### Task 7: Trigger exact H2 public build — future authorized step

- [ ] Re-read main=H2 and environment protections.
- [ ] Trigger/re-run exact H2 `pages.yml` build without bypass.
- [ ] Require `production-build` independent reviewer approval.
- [ ] Require build manifest `releaseEligible=true` and exact source SHA.
- [ ] Require `github-pages` independent reviewer approval only after build proof.
- [ ] Verify deployed Pages URL/custom domain/HTTPS and runtime config after deployment.

### Task 8: Production closure

**Files:**
- Create: `reports/prg/v1/closure.json`
- Update through normal reviewed project-state process: `MASTER_PROJECT_STATE.md` when introduced.

- [ ] Record DB ledger/schema/runtime evidence.
- [ ] Record exact Pages deployment/run/artifact evidence.
- [ ] Assert no country activation or persistent owner/data seeding occurred.
- [ ] Set `PRODUCTION_DEPLOYED_VERIFIED` only after all checks pass.
- [ ] Consume the exact owner authorization so it cannot be reused.
