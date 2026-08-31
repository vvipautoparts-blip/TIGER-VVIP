# VVIP TIGER — AI Operating Model

Official development governance for the current VVIP TIGER repository, subordinate to the owner's mandatory current authority.

## Mandatory first reference

Before any AI actor plans, edits, reviews, tests, or recommends a release action, read:

`docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`

Then read `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md` and the current domain authority relevant to the task. The newest explicit owner-approved decision is the only current truth in its domain.

## Current protected lane

- Product: `TIGER NEXUS 2026`.
- Current implementation lane: PR #349 on `feat/tiger-nexus-2026-20260829`.
- Current work: final owner convergence/reconciliation only; no new product slice before exact-head protected verification.
- PR #349 remains Draft until all required protected checks on the exact current head actually execute on a runner and are GREEN.
- Current convergence does not authorize Production/Staging/provider/database mutation.

A non-executed Actions job, including a job with no executed steps, is blocked verification. It is not GREEN and must not be represented as a code-test failure.

## Roles

| Actor | Responsibility |
| --- | --- |
| **Project owner** | Final product authority; approves protected merge and Production actions. |
| **Authorized repository writer** | Makes bounded changes on the protected feature branch under current owner authority. |
| **Antigravity** | Read-only planning/readiness/risk analysis. |
| **BLACKBOX AI** | Read-only review where used. |
| **GitHub Actions** | Automated verification evidence when jobs actually execute. |

No role may override `TIGER_OWNER_BINDING_CURRENT.md` with older prose, archived instructions, fallbacks, Git history, or stale status documents.

## Current workflow

1. Read `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md` first.
2. Resolve the exact current PR, branch, head SHA, and requested domain.
3. Read relevant current domain authority, machine config, source, and tests.
4. Identify a proven conflict or bounded owner-approved change.
5. Add/update a focused regression contract first when practical.
6. Make the smallest correct protected-branch change while preserving compatible material.
7. Run focused verification and `bash scripts/quality-gate.sh` when the environment supports it.
8. Require actual exact-head runner-executed GREEN evidence for every protected check before readiness/merge progression.
9. Keep merge and Production actions separately protected.

## Current authority guard

Do not restore or invent:

- Pulse prices other than `2 / 10 / 20 / 45 JOD`;
- `TAX_RESERVE 16%` as a current allocation;
- a beneficiary for the pending 16%;
- a separate 1% charity allocation;
- a fixed sector count;
- parallel Marketplace/Fusion product creation/runtime paths;
- product-time expiry for Pulse or ordinary eligible content;
- a multi-winner commission for one sale.

## Branch and PR rules

- `main` remains protected; no direct convergence edits to `main`.
- PR #349 is the current protected convergence lane.
- Do not force-push protected history or use destructive Git cleanup.
- Do not mark PR #349 Ready for Review or merge it until all required exact-head protected checks actually execute and are GREEN and the required review state is satisfied.
- A focused/local PASS is useful evidence for that contract only; it does not replace full protected CI.

## Supabase and Production safety

See `docs/ai/SUPABASE_SAFETY_POLICY.md` where compatible with the newer owner binding.

During current convergence:

- no Production/Staging database mutation;
- no provider/credential mutation;
- no RLS weakening;
- no rewrite of applied historical migrations;
- any obsolete applied migration effect requires a separately authorized forward migration and current-schema verification.

## Forbidden actions without separate current authorization

- `git reset --hard`, `git clean -fd`, `git push --force`;
- destructive repository cleanup;
- Production Supabase/Firebase/provider operations;
- disabling RLS or security controls;
- committing secrets or `.env` material;
- weakening or bypassing quality/security/release gates;
- claiming GREEN, readiness, deployment, capacity, or certification without direct matching evidence.

## Related current references

1. `docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md`
2. `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`
3. `AGENTS.md`
4. `.cursor/rules/vvip-tiger-governance.mdc`
5. `docs/ai/SUPABASE_SAFETY_POLICY.md`
6. `scripts/quality-gate.sh`
7. `.github/workflows/vvip-quality-gate.yml`

`docs/MASTER_PROJECT_STATE.md` is a non-authoritative status surface. Exact Git SHA/tree plus matching verification evidence are implementation truth; they do not supersede the newest owner product decision.
