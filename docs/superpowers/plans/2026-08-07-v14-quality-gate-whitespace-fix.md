# V14 Quality Gate Whitespace Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the V14 release-candidate Quality Gate by removing the documented trailing-whitespace violations without changing runtime behavior or production state.

**Architecture:** Treat the existing `git diff --check` failure from GitHub Actions run `31127536567` as the RED test. Apply one documentation-only correction to the exact offending Markdown lines, preserve intended hard line breaks with explicit `<br>`, then re-run repository CI on the resulting integration head before any external activation.

**Tech Stack:** Git, GitHub Actions, Markdown, Bash quality gate.

## Global Constraints

- Do not modify `main` directly.
- Do not apply remote Supabase migrations.
- Do not add or expose Clerk/Supabase production credentials.
- Do not deploy Staging or Production.
- Do not enable CleanGuard purge.
- Preserve V14 runtime behavior exactly; this slice is documentation/CI hygiene only.
- The final release decision remains fail-closed until exact-head CI succeeds.

---

### Task 1: Remove the known `git diff --check` blocker

**Files:**
- Modify: `docs/superpowers/specs/2026-08-06-v13-1-platform-recovery-production-program-design.md`
- Verify: `scripts/quality-gate.sh`

**Interfaces:**
- Consumes: the current Markdown specification and the existing Quality Gate.
- Produces: the same specification semantics with zero trailing-whitespace violations.

- [ ] **Step 1: Confirm RED evidence**

Use the existing GitHub Actions evidence from run `31127536567`, job `92704564895`.

Expected failure:

```text
docs/superpowers/specs/2026-08-06-v13-1-platform-recovery-production-program-design.md:3: trailing whitespace.
...
Process completed with exit code 2.
```

- [ ] **Step 2: Apply the minimal source correction**

Replace only the Markdown hard breaks implemented as two trailing spaces on the reported lines with explicit `<br>` markers. Do not alter runtime files, workflows, SQL, credentials, or V14 application logic.

- [ ] **Step 3: Inspect the resulting diff**

Expected diff characteristics:

```text
1 file changed
0 runtime files changed
0 SQL files changed
0 workflow files changed
```

The only semantic change is Markdown line-break syntax.

- [ ] **Step 4: Integrate through a reviewable PR**

Open the fix branch against `integration/v14-global-launch-readiness-20260806`, review the exact diff, and merge only this documentation correction.

- [ ] **Step 5: Re-qualify the new integration head**

The required verification command remains:

```bash
bash scripts/quality-gate.sh
```

Then the existing V14 candidate workflow must continue with:

```bash
python -m unittest -v tests/test_vvip_public_release.py
node --test \
  tests/auth-clerk-index.test.cjs \
  tests/v14-marketplace-migration.test.cjs \
  tests/vvip-runtime-loader.test.cjs \
  tests/vvip-marketplace-repository.test.cjs \
  tests/vvip-production-marketplace.test.cjs
```

Expected result: Quality Gate passes the former `git diff --check` stage and no new failure is introduced.

- [ ] **Step 6: Preserve fail-closed launch status**

Do not change `BLOCKED_EXTERNAL_ACTIVATION` solely because this CI hygiene blocker is fixed. External activation still requires the existing review, exact-head gates, migration ledger/backup/restore, production identity configuration, country seal, staging validation, canary, and rollback evidence.
