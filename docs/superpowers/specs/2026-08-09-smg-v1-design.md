# SMG v1 — Sovereign Merge Gate Design

## Purpose

SMG v1 governs the transition of VVIP TIGER Phase B from the verified pull-request head into `main` without granting any Production authority.

Constitutional rule:

> **Authorization is valid only for the exact reviewed head and exact reviewed main base. Any drift invalidates authorization.**

SMG is a merge-governance layer above SRPC v1. SRPC proves release bytes and Staging behavior; SMG proves that the exact reviewed Git graph is the graph being merged.

## Approved subject

- Repository: `vvipautoparts-blip/TIGER-VVIP`
- Pull request: `#181`
- Approved PR head H1: `1e7fb3c1e43415e5bfaee957b6ab553ae68bc139`
- Observed main base B0 at design adoption: `4cc292e626fea39f3b0e56b98781d521efef789d`
- Phase B migration path: `supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql`
- Phase B migration SHA-256: `9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9`
- PR state at design adoption: open, draft, `mergeable=true`, `mergeable_state=blocked`.
- H1 Fresh CI: verified green before SMG adoption.

B0 is an observed authorization baseline, not a permanent repository identity. It MUST be re-read immediately before owner authorization and again immediately before merge. If `main` changes, the authorization capsule is invalid and must be rebuilt against the new base.

## Non-negotiable invariants

1. `APPROVE_MERGE_EXACT` is an explicit human authorization phrase, not a secret or authentication credential.
2. Authorization scope is exactly PR #181 at H1 and the recorded main base.
3. Any PR-head drift invalidates authorization.
4. Any main-base drift invalidates authorization.
5. Any migration-byte drift invalidates authorization.
6. Any required check that is not successful invalidates authorization.
7. The proof plane MUST NOT possess merge authority.
8. The merge primitive MUST pass `expected_head_sha=H1` to GitHub.
9. Auto-merge is forbidden for this gate.
10. Rebase and squash are forbidden for this gate; use a normal merge commit so H2 retains explicit base/head parentage.
11. The PR remains Draft until exact owner authorization exists and the final pre-merge revalidation passes.
12. Marking the PR Ready for Review does not itself grant merge authority.
13. Immediately after marking Ready, all exact-head/base/check conditions MUST be re-read.
14. After merge, H2 MUST be fetched from `main`, and the merge commit parents MUST bind the approved pre-merge base and H1.
15. Fresh H2 CI is mandatory before the merge is considered closed.
16. A Merge Closure Attestation MUST bind PR #181, H1, approved base, H2, migration digest, and H2 CI result.
17. No Production secret, Production migration, country activation, owner seeding, or Production deployment is allowed by SMG v1.
18. SMG completion state is `MERGED_VERIFIED`, never `PRODUCTION_APPROVED` or `PRODUCTION_DEPLOYED`.
19. Any STOP condition fails closed. No automated repair may silently mutate H1 or main and continue under the old authorization.
20. `MASTER_PROJECT_STATE.md` is not updated to “Production Verified” by SMG; Production closure belongs to a later independent gate.

## Separation of planes

### Proof plane

May:
- read PR #181, `main`, H1 checks, and migration bytes;
- generate deterministic authorization evidence;
- verify exact identities and check conclusions;
- generate post-merge closure evidence and attestations.

Must not:
- mark Ready;
- merge;
- mutate H1;
- mutate `main`;
- deploy or write Production.

### Human authority plane

The owner may issue `APPROVE_MERGE_EXACT` after reviewing an authorization capsule whose exact H1 and base are visible.

Human authorization does not survive head/base/check drift.

### Merge execution plane

May perform only:
1. re-read H1/base/checks;
2. mark PR #181 Ready for Review if still Draft;
3. re-read H1/base/checks/mergeability;
4. invoke one normal GitHub merge with `expected_head_sha=H1`;
5. read resulting H2.

It has no Production authority.

## State machine

1. `H1_FROZEN`
2. `BASE_OBSERVED`
3. `PREMERGE_PROOF_COMPLETE`
4. `AWAITING_EXACT_OWNER_AUTHORIZATION`
5. `MERGE_AUTHORIZED_EXACT`
6. `READY_TRANSITION_VERIFIED`
7. `ATOMIC_MERGE_SUCCEEDED`
8. `H2_IDENTITY_VERIFIED`
9. `H2_CI_GREEN`
10. `MERGE_CLOSURE_ATTESTED`
11. `MERGED_VERIFIED`
12. `STOP_BEFORE_PRODUCTION`

No machine-controlled transition may create state 5.

## Merge Authorization Capsule

The capsule is stored outside PR #181 and outside `main`, on the SRPC/SMG control plane. It contains at minimum:

```json
{
  "schema": "https://vvip.tiger/smg/merge-authorization/v1",
  "repository": "vvipautoparts-blip/TIGER-VVIP",
  "pull_request": 181,
  "approved_head": "1e7fb3c1e43415e5bfaee957b6ab553ae68bc139",
  "expected_main_base": "<runtime exact SHA>",
  "migration": {
    "path": "supabase/migrations/20260808224500_global_launch_phase_b_marketplace_convergence.sql",
    "sha256": "9dd28d7c02c7b1a37da59b0ac8fe28df73f656d9f9a16dcd356989cc3520a8b9"
  },
  "h1_checks": "GREEN",
  "srpc_staging": "VERIFIED",
  "srpc_attestation": "VERIFIED",
  "steel_shield_pin": "VERIFIED_GREEN",
  "owner_merge_authorized": false,
  "authority_scope": "MERGE_ONLY",
  "production_authority": "NONE"
}
```

The capsule must never claim owner authorization before the owner gives it.

## Final pre-merge conditions

Immediately before execution, all must hold:

- PR #181 is open.
- PR head equals H1 exactly.
- PR base ref is `main`.
- `main` head equals the capsule base exactly.
- H1 migration digest equals the frozen digest.
- required/current H1 checks are completed successfully.
- no new H1 check is failing or pending in the required evidence set.
- PR is mergeable after Ready transition.
- no auto-merge is enabled.
- owner authorization is exact and scoped to merge only.

If any condition fails, STOP and invalidate the capsule.

## Atomic merge

Use GitHub normal merge semantics with:

- PR: `181`
- method: `merge`
- `expected_head_sha`: exact H1

No squash, rebase, auto-merge, or branch-head mutation is permitted.

## H2 verification

After GitHub reports merge success:

- fetch `main` and record exact H2;
- fetch H2 commit;
- require H2 to be a merge commit;
- require parent set/order to bind the approved pre-merge base and H1 according to GitHub's merge result;
- require PR #181 to report `merged=true` and `merged_at` populated;
- require main head to equal H2;
- recompute/check Phase B migration digest from H2;
- run/observe Fresh H2 CI.

If H2 identity or bytes fail, classify as critical closure failure and do not proceed toward Production.

## Merge Closure Attestation

The post-merge statement binds:

- repository;
- PR #181;
- H1;
- approved main base;
- H2;
- Phase B migration path/digest;
- H2 CI run identities/conclusions;
- state `MERGED_VERIFIED`.

The attestation does not contain Production authorization.

## STOP codes

- `SMG-001 PR_HEAD_DRIFT`
- `SMG-002 MAIN_BASE_DRIFT`
- `SMG-003 MIGRATION_BYTE_DRIFT`
- `SMG-004 H1_CHECKS_NOT_GREEN`
- `SMG-005 OWNER_AUTHORIZATION_MISSING`
- `SMG-006 AUTHORIZATION_SCOPE_INVALID`
- `SMG-007 READY_TRANSITION_DRIFT`
- `SMG-008 PR_NOT_MERGEABLE`
- `SMG-009 AUTO_MERGE_DETECTED`
- `SMG-010 ATOMIC_MERGE_REJECTED`
- `SMG-011 H2_IDENTITY_MISMATCH`
- `SMG-012 H2_PARENTAGE_MISMATCH`
- `SMG-013 POST_MERGE_BYTE_DRIFT`
- `SMG-014 H2_CI_NOT_GREEN`
- `SMG-015 CLOSURE_ATTESTATION_INVALID`
- `SMG-016 PRODUCTION_SCOPE_VIOLATION`

## Acceptance criteria

SMG v1 is complete for Phase B only when:

- the exact authorization capsule was reviewed;
- exact owner authorization was supplied;
- the normal merge succeeded with expected H1;
- H2 identity/parentage/migration bytes were verified;
- Fresh H2 CI is green;
- the closure attestation validates;
- final state is `MERGED_VERIFIED`;
- Production remains untouched and independently gated.
