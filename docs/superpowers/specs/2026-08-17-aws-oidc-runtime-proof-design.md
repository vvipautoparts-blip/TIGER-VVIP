# AWS OIDC Runtime Proof Design

## Purpose

Prove that GitHub Actions can obtain short-lived AWS credentials through the already-created GitHub OIDC provider and IAM role `TIGER-VVIP-GitHub-ProductionDeploy`, without long-lived access keys and without granting deployment permissions.

## Scope

This change adds one isolated, manually dispatched GitHub Actions workflow whose only AWS-side operation after role assumption is `aws sts get-caller-identity`.

It does **not** deploy to Amplify, S3, Lambda, API Gateway, CloudFront, Supabase, DNS, or any Production runtime. It does not add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, repository secrets, or widen the AWS trust policy.

## Security invariants

- Repository: `vvipautoparts-blip/TIGER-VVIP` only.
- GitHub Environment: `production-build` only.
- AWS role: `arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-ProductionDeploy` only.
- Trigger: `workflow_dispatch` only.
- Top-level GitHub permission: `contents: read`.
- Job-level GitHub permissions: `contents: read` plus `id-token: write` only.
- Static contract enumerates every `*: write` permission and requires the exact list `['id-token']`.
- Static contract parses shell `run: |` bodies and requires the exact AWS CLI operation list `['sts get-caller-identity']`.
- Identity extraction uses AWS CLI `--query '[Account,Arn]' --output text`; there is no `jq` dependency.
- AWS permissions attached to the role remain zero for this proof.
- No long-lived AWS credentials are stored in GitHub.
- No trust-policy wildcard expansion is permitted.
- No direct mutation of `main` is permitted by this branch.
- Third-party GitHub Actions must be pinned to immutable commit SHAs.

## Execution model

The workflow is delivered on a feature branch through a protected pull request. The AWS trust policy requires both `token.actions.githubusercontent.com:ref = refs/heads/main` and `environment = production-build`, so a feature-branch runtime attempt is not authoritative and is expected to be denied.

The authoritative proof can run only after normal protected governance places the reviewed workflow on `main`. The job then uses `environment: production-build`, requests an OIDC token, assumes the exact role, and performs only `aws sts get-caller-identity`.

Success requires:

- AWS account `211579682376`;
- assumed-role ARN prefix `arn:aws:sts::211579682376:assumed-role/TIGER-VVIP-GitHub-ProductionDeploy/`;
- final marker `AWS_OIDC_RUNTIME_PROOF=PASS`.

## Workflow behavior

`.github/workflows/aws-oidc-runtime-proof.yml` contains:

1. `workflow_dispatch` as the sole trigger.
2. Top-level `permissions: contents: read`.
3. One job on `ubuntu-latest` using `environment: production-build`.
4. Job permissions `contents: read` and `id-token: write` only.
5. `aws-actions/configure-aws-credentials` pinned to immutable v6.2.3 commit `e6de054238d6b7531b4efff3b6587d9aade6a06c`.
6. Exact role/account/region constraints and a 900-second session.
7. One fail-closed shell step using:

```bash
read -r account arn < <(aws sts get-caller-identity --query '[Account,Arn]' --output text --no-cli-pager)
```

8. Explicit account and assumed-role ARN assertions.
9. No checkout, secrets, artifacts, resource-listing commands, deployment commands, or mutating AWS API calls.

## Failure handling

- Missing protected Environment approval: GitHub blocks before OIDC/AWS execution.
- OIDC token failure: job fails before identity proof.
- Trust-policy mismatch: role assumption fails closed.
- Wrong account: explicit assertion fails.
- Wrong role/session ARN: explicit assertion fails.
- Any future GitHub write permission other than `id-token`: static contract fails.
- Any future AWS CLI command other than `sts get-caller-identity`: static contract fails.
- Reintroduction of `jq`: static contract fails.

No retry path may weaken the trust policy, switch to access keys, attach AWS permissions, or bypass branch/environment governance.

## Verification

Pre-merge:

- Static contract verifies trigger, environment, exact GitHub write-permission allowlist, role ARN, region, pinned action, no standing credentials, no `jq`, and exact AWS CLI command allowlist.
- Repository quality/security gates must be green on one exact final branch head.
- Review threads must be resolved only after the corresponding contract is implemented and verified.
- `PRODUCTION-MAIN-GOVERNANCE` independent approval remains mandatory; no bypass is allowed.

Post-merge on protected `main`:

- Manually dispatch `AWS OIDC Runtime Proof`.
- Satisfy the existing `production-build` Environment reviewer gate without bypass.
- Require OIDC role assumption to succeed.
- Require the exact account/role assertions and `AWS_OIDC_RUNTIME_PROOF=PASS`.
- Preserve the workflow run and exact `main` SHA as evidence.

## Non-goals

This proof does not authorize Production deployment and does not establish that F05 or TIGER-VVIP is Global Launch Ready. It creates only a zero-standing-credential identity channel.

## Next gate after proof

Only after the protected runtime proof passes should a separate design define resource-scoped AWS deployment permissions for resources that actually exist. That later policy must be least-privilege, evidence-bound, and must not retroactively broaden this identity-only proof.