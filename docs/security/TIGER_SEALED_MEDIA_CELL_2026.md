# TIGER Sealed Media Cell 2026

Status: **Owner-approved architecture; implementation branch only. No AWS or Supabase production mutation is authorized by this document alone.**

## Security objective

The media finalizer is a sealed production cell: the browser may request finalization, but it cannot directly invoke the Lambda origin, cannot carry a server secret, cannot select another owner's media, and cannot promote bytes to canonical state without a server-verifiable identity plus the existing one-time capability.

## Request chain

1. The signed-in browser obtains a dedicated Clerk JWT template named `tiger-media` with audience `tiger-media-finalizer`.
2. The browser serializes the finalizer JSON body once, hashes the exact bytes with SHA-256, and sends `x-amz-content-sha256` plus the JWT in `X-Tiger-Session`.
3. CloudFront accepts HTTPS only, applies WAF controls, disables caching, and uses a Lambda origin access control with SigV4 signing behavior `always`.
4. The Lambda function URL uses `AWS_IAM`; its resource policy permits only the intended CloudFront distribution.
5. Lambda verifies RS256 signature, issuer, audience, authorized party (`azp`), `iat`, `nbf`, `exp`, subject shape, and rejects impersonation (`act`). JWKS keys are cached with bounded lifetime and refreshed on unknown `kid`.
6. The verified Clerk `sub` is passed to the trusted Supabase claim RPC. The migration removes the old two-argument token-only claim RPC, so there is no fallback path.
7. The Supabase server key is loaded from AWS Secrets Manager and must be an `sb_secret_*` key. It is used as the `apikey` server credential only; it is never shipped to the browser or stored as a GitHub environment variable.
8. The existing strict JPEG/WebP validation and canonical re-encoding remain authoritative before canonical storage is written.

## Infrastructure split

`bootstrap.json` is the one-time account bootstrap. It creates an immutable ECR repository, an unconfigured Secrets Manager secret shell, exact GitHub OIDC build/deploy roles, a CloudFormation service role, and a permissions boundary. The existing `TIGER-VVIP-GitHub-ProductionDeploy` role is intentionally not modified by this phase.

`runtime.json` is the application cell. It requires an ECR image URI containing `@sha256:<64 hex>`, creates the image Lambda, a fixed Lambda version and `live` alias, an `AWS_IAM` function URL, CloudFront Lambda OAC, no-cache/origin-request policies, WAF, dual Lambda permissions required for function-URL invocation, and basic alarms. The WAF scope is `CLOUDFRONT`, therefore this stack is intentionally restricted to `us-east-1`.

CloudFront's allowed-method set must include the seven-method group in order to support POST; WAF and Lambda remain fail-closed and admit only POST/OPTIONS for this cell.

## Supply-chain gates

The following are hard gates before AWS bootstrap or Production release is allowed:

- The media service obtains a committed `package-lock.json` and uses `npm ci`.
- `sharp` is upgraded only together with that lockfile and regression tests.
- The AWS Lambda Node 24 base image is resolved to a verified digest and the build consumes the digest, not a mutable tag.
- The container image is built once, pushed to immutable ECR, scanned, and referenced in CloudFormation only by digest.
- CycloneDX 1.7 SBOM and signed provenance/SBOM attestations are verified before deployment.
- CloudFormation templates pass tests and CloudFormation Guard; deployment uses a reviewed change set through the CloudFormation service role.
- Runtime smoke tests cover unsigned/invalid JWT, wrong `azp`, wrong owner, replayed capability, oversized request, malformed image, downstream timeout, secret-read failure, and log redaction.
- Only after those tests pass may the CloudFront URL become `TIGER_MEDIA_FINALIZER_URL` and a new Production release build be started. A failed older Production run is never reused.

## Cryptographic Release Passport

Every promoted release must produce an instance of `schemas/tiger-release-passport-v1.schema.json`. The passport binds the Git commit/tree, container digest and base-image digest, CycloneDX SBOM digest, verified attestations, CloudFormation templates/change set, deployed Lambda version and CloudFront distribution, and verification evidence. It is project evidence, not a claim of a separate external certification.

## Deliberately deferred

No EKS/Kubernetes, service mesh, blockchain, custom cryptographic protocol, or active-active multi-region topology is introduced. Enhanced ECR registry scanning, CodeDeploy canary orchestration, GuardDuty/Security Hub aggregation, and organization-level controls are deployment-stage concerns and must be enabled deliberately rather than hidden inside a bootstrap template that changes account-wide posture.
