# AWS Identity and Release Security Plane Design

## Status

Approved architecture for TIGER-VVIP. This design replaces the current coupling between a zero-permission OIDC identity proof and the protected `production-build` Environment with separate security planes.

Base source: protected `main` SHA `923eb43dcaec6876ec7bacfae3932313145ac3fa`.

## Problem

The current `.github/workflows/aws-oidc-runtime-proof.yml` assumes `TIGER-VVIP-GitHub-ProductionDeploy` and also declares `environment: production-build`.

That mixes two different security questions:

1. **Identity question:** Can protected TIGER-VVIP GitHub Actions obtain short-lived AWS credentials through OIDC and prove the exact AWS account/role identity?
2. **Production authorization question:** Has an independently reviewed release been authorized to use Production deployment privileges?

Because `production-build` has `prevent_self_review: true`, a reviewer who dispatches the identity proof cannot approve the same run. This is correct GitHub behavior, but it makes an identity-only smoke test depend on a human Production approval gate that it does not need.

The design therefore separates identity proof from Production authorization rather than weakening Environment protection.

## Goals

- Preserve zero standing AWS credentials.
- Make OIDC identity proof automatic and deterministic on protected `main` without a Production Environment approval.
- Keep `production-build` strict: required reviewer, self-review prevention, and no admin bypass.
- Keep `TIGER-VVIP-GitHub-ProductionDeploy` isolated from identity testing.
- Keep AWS resource permissions at zero until a separate resource-scoped deployment policy is designed and validated.
- Fail closed on repository, owner, ref, audience, AWS account, role, and unexpected AWS CLI operations.
- Preserve `main` governance; no direct writes to `main`.
- Reuse the existing build-once, deterministic release artifact, SBOM, and provenance pipeline instead of duplicating it.
- Establish a migration path toward SLSA v1 Build Level 3 without expanding the current change unnecessarily.

## Non-goals

This design does not:

- deploy Amplify, Lambda, API Gateway, S3, CloudFront, Route 53, Supabase, or F05 Production runtime;
- create long-lived AWS access keys;
- grant `AdministratorAccess`, `PowerUserAccess`, or wildcard deployment permissions;
- weaken `production-build` review rules;
- opt the repository into GitHub immutable OIDC subjects in this change;
- claim TIGER-VVIP is Global Launch Ready.

## Architecture

### Plane 1 — Identity Plane

Create a dedicated IAM role:

`TIGER-VVIP-GitHub-OIDCProof`

Properties:

- no attached AWS permission policies;
- no inline AWS permission policies;
- maximum session duration kept minimal for the proof;
- trusted principal is only the existing GitHub OIDC provider for AWS account `211579682376`;
- trust is exact-bound to TIGER-VVIP protected `main` and the current repository identity claims;
- no GitHub Environment claim is required.

The trust contract is:

- `aud = sts.amazonaws.com`;
- `sub = repo:vvipautoparts-blip/TIGER-VVIP:ref:refs/heads/main`;
- `repository_id = 1273805565`;
- `repository_owner_id = 294954557`;
- `ref = refs/heads/main`.

All conditions use exact equality. No wildcard is authorized.

The role exists only to prove OIDC federation. It must remain useless for AWS resource access.

### Plane 2 — Production Control Plane

Keep the existing role:

`TIGER-VVIP-GitHub-ProductionDeploy`

Keep it bound to the protected `production-build` Environment. The current Environment controls remain security invariants:

- required independent reviewer;
- prevent self-review;
- admin bypass disabled;
- `main`-only deployment branch policy.

The role remains separate from the OIDC smoke test. Any future AWS resource permissions are added only after a separate least-privilege policy design, IAM Access Analyzer validation, and no-new-access review.

### Plane 3 — Release / Supply-Chain Plane

Reuse `.github/workflows/production-release-artifact.yml` as the current authoritative build-once release pipeline. It already:

- validates an exact current `main` SHA;
- checks out the exact release SHA;
- runs quality/regression gates;
- builds Production bytes exactly once;
- creates deterministic source/material/SBOM evidence;
- seals a deterministic archive and SHA-256 digest;
- creates GitHub provenance and SBOM attestations;
- verifies attestation identity before preserving the artifact;
- records immutable GitHub artifact identity.

This design does not duplicate that pipeline.

A later supply-chain hardening change may move the trusted build into a reusable workflow to target SLSA v1 Build Level 3. That is intentionally a separate scope because changing the builder trust boundary requires its own review and regression proof.

### Plane 4 — IAM Policy Safety Plane

Before `TIGER-VVIP-GitHub-ProductionDeploy` receives any resource permission, the deployment-policy change must pass:

1. IAM Access Analyzer `ValidatePolicy` with no unresolved ERROR or SECURITY_WARNING findings.
2. A custom no-new-access check against the approved reference policy, or an explicit reviewed delta when new access is intentionally required.
3. Static repository contracts rejecting broad wildcard actions/resources unless explicitly justified by an approved resource model.
4. Exact-resource and exact-action tests for the services being deployed.

Identity Plane creation does not require or authorize ProductionDeploy permissions.

## Canonical Trust-as-Code

The repository will carry a canonical trust-policy definition for `TIGER-VVIP-GitHub-OIDCProof` so AWS console state is reviewable against source control.

The trust document must use:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::211579682376:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:vvipautoparts-blip/TIGER-VVIP:ref:refs/heads/main",
          "token.actions.githubusercontent.com:repository_id": "1273805565",
          "token.actions.githubusercontent.com:repository_owner_id": "294954557",
          "token.actions.githubusercontent.com:ref": "refs/heads/main"
        }
      }
    }
  ]
}
```

The actual IAM role is a one-time bootstrap operation performed through authenticated AWS administration/SSO, not through long-lived GitHub credentials. The repository policy is the reviewable source of truth for that bootstrap.

## OIDC Proof Workflow

Refactor `.github/workflows/aws-oidc-runtime-proof.yml` so it proves only the Identity Plane.

### Triggers

Use both:

- `push` to `main`, so every protected merge proves OIDC automatically;
- `workflow_dispatch`, as an on-demand diagnostic fallback.

The job has **no GitHub Environment**.

### GitHub permissions

Top-level:

```yaml
permissions:
  contents: read
```

Job-level exact allowlist:

```yaml
permissions:
  contents: read
  id-token: write
```

No other `write` permission is allowed.

### AWS behavior

The workflow assumes only:

`arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-OIDCProof`

The only AWS CLI operation allowed in shell runtime is:

`aws sts get-caller-identity`

Success requires:

- account `211579682376`;
- assumed-role ARN prefix `arn:aws:sts::211579682376:assumed-role/TIGER-VVIP-GitHub-OIDCProof/`;
- final marker `AWS_OIDC_IDENTITY_PROOF=PASS`.

There is no checkout requirement and no AWS resource mutation/listing call.

## Concurrency

Identity proof uses a SHA-scoped group:

`aws-oidc-identity-proof-${{ github.sha }}`

with `cancel-in-progress: true`.

This prevents duplicate runs for the same exact source SHA while avoiding a global queue that can block unrelated later SHAs.

Production deployment/build concurrency remains separate and must never share the identity-proof lock.

## Fail-Closed Static Contract

Repository tests must enforce all of the following:

- workflow includes `push` restricted to `main` and `workflow_dispatch`;
- no `environment:` key exists in the OIDC identity-proof job;
- the exact role ARN is `TIGER-VVIP-GitHub-OIDCProof`;
- exact AWS account and region remain pinned;
- only `id-token` may have GitHub `write` permission;
- no long-lived credential names or repository secret references are present;
- third-party actions remain pinned to immutable commit SHAs;
- no `jq` dependency;
- shell AWS command allowlist is exactly `['sts get-caller-identity']`;
- exact expected account and assumed-role ARN are asserted;
- concurrency is SHA-scoped and `cancel-in-progress: true`;
- canonical trust JSON has no wildcard and contains exact `aud`, `sub`, repository ID, owner ID, and ref conditions;
- the OIDC proof role trust definition contains no AWS resource permissions.

## Migration Sequence

1. Land this design on an isolated branch only.
2. Add canonical OIDCProof IAM trust-as-code and static tests first (RED if implementation is absent).
3. Add/refactor the workflow to satisfy the contract (GREEN).
4. Run repository quality/security gates on one exact branch head.
5. Independently review the PR under normal `PRODUCTION-MAIN-GOVERNANCE`.
6. Before merge, bootstrap `TIGER-VVIP-GitHub-OIDCProof` in AWS with the exact reviewed trust policy and **zero permissions**.
7. Verify AWS role ARN and absence of attached/inline permissions.
8. Merge through protected governance only.
9. Let the `push` event on protected `main` execute the automatic identity proof.
10. Preserve the successful run, exact `main` SHA, account, and role identity as evidence.
11. Retire/cancel obsolete waiting runs of the old Environment-coupled proof; no Environment rule is changed.

If the AWS role has not been bootstrapped exactly as reviewed, the PR must not merge because the first protected-main identity run would fail closed.

## Error Handling

- OIDC token issuance fails: job fails.
- AWS role absent: role assumption fails.
- Trust claim mismatch: role assumption fails.
- Wrong account: explicit assertion fails.
- Wrong role/session ARN: explicit assertion fails.
- Any extra GitHub write permission: static contract fails.
- Any AWS CLI command beyond STS caller identity: static contract fails.
- Any wildcard in the canonical trust policy: static contract fails.
- Any reintroduction of `production-build` into the identity-proof job: static contract fails.

No recovery path may add access keys, weaken the trust policy, disable self-review prevention, enable admin bypass, or attach AWS resource permissions to the OIDCProof role.

## Immutable Subject Claims

GitHub supports immutable OIDC subjects that include owner/repository IDs for repositories created after July 15, 2026 or repositories that opt in.

TIGER-VVIP currently uses its existing subject model. This design does **not** opt in because changing the repository-level subject format would also affect `TIGER-VVIP-GitHub-ProductionDeploy` and must be migrated atomically in a separate trust-policy change.

Stable `repository_id` and `repository_owner_id` are already required as additional exact claims in the new role, reducing rename/transfer ambiguity without changing the repository-wide OIDC subject mode.

## Security Result

After migration:

- routine identity proof is automatic, zero-permission, and does not need Production approval;
- Production approval remains independent and cannot self-approve;
- OIDC proof and deployment authorization have separate IAM roles, trust semantics, workflows, and concurrency domains;
- the existing deterministic, attested release artifact remains the promotion unit;
- future permission expansion must pass formal IAM policy analysis before use.

This is the target 2026 architecture for the AWS identity boundary. It reduces privilege and manual coupling while increasing auditability, reproducibility, and fail-closed guarantees.
