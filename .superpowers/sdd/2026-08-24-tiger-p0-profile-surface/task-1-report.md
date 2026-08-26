# Task 1 — RED contracts report

## Scope and source state

- Base inspected: `3b266ed77e756cd007f2b1ceac924b3d1db9ebf8`.
- This commit contains tests, the owner-approved plan, SQL rehearsal proof, and this report only. It deliberately contains no migration, runtime/controller implementation, HTML/CSS, release allowlist, or workflow edit.
- The shared worktree already contained untracked profile runtime work before this task's edits. During the task it also received separate untracked migration/workflow changes. They were left untouched. Their presence makes some intended RED contracts GREEN or partially wired in this checkout; that is not claimed as RED evidence against the exact base.

## Files changed

- `docs/superpowers/plans/2026-08-24-tiger-p0-profile-surface.md`
- `tests/tiger-p0-profile-surface-read-model.test.cjs`
- `tests/tiger-social-runtime-adapters.test.cjs`
- `tests/tiger-p0-profile-runtime-adapter.test.cjs` (pre-existing untracked partial contract preserved)
- `tests/tiger-p0-profile-surface.test.cjs`
- `tests/tiger-p0-profile-surface-db.test.cjs`
- `tests/sql/tiger-p0-profile-surface.sql`

## Focused evidence

| Command | Result | Interpretation |
| --- | --- | --- |
| `node --test tests/tiger-p0-profile-surface-read-model.test.cjs` | 5 pass | The pre-existing untracked profile read-model implementation already satisfies the bounded loaded/unavailable and identity rejection contract in this checkout. |
| `node --test tests/tiger-social-runtime-adapters.test.cjs` | 14 pass | The pre-existing untracked runtime change already exposes the profile UUID RPC boundaries; added tests prove no table access or subject-bearing inputs reach persistence. |
| `node --test tests/tiger-p0-profile-runtime-adapter.test.cjs` | 3 pass | Preserved partial adapter contract is green against the same pre-existing runtime change. |
| `node --test tests/tiger-p0-profile-surface.test.cjs` | 6 fail | Expected RED: `scripts/social/profile-controller.js` does not exist; separately the authoritative page/release/rehearsal publication is not wired (`data-social-profile` absent). These are missing product behaviors, not test syntax or fixture failures. |
| `node --test tests/tiger-p0-profile-surface-db.test.cjs` | 3 pass | The SQL proof, raw-table privilege assertions, migration boundary, and exact-head rehearsal registration are now present through separate untracked shared-worktree changes. |

The required local Supabase executable is not installed in this environment (`supabase: command not found`), so the SQL proof cannot be executed until the repository rehearsal environment/CI provides the local stack. It is transaction-scoped and ends in `ROLLBACK` for that later execution.

## Adjacent passing evidence

`node --test tests/tiger-social-feed-read-model.test.cjs tests/tiger-social-feed-controller.test.cjs tests/tiger-public-profile-projection-db.test.cjs tests/tiger-profile-owner-boundary-db.test.cjs tests/tiger-profile-lifecycle-boundary-db.test.cjs` passed 38/38. This preserves the existing public-profile, lifecycle, and feed presentation boundaries while the new Profile destination remains absent.

## Self-review

- Browser-facing adapter and controller contracts use UUIDs and reject Clerk-style/`user_` identity inputs.
- SQL proof asserts authenticated RPC-only access and denial of raw profile/post/follow/relationship table reads.
- Block and lifecycle checks re-read both profile availability and timeline pages; cursor proof verifies page size, no duplicates, and next-cursor continuation.
- No account/security UI contract is added to Profile. No historical migration is changed.
- Source assertions are confined to publication/rehearsal wiring, where the observable artifact is static; the controller, runtime, read-model, and SQL contracts exercise their runtime seams or prepared SQL behavior.

## Concerns / follow-up

1. The shared untracked production changes mean two nominal RED groups are already green and the workflow is partially wired in this checkout; retain that provenance when evaluating TDD evidence.
2. Task 2 must implement the new forward-only RPC signatures exactly and Task 4 must conform to the controller fixture contract before this suite can turn green.
3. The executable local SQL proof remains unrun here because the Supabase CLI is unavailable; CI/local rehearsal must execute it after the related forward migration is stable.

## Fix round 1/5 — Important findings

### DB setup failure changed to a deliberate contract assertion

- Changed `tests/tiger-p0-profile-surface-db.test.cjs` to assert `fs.existsSync(migrationPath)` with the explicit message `forward-only Profile surface migration must exist before its static boundary contract is read` before `readFileSync`.
- Command: `git archive HEAD | tar -x -C "$task_tmp"` followed by `node --test tests/tiger-p0-profile-surface-db.test.cjs` in the archive extraction.
- Relevant output: the clean archived committed HEAD reported `AssertionError: forward-only Profile surface migration must exist before its static boundary contract is read` at `tests/tiger-p0-profile-surface-db.test.cjs:12`; it did not throw `ENOENT`. The archive exited `1`, as expected while the Task 2 migration and workflow are absent from the committed Task 1 source.
- Exact reason: dirty untracked migration bytes cannot satisfy the test; missing Task 2 behavior now produces an observable, intentional RED assertion rather than a test setup/read error.

### Continued-page policy and duplicate behavior

- Changed `tests/sql/tiger-p0-profile-surface.sql` to persist the first timeline item ID, require the continued page to return a different ID, and call the same previously valid cursor after both block and lifecycle transitions.
- The block/lifecycle continued-page assertions require an empty `items` array and absence of both public and friends post text, so stale cursor pages cannot disclose previously authorized data.
- Command: `node --test tests/tiger-p0-profile-surface-db.test.cjs` in the current integration worktree.
- Relevant output: `3` pass, `0` fail. The static SQL contract now confirms `bob_page_one_post_id`, `blocked_continued_timeline`, and `inactive_continued_timeline` are present.
- Exact reason: cursor correctness now covers no duplicate page IDs and reapplication of current block/lifecycle policy on continued keyset pages, rather than only on fresh (`NULL`) cursors.
