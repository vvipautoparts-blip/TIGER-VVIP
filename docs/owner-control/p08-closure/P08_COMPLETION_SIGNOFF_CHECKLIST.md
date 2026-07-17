# P08 Completion Sign-Off Checklist

## Current Recommendation

`NOT_READY`

This checklist cannot directly change phase state. It may only recommend a separate reviewed phase-status pull request after every mandatory item passes.

## Allowed Recommendation States

- `NOT_READY`
- `READY_FOR_SECURITY_REVIEW`
- `READY_FOR_OWNER_REVIEW`
- `APPROVED_FOR_P08_COMPLETION`

## 1. Repository Integrity

- [ ] Work occurred on an isolated branch and worktree.
- [ ] No direct `main` edit was committed.
- [ ] Working tree is clean.
- [ ] Exact reviewed commit SHA is recorded.
- [ ] Secret scan passed.
- [ ] `git diff --check` passed.

## 2. Blocker Register

- [ ] Every blocker has a current state.
- [ ] No blocker is `OPEN`.
- [ ] No blocker is `EVIDENCE_REQUIRED`.
- [ ] No blocker is `REJECTED`.
- [ ] No blocker is `BLOCKED_EXTERNAL`.
- [ ] Every `ACCEPTED` blocker has evidence, reviewer, date, and closure note.

## 3. Local Reset and Migration Evidence

- [ ] `P08-E01` is `REVIEWED_PASS`.
- [ ] `P08-E02` is `REVIEWED_PASS`.
- [ ] `P08-E03` is `REVIEWED_PASS`.
- [ ] Two consecutive green resets are proven.
- [ ] Historical migration checksums are unchanged.
- [ ] Selected migration ordering is deterministic.

## 4. Identity Contract

- [ ] Clerk remains the authentication source.
- [ ] Canonical caller identity is `auth.jwt()->>'sub'`.
- [ ] `public.profiles.clerk_user_id` mapping is verified.
- [ ] No target policy uses `auth.uid()`.
- [ ] No target policy uses `supabase_user_id`.

## 5. RLS Evidence

- [ ] `P08-E09` is `REVIEWED_PASS`.
- [ ] `P08-E10` is `REVIEWED_PASS`.
- [ ] All 19 entities have required operation coverage.
- [ ] Positive cases pass.
- [ ] Negative cases deny access as expected.
- [ ] No approved target policy has an unconditional broad predicate.

## 6. Storage Evidence

- [ ] `P08-E11` is `REVIEWED_PASS`.
- [ ] `P08-E12` is `REVIEWED_PASS`.
- [ ] All six required buckets are verified.
- [ ] Buckets are private by default.
- [ ] Ownership-path tests pass.
- [ ] Unauthorized read/write/delete tests are denied.

## 7. Remote Read-Only Inspection

- [ ] `P08-E04` is `REVIEWED_PASS`.
- [ ] `P08-E05` is `REVIEWED_PASS`.
- [ ] `P08-E06` is `REVIEWED_PASS`.
- [ ] Exact target was verified by two independent signals.
- [ ] Inspection was read-only.
- [ ] No secret or row data was captured.
- [ ] Every drift item is dispositioned.

## 8. Backup and Rollback

- [ ] `P08-E07` is `REVIEWED_PASS`.
- [ ] `P08-E08` is `REVIEWED_PASS`.
- [ ] Current backup is verified.
- [ ] Restore method is verified.
- [ ] Rollback rehearsal is complete.
- [ ] Recovery time and data-loss result are recorded.

## 9. Reviews and Approvals

- [ ] `P08-E13` is `REVIEWED_PASS`.
- [ ] `P08-E14` is `REVIEWED_PASS`.
- [ ] `P08-E15` is `REVIEWED_PASS`.
- [ ] Security approval names the exact evidence set.
- [ ] Owner approval names the exact evidence set.
- [ ] Unresolved review-thread count is zero.

## 10. Post-Merge Verification

- [ ] A post-merge verification plan exists.
- [ ] Evidence `P08-E16` will be tied to the exact merge SHA.
- [ ] Failure of post-merge verification reopens P08 closure.

## 11. P09 Entry Lock

- [ ] P09 has not started.
- [ ] No P09 code or schema work is included in P08 closure PRs.
- [ ] A separate phase-status PR is required.
- [ ] The phase-status PR cannot merge before this checklist is approved.
- [ ] P09 remains blocked until the phase-status PR merges and post-merge verification passes.

## Recommendation Rule

- Use `NOT_READY` while any mandatory evidence is not `REVIEWED_PASS`.
- Use `READY_FOR_SECURITY_REVIEW` only when technical evidence is complete.
- Use `READY_FOR_OWNER_REVIEW` only after security approval passes.
- Use `APPROVED_FOR_P08_COMPLETION` only after owner approval and zero unresolved review threads.

Even `APPROVED_FOR_P08_COMPLETION` does not directly modify `phase-status.json`.
