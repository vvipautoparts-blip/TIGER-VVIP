# AWS OIDC Runtime Proof Design

> **Superseded:** The Environment-coupled identity-proof execution model in this document is superseded by `docs/superpowers/specs/2026-08-17-aws-identity-release-plane-design.md`. New implementation must use the dedicated zero-permission `TIGER-VVIP-GitHub-OIDCProof` role without `production-build`; `TIGER-VVIP-GitHub-ProductionDeploy` and the protected Production Environment remain separate authorization controls.

## Historical Purpose

Prove that GitHub Actions can obtain short-lived AWS credentials through the already-created GitHub OIDC provider and IAM role `TIGER-VVIP-GitHub-ProductionDeploy`, without long-lived access keys and without granting deployment permissions.

## Historical Scope

This change added one isolated, manually dispatched GitHub Actions workflow whose only AWS-side operation after role assumption was `aws sts get-caller-identity`.

It did **not** deploy to Amplify, S3, Lambda, API Gateway, CloudFront, Supabase, DNS, or any Production runtime. It did not add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, repository secrets, or widen the AWS trust policy.

## Historical Security invariants

- Repository: `vvipautoparts-blip/TIGER-VVIP` only.
- GitHub Environment: `production-build` only.
- AWS role: `arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-ProductionDeploy` only.
- Trigger: `workflow_dispatch` only.
- Top-level GitHub permission: `contents: read`.
- Job-level GitHub permissions: `contents: read` plus `id-token: write` only.
- Static contract enumerated every `*: write` permission and required the exact list `['id-token']`.
- Static contract parsed shell `run: |` bodies and required the exact AWS CLI operation list `['sts get-caller-identity']`.
- Identity extraction used AWS CLI `--query '[Account,Arn]' --output text`; there was no `jq` dependency.
- AWS permissions attached to the role remained zero for this proof.
- No long-lived AWS credentials were stored in GitHub.
- No trust-policy wildcard expansion was permitted.
- No direct mutation of `main` was permitted by this branch.
- Third-party GitHub Actions were pinned to immutable commit SHAs.

## Historical Execution model

The workflow was delivered on a feature branch through a protected pull request. The AWS trust policy required both `token.actions.githubusercontent.com:ref = refs/heads/main` and `environment = production-build`, so a feature-branch runtime attempt was not authoritative and was expected to be denied.

The authoritative proof could run only after normal protected governance placed the reviewed workflow on `main`. The job then used `environment: production-build`, requested an OIDC token, assumed the exact role, and performed only `aws sts get-caller-identity`.

Success required:

- AWS account `211579682376`;
- assumed-role ARN prefix `arn:aws:sts::211579682376:assumed-role/TIGER-VVIP-GitHub-ProductionDeploy/`;
- final marker `AWS_OIDC_RUNTIME_PROOF=PASS`.

## Historical Workflow behavior

`.github/workflows/aws-oidc-runtime-proof.yml` originally contained:

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

## Historical Failure handling

- Missing protected Environment approval: GitHub blocked before OIDC/AWS execution.
- OIDC token failure: job failed before identity proof.
- Trust-policy mismatch: role assumption failed closed.
- Wrong account: explicit assertion failed.
- Wrong role/session ARN: explicit assertion failed.
- Any future GitHub write permission other than `id-token`: static contract failed.
- Any future AWS CLI command other than `sts get-caller-identity`: static contract failed.
- Reintroduction of `jq`: static contract failed.

No retry path was allowed to weaken the trust policy, switch to access keys, attach AWS permissions, or bypass branch/environment governance.

## Historical Verification

Pre-merge:

- Static contract verified trigger, environment, exact GitHub write-permission allowlist, role ARN, region, pinned action, no standing credentials, no `jq`, and exact AWS CLI command allowlist.
- Repository quality/security gates had to be green on one exact final branch head.
- Review threads were resolved only after the corresponding contract was implemented and verified.
- `PRODUCTION-MAIN-GOVERNANCE` independent approval remained mandatory; no bypass was allowed.

Post-merge on protected `main`:

- Manually dispatch `AWS OIDC Runtime Proof`.
- Satisfy the existing `production-build` Environment reviewer gate without bypass.
- Require OIDC role assumption to succeed.
- Require the exact account/role assertions and `AWS_OIDC_RUNTIME_PROOF=PASS`.
- Preserve the workflow run and exact `main` SHA as evidence.

## Non-goals

This historical proof did not authorize Production deployment and did not establish that F05 or TIGER-VVIP was Global Launch Ready. It created only a zero-standing-credential identity channel.

## Replacement

All new OIDC identity-proof work must follow `docs/superpowers/specs/2026-08-17-aws-identity-release-plane-design.md`, which separates the zero-permission Identity Plane from Production authorization and reuses the existing attested release pipeline without weakening `production-build`.
