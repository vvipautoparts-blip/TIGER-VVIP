# VVIP TIGER — AI operating model

Official development governance for the static VVIP TIGER web application.

## Roles

| Actor | Responsibility |
| --- | --- |
| **Project owner** | Approves `commit`, `push`, `merge`, production Supabase changes, and release/deploy steps. |
| **Cursor Agent** | Sole author of repository changes; analysis, minimal diffs, local verification. |
| **BLACKBOX AI** | Read-only review using `docs/ai/BLACKBOX_REVIEW_PROMPT.md`; outputs `REVIEW_DECISION=PASS` or `BLOCK`. |
| **GitHub Actions** | Runs `scripts/quality-gate.sh` on pull requests to `main` (`VVIP Quality Gate` workflow). |

## Daily workflow

1. Owner assigns a task; Cursor creates or uses a **feature branch** (never work directly on `main`).
2. Cursor reads `AGENTS.md`, plans, implements the smallest correct change.
3. Cursor runs `bash scripts/quality-gate.sh` and records `VVIP_QUALITY_GATE=PASS` or `FAIL`.
4. Owner runs BLACKBOX with the official prompt on `origin/main...HEAD`.
5. Owner opens a PR using `.github/pull_request_template.md`.
6. GitHub Actions must pass `vvip-quality-gate`.
7. Owner merges after PASS from quality gate, BLACKBOX (no P0/P1), and Actions.

## Branch rules

- **`main`**: protected integration branch; no direct agent commits without owner approval.
- **Feature branches**: one logical task per branch; name per team convention (e.g. `feat/…`, `chore/…`, `fix/…`).
- Do not delete branches or worktrees unless the owner explicitly requests it.

## Pull request rules

- PR target is **`main`** unless owner specifies otherwise.
- PR body must list scope, tests, gate results, Supabase/Firebase impact, rollback plan, and secret confirmation.
- No force-push to `main`.

## Merge conditions

All of the following:

1. `VVIP_QUALITY_GATE=PASS` locally (or reproduced in CI).
2. `REVIEW_DECISION=PASS` from BLACKBOX (no open P0/P1).
3. GitHub Actions **`VVIP Quality Gate`** job green.
4. Explicit owner approval to merge.

## Supabase rules

See **`docs/ai/SUPABASE_SAFETY_POLICY.md`**. Agents do not run production database commands.

## After machine reset or SSH disconnect

Run read-only recovery:

```bash
bash scripts/vvip-recovery-status.sh
```

Interpret `VVIP_RECOVERY_STATUS=PASS` or `ATTENTION`. Do not `git fetch` or Supabase `login`/`link` unless the owner directs the next step.

## Forbidden commands (non-exhaustive)

Agents must not run these without **explicit owner approval**:

- `git reset --hard`, `git clean -fd`, `git push --force`
- `rm -rf` on repository paths
- `supabase link`, `supabase db push`, `supabase db reset`, `supabase migration repair`
- Production Firebase deploy or rotation of live keys in tracked files
- Commits or pushes containing secrets or `.env` material

## Related files

- Cursor rule: `.cursor/rules/vvip-tiger-governance.mdc`
- Quality gate: `scripts/quality-gate.sh`
- CI: `.github/workflows/vvip-quality-gate.yml`
- BLACKBOX prompt: `docs/ai/BLACKBOX_REVIEW_PROMPT.md`
- Agent map: `AGENTS.md`

## Quality gate notes

- **`cleanroom_verify`**: on feature branches, the cleanroom tool’s `scope` gate expects `main`; the quality gate treats **only** that branch mismatch as deferred when all other cleanroom gates pass. On `main`, full `tools/vvip_cleanroom.py --verify` acceptance is required.
- **`qa_smoke`**: skipped locally when the working tree contains **only** governance paths (see allowlist in `scripts/quality-gate.sh`) because `scripts/qa-smoke.sh` historically forbids unlisted `docs/` changes. CI on a committed PR runs the full smoke script on a clean tree.
- **Python tests**: `PYTHONPATH` includes the repository root so `tests/` can import `tools.*` with `--import-mode=importlib`.
