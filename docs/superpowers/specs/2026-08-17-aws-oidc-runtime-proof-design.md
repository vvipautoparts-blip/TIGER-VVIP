# AWS OIDC Runtime Proof Design

## Purpose

Prove that GitHub Actions can obtain short-lived AWS credentials through the already-created GitHub OIDC provider and the IAM role `TIGER-VVIP-GitHub-ProductionDeploy`, without long-lived access keys and without granting deployment permissions yet.

## Scope

This change adds one isolated, manually dispatched GitHub Actions workflow whose only AWS-side action after role assumption is `aws sts get-caller-identity`.

It does **not** deploy to Amplify, S3, Lambda, API Gateway, CloudFront, Supabase, DNS, or any Production runtime. It does not add `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`, and it does not widen the existing AWS trust policy.

## Security invariants

- Repository: `vvipautoparts-blip/TIGER-VVIP` only.
- GitHub Environment: `production-build` only.
- AWS role: `arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-ProductionDeploy` only.
- Workflow permissions: `contents: read` and `id-token: write` only.
- Trigger: `workflow_dispatch` only.
- AWS permissions attached to the role remain zero for this proof.
- No long-lived AWS credentials are stored in GitHub.
- No trust-policy wildcard expansion is permitted.
- No direct mutation of `main` is permitted by this branch.
- Third-party GitHub Actions used by the workflow must be pinned to immutable commit SHAs.

## Execution model

The workflow is added on a feature branch and reviewed through a pull request. Because the current AWS trust policy also requires `token.actions.githubusercontent.com:ref = refs/heads/main`, a run from the feature branch is expected to be denied by AWS and is not the authoritative proof.

The authoritative smoke test can run only after the reviewed workflow reaches `main` through normal protected-branch governance. At that point the job uses `environment: production-build`, requests an OIDC ID token, assumes the production deployment role, and runs `aws sts get-caller-identity`.

Success requires the returned ARN to be an assumed-role session for `TIGER-VVIP-GitHub-ProductionDeploy` in AWS account `211579682376`.

## Workflow behavior

Create `.github/workflows/aws-oidc-runtime-proof.yml` with:

1. `workflow_dispatch` as the sole trigger.
2. Top-level `permissions: contents: read`.
3. One job on `ubuntu-latest` using `environment: production-build`.
4. Job-level permissions adding `id-token: write` and retaining `contents: read`.
5. `aws-actions/configure-aws-credentials` pinned to an immutable commit SHA, configured with:
   - `role-to-assume: arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-ProductionDeploy`
   - `aws-region: us-east-1`
   - a bounded role-session-name derived from the GitHub run id.
6. A fail-closed shell step that runs `aws sts get-caller-identity`, verifies `Account == 211579682376`, and verifies the returned ARN contains `assumed-role/TIGER-VVIP-GitHub-ProductionDeploy/`.
7. No checkout step unless repository content is actually required; the proof does not require source checkout.
8. No secrets, artifacts, deployment commands, resource-listing commands, or mutating AWS API calls.

## Failure handling

- OIDC token failure: job fails before any AWS identity proof.
- Trust-policy mismatch: role assumption fails closed.
- Wrong AWS account: explicit assertion fails.
- Wrong role/session ARN: explicit assertion fails.
- Missing Production Environment approval: GitHub blocks the job before OIDC/AWS execution according to the existing environment protection rules.

No retry path may weaken the trust policy, switch to access keys, or attach broader AWS permissions.

## Verification

Pre-merge verification:

- Static contract test verifies trigger, environment, permissions, role ARN, region, and absence of long-lived credential names and mutating AWS commands.
- Repository quality/security gates remain green on the exact branch head.
- The workflow must remain manual-only and non-deploying.

Post-merge runtime proof on `main`:

- Manually dispatch `AWS OIDC Runtime Proof`.
- Approve the protected `production-build` environment through the existing governance flow.
- Require `configure-aws-credentials` to succeed via OIDC.
- Require `aws sts get-caller-identity` assertions to pass.
- Preserve the successful workflow run URL and exact main SHA as release evidence.

## Non-goals

This proof does not authorize Production deployment and does not establish that F05 is Global Launch Ready. PR #264 still records unresolved Production blockers including concrete listing persistence, Clerk request authentication, trusted JPEG/WebP image processing, durable AWS sinks, deployed runtime verification, and live bypass/adversarial evidence.

## Next gate after proof

Only after the OIDC runtime proof passes on protected `main` should the project design and attach a resource-scoped AWS deployment policy for the exact Production resources that are actually provisioned. That policy must follow least privilege and remain separate from this identity-only proof.