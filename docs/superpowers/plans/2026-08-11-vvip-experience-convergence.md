# VVIP TIGER Experience Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge the live marketplace experience with the approved Word/V13.1/V14 direction and the owner's 2026-08-11 decision: frictionless ad creation, no blanket manual-review gate, subscription/visibility choice only after the ad is complete, richer 2026 card UX, and seven-sector discovery without weakening security controls.

**Architecture:** Keep Production untouched while work proceeds on an isolated branch. Implement a deterministic product contract plus client-side experience controller over the existing production marketplace repository; preserve Clerk/Supabase/RLS/media validation boundaries. Publication remains fail-closed: users may build an ad freely, then choose an approved country-priced visibility entitlement; automated safety/eligibility checks decide publishability and exceptional policy holds remain possible, but ordinary ads are not forced into blanket manual review.

**Tech Stack:** Static HTML/CSS/JavaScript, Node 22 `node:test`, existing Clerk runtime, Supabase marketplace repository, GitHub Pages release builder.

## Global Constraints

- Do not mutate production Supabase data, secrets, Clerk settings, DNS, country activation, or owner seeding in this change.
- Do not deploy or merge automatically while Custom Domain Launch verification remains a separate gate.
- Keep max listing images at 7 and video disabled unless a separately approved product decision changes them.
- Keep RLS, MIME/size/image validation, authentication, country seals, payment-provider verification, and abuse controls fail-closed.
- Do not hard-code final production prices or impression quantities globally; country policy is authoritative.
- All changes require PR, tests, evidence, and rollback.

---

### Task 1: Owner decision contract

**Files:**
- Create: `project-control/experience-convergence/v1/owner-decision.json`
- Test: `tests/experience-convergence-owner-decision.test.cjs`

**Interfaces:**
- Produces: machine-readable invariants `blanket_manual_review_required=false`, `pricing_step=AFTER_CONTENT_COMPLETE`, seven-sector catalog, and security controls that remain mandatory.

- [ ] **Step 1: Write the failing contract test** asserting the decision file exists, manual review is not the default gate, pricing appears after content completion, seven sectors are declared, and security controls are retained.
- [ ] **Step 2: Run `node --test tests/experience-convergence-owner-decision.test.cjs`** and confirm failure because the decision file does not exist.
- [ ] **Step 3: Create the decision JSON** with the exact approved invariants.
- [ ] **Step 4: Run the test again** and require PASS.
- [ ] **Step 5: Commit** as `feat(product): record frictionless listing decision`.

### Task 2: Production UX contract tests

**Files:**
- Create: `tests/experience-convergence-marketplace.test.cjs`
- Modify: `scripts/vvip-production-marketplace.js`
- Modify: `styles/vvip-production-marketplace.css`

**Interfaces:**
- Produces: seven sector filters, card CTAs, FAB, multi-step create flow, preview, visibility/subscription step, no blanket-review copy.

- [ ] **Step 1: Write failing source-contract tests** for seven sectors, `data-vvip-create-flow`, `data-vvip-plan-step`, `data-vvip-fab`, card save/share/contact actions, and absence of the old blanket-review copy.
- [ ] **Step 2: Run `node --test tests/experience-convergence-marketplace.test.cjs`** and confirm expected failures.
- [ ] **Step 3: Implement the minimum production JS/CSS** to satisfy the new interaction contract while preserving existing repository and media safety boundaries.
- [ ] **Step 4: Re-run the test** and require PASS.
- [ ] **Step 5: Commit** as `feat(ux): converge marketplace creation and card experience`.

### Task 3: Repository publication semantics

**Files:**
- Modify: `scripts/runtime/vvip-marketplace-repository.js`
- Test: `tests/vvip-marketplace-repository.test.cjs`
- Create: `tests/experience-convergence-publication.test.cjs`

**Interfaces:**
- Produces: `prepareForPublication()` semantics that preserve DRAFT until content and entitlement are valid; ordinary flow does not automatically force `PENDING_REVIEW`; exceptional policy holds remain fail-closed.

- [ ] **Step 1: Write failing tests** asserting draft creation is unrestricted by payment, publication preparation requires an entitlement token/receipt boundary, and no blanket `PENDING_REVIEW` transition occurs for ordinary flow.
- [ ] **Step 2: Run the focused repository tests** and confirm failure for the missing publication API.
- [ ] **Step 3: Implement the smallest repository API** without changing live database schema or bypassing RLS; return a fail-closed `ENTITLEMENT_REQUIRED` until server-side publication transport is available.
- [ ] **Step 4: Run repository and new publication tests** and require PASS.
- [ ] **Step 5: Commit** as `feat(listing): separate build flow from publication entitlement`.

### Task 4: Public release surface

**Files:**
- Modify: `tools/vvip_public_release.py`
- Test: `tests/test_vvip_public_release.py`
- Test: `tests/vvip-production-marketplace.test.cjs`

**Interfaces:**
- Consumes: production marketplace JS/CSS from Tasks 2-3.
- Produces: production artifact that includes only approved new assets and rejects legacy blanket-review markers.

- [ ] **Step 1: Add failing release assertions** that the generated production artifact contains the converged production marketplace assets and does not contain the legacy blanket-review copy.
- [ ] **Step 2: Run the focused release tests** and verify RED.
- [ ] **Step 3: Update the release builder only if required** for new approved public assets; otherwise keep the allowlist unchanged.
- [ ] **Step 4: Run the focused release tests** and require PASS.
- [ ] **Step 5: Commit** as `test(release): enforce converged marketplace surface`.

### Task 5: Full verification and PR handoff

**Files:**
- Update: `docs/superpowers/plans/2026-08-11-vvip-experience-convergence.md` checkbox state only if needed.

**Interfaces:**
- Produces: reviewable PR with no Production deployment.

- [ ] **Step 1: Run the full VVIP Quality Gate** through GitHub Actions on the PR head.
- [ ] **Step 2: Verify CodeQL, Dependency Review, V14 Release Candidate, CleanGuard, and Project Control checks on the same SHA.**
- [ ] **Step 3: Inspect changed-file diff for secrets, production configuration changes, DNS/Clerk/Supabase mutations, or country activation changes; require none.**
- [ ] **Step 4: Keep the PR unmerged until the protected review/approval gate is satisfied.**
- [ ] **Step 5: Do not trigger Production deployment as part of this implementation PR.**
