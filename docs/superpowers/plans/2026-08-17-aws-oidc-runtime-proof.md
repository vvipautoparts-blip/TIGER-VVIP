# AWS OIDC Runtime Proof Implementation Plan

**Goal:** Deliver a manual, non-deploying GitHub Actions proof that authenticates to AWS through OIDC and proves the exact `TIGER-VVIP-GitHub-ProductionDeploy` assumed-role identity without long-lived AWS credentials.

**Architecture:** One static Node contract protects the workflow shape and one isolated `workflow_dispatch` workflow performs the runtime proof. The protected `production-build` GitHub Environment supplies the governance boundary; GitHub OIDC supplies short-lived credentials; AWS STS supplies only caller identity. The IAM role has zero attached permission policies during this proof.

**Immutable dependency:** `aws-actions/configure-aws-credentials` v6.2.3 pinned to commit `e6de054238d6b7531b4efff3b6587d9aade6a06c`.

## Binding constraints

- Repository: `vvipautoparts-blip/TIGER-VVIP`.
- AWS account: `211579682376`.
- IAM role: `arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-ProductionDeploy`.
- GitHub Environment: `production-build`.
- AWS region: `us-east-1`.
- Trigger: `workflow_dispatch` only.
- Top-level GitHub permission: `contents: read`.
- Job permissions: `contents: read` and `id-token: write` only.
- Exact allowed `*: write` list: `['id-token']`.
- Exact allowed shell AWS CLI operation list: `['sts get-caller-identity']`.
- No `jq`; identity extraction uses AWS CLI `--query '[Account,Arn]' --output text`.
- No standing AWS credentials, repository secrets, deployment commands, resource-listing commands, AWS permission policies, trust-policy widening, branch-protection bypass, or Environment bypass.
- No direct write to `main`.

---

## Task 1 — Foundational RED contract

- [x] Create `tests/aws-oidc-runtime-proof.test.cjs` before the workflow exists.
- [x] Require manual trigger, protected Environment, minimal GitHub permissions, exact role/account/region, immutable action pin, no standing credentials, and identity-only behavior.
- [x] Verify RED because `.github/workflows/aws-oidc-runtime-proof.yml` is absent.
- [x] Preserve RED commit `9777d2d42351af68712c90cf5d51a5812082377d`.

## Task 2 — Minimum identity-only workflow

- [x] Create `.github/workflows/aws-oidc-runtime-proof.yml`.
- [x] Configure `production-build`, `id-token: write`, exact role/account/region, 900-second session, and immutable action pin.
- [x] Perform only `aws sts get-caller-identity` after role assumption.
- [x] Verify the returned account and assumed-role ARN fail closed.
- [x] Preserve baseline GREEN implementation `39b081fc5c30a724e016cb8698a8fd8d9300d45a`.

Canonical identity step:

```yaml
      - name: Fail closed unless AWS caller identity is exact
        shell: bash
        run: |
          set -Eeuo pipefail
          read -r account arn < <(aws sts get-caller-identity --query '[Account,Arn]' --output text --no-cli-pager)
          test "$account" = "211579682376"
          case "$arn" in
            arn:aws:sts::211579682376:assumed-role/TIGER-VVIP-GitHub-ProductionDeploy/*) ;;
            *) echo "UNEXPECTED_AWS_CALLER_ARN" >&2; exit 1 ;;
          esac
          echo "AWS_OIDC_RUNTIME_PROOF=PASS"
```

## Task 3 — Review-driven fail-closed hardening

### 3.1 Remove `jq`

- [x] Add no-`jq` / AWS CLI-native extraction contract first.
- [x] Preserve intentional RED commit `826c95cdd98dcd75e876bb49aeaec3795546bcf4`.
- [x] Confirm Quality Gate failed specifically on the existing `jq` calls.
- [x] Preserve diagnostic digest `sha256:2cb4eb45d55bea351d9ea24677715da2f40e35cfbf994673a1ea6066c97b39de`.
- [x] Replace JSON + `jq` parsing with AWS CLI `--query '[Account,Arn]' --output text`.
- [x] Preserve GREEN fix `58cbc3a65901e115e9f3b53396cf56be395c2680`.

### 3.2 Close the GitHub permission allowlist

- [x] Enumerate every YAML `*: write` permission.
- [x] Require the exact list `['id-token']` rather than a service blacklist.
- [x] Preserve contract commit `c7fa3e47bdae90aabd9a3372cfb21be091da7bdb`.

### 3.3 Close the AWS CLI command allowlist

- [x] Parse only shell `run: |` bodies so `aws-actions/...` is not misclassified as an AWS CLI command.
- [x] Enumerate every `aws <service> <operation>` invocation.
- [x] Require the exact list `['sts get-caller-identity']`.
- [x] Preserve contract commit `d5ba12496cc7e5244b896d36a4a6cce13d23eb39`.
- [x] Reply to and resolve the three review threads with exact-head evidence.

## Task 4 — Protected PR verification

- [x] Keep the diff limited to exactly four files:
  - `.github/workflows/aws-oidc-runtime-proof.yml`
  - `docs/superpowers/plans/2026-08-17-aws-oidc-runtime-proof.md`
  - `docs/superpowers/specs/2026-08-17-aws-oidc-runtime-proof-design.md`
  - `tests/aws-oidc-runtime-proof.test.cjs`
- [x] Convert PR #265 from Draft to Ready for review.
- [x] Request independent reviewer `nzuodezuode-byte`.
- [x] Enable protected auto-merge; do not bypass governance.
- [x] Keep AWS role permission policies at zero.
- [ ] Re-verify all branch checks on the final documentation-aligned head.
- [ ] Obtain the required independent approving review.
- [ ] Allow protected auto-merge to complete.

## Task 5 — Authoritative runtime proof on protected `main`

Do not perform this task until Task 4 is complete.

- [ ] Record the exact merged `main` SHA.
- [ ] Dispatch `AWS OIDC Runtime Proof` from that exact `main` SHA.
- [ ] Satisfy the existing `production-build` required-reviewer gate without bypass.
- [ ] Require OIDC role assumption to succeed.
- [ ] Require account `211579682376`.
- [ ] Require ARN prefix `arn:aws:sts::211579682376:assumed-role/TIGER-VVIP-GitHub-ProductionDeploy/`.
- [ ] Require `AWS_OIDC_RUNTIME_PROOF=PASS`.
- [ ] Preserve the successful run and exact SHA as release evidence.

## Explicit stop conditions

If any protected gate fails, stop that promotion path and diagnose it. Never compensate by:

- creating Access Keys;
- adding AdministratorAccess or any other AWS permission policy;
- widening OIDC trust conditions;
- permitting a feature branch in the Production trust path;
- bypassing `PRODUCTION-MAIN-GOVERNANCE`;
- bypassing `production-build` reviewers;
- deploying Production;
- modifying DNS or Supabase Production.

## Next gate after proof

Only after Task 5 passes may a separate, reviewed design define least-privilege deployment permissions for exact AWS resources that actually exist. Identity proof and deployment authority remain separate gates.