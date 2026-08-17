# AWS OIDC Runtime Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual, non-deploying GitHub Actions proof that authenticates to AWS through OIDC and proves the exact `TIGER-VVIP-GitHub-ProductionDeploy` assumed-role identity without long-lived AWS credentials.

**Architecture:** One static Node contract protects the workflow shape and one isolated `workflow_dispatch` workflow performs the runtime proof. The workflow uses the protected `production-build` GitHub Environment, obtains an OIDC token with `id-token: write`, assumes the exact IAM role, and calls only `aws sts get-caller-identity`; no AWS deployment permissions are added by this change.

**Tech Stack:** GitHub Actions, GitHub OIDC, AWS STS, `aws-actions/configure-aws-credentials` v6.2.3 pinned to verified commit `e6de054238d6b7531b4efff3b6587d9aade6a06c`, Node.js built-in test runner.

## Global Constraints

- Repository is exactly `vvipautoparts-blip/TIGER-VVIP`.
- AWS account is exactly `211579682376`.
- IAM role ARN is exactly `arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-ProductionDeploy`.
- GitHub Environment is exactly `production-build`.
- AWS region is exactly `us-east-1`.
- Workflow trigger is `workflow_dispatch` only.
- GitHub permissions are limited to `contents: read` and job-level `id-token: write`.
- No `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, static AWS session token, or repository secret is permitted.
- No Amplify, S3, Lambda, API Gateway, CloudFront, Route53, IAM mutation, deployment, provisioning, or resource-listing command is permitted.
- The IAM role receives no permission policy in this change.
- The existing trust policy is not widened; authoritative runtime success is possible only from protected `main` with `environment: production-build`.
- Third-party Actions must be pinned to immutable commit SHAs.
- No direct write to `main`; delivery is through a draft PR and normal protected-branch governance.

---

### Task 1: Add the fail-closed static workflow contract

**Files:**
- Create: `tests/aws-oidc-runtime-proof.test.cjs`
- Later consumed: `.github/workflows/aws-oidc-runtime-proof.yml`

**Interfaces:**
- Consumes: workflow file as UTF-8 text from `.github/workflows/aws-oidc-runtime-proof.yml`.
- Produces: repository-wide invariant that the workflow remains manual-only, environment-bound, OIDC-only, immutable-action-pinned, identity-only, and non-deploying.

- [ ] **Step 1: Write the failing test**

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'aws-oidc-runtime-proof.yml');
const ROLE_ARN = 'arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-ProductionDeploy';
const ACTION_SHA = 'e6de054238d6b7531b4efff3b6587d9aade6a06c';

function workflow() {
  assert.equal(fs.existsSync(workflowPath), true, 'AWS OIDC runtime proof workflow must exist');
  return fs.readFileSync(workflowPath, 'utf8');
}

test('AWS OIDC runtime proof is manual, environment-bound, and minimally privileged', () => {
  const source = workflow();
  assert.match(source, /on:\s*\n\s*workflow_dispatch:\s*\{\}/);
  assert.doesNotMatch(source, /\b(push|pull_request|schedule|workflow_run):/);
  assert.match(source, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(source, /environment:\s*production-build/);
  assert.match(source, /id-token:\s*write/);
  assert.doesNotMatch(source, /\b(contents|actions|deployments|packages|security-events):\s*write\b/);
});

test('AWS OIDC runtime proof assumes only the approved role through a pinned action', () => {
  const source = workflow();
  assert.match(source, new RegExp(`aws-actions\\/configure-aws-credentials@${ACTION_SHA}`));
  assert.ok(source.includes(`role-to-assume: ${ROLE_ARN}`));
  assert.match(source, /aws-region:\s*us-east-1/);
  assert.match(source, /allowed-account-ids:\s*['"]?211579682376['"]?/);
  assert.match(source, /role-duration-seconds:\s*900/);
  assert.match(source, /unset-current-credentials:\s*true/);
});

test('AWS OIDC runtime proof contains only identity proof and forbids standing credentials or deployment', () => {
  const source = workflow();
  assert.match(source, /aws sts get-caller-identity/);
  assert.match(source, /assumed-role\/TIGER-VVIP-GitHub-ProductionDeploy\//);
  assert.doesNotMatch(source, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|secrets\./);
  assert.doesNotMatch(source, /aws\s+(amplify|s3|s3api|lambda|apigateway|apigatewayv2|cloudfront|route53|iam|cloudformation|cdk|sam)\b/i);
  assert.doesNotMatch(source, /\b(deploy|publish|sync|put-object|create-|update-|delete-)\b/i);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/aws-oidc-runtime-proof.test.cjs`

Expected: FAIL with `AWS OIDC runtime proof workflow must exist` because `.github/workflows/aws-oidc-runtime-proof.yml` is intentionally absent.

- [ ] **Step 3: Commit the RED contract**

```bash
git add tests/aws-oidc-runtime-proof.test.cjs
git commit -m "test(aws): define OIDC runtime proof contract"
```

---

### Task 2: Implement the minimum identity-only OIDC workflow

**Files:**
- Create: `.github/workflows/aws-oidc-runtime-proof.yml`
- Test: `tests/aws-oidc-runtime-proof.test.cjs`

**Interfaces:**
- Consumes: GitHub protected environment `production-build`; GitHub OIDC token service; IAM role `TIGER-VVIP-GitHub-ProductionDeploy`.
- Produces: a successful manual run whose AWS caller identity is account `211579682376` and an assumed-role session for `TIGER-VVIP-GitHub-ProductionDeploy`.

- [ ] **Step 1: Create the workflow**

```yaml
name: AWS OIDC Runtime Proof

on:
  workflow_dispatch: {}

permissions:
  contents: read

concurrency:
  group: aws-oidc-runtime-proof
  cancel-in-progress: false

jobs:
  prove_identity:
    name: Prove GitHub OIDC to AWS STS identity
    runs-on: ubuntu-latest
    timeout-minutes: 5
    environment: production-build
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Assume zero-standing-credential AWS role
        uses: aws-actions/configure-aws-credentials@e6de054238d6b7531b4efff3b6587d9aade6a06c # v6.2.3
        with:
          role-to-assume: arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-ProductionDeploy
          aws-region: us-east-1
          audience: sts.amazonaws.com
          allowed-account-ids: '211579682376'
          role-duration-seconds: 900
          role-session-name: TIGER-VVIP-${{ github.run_id }}
          unset-current-credentials: true
          mask-aws-account-id: true
          action-timeout-s: 90

      - name: Fail closed unless AWS caller identity is exact
        shell: bash
        run: |
          set -Eeuo pipefail
          identity="$(aws sts get-caller-identity --output json --no-cli-pager)"
          account="$(jq -r '.Account' <<<"$identity")"
          arn="$(jq -r '.Arn' <<<"$identity")"
          test "$account" = "211579682376"
          case "$arn" in
            arn:aws:sts::211579682376:assumed-role/TIGER-VVIP-GitHub-ProductionDeploy/*) ;;
            *) echo "UNEXPECTED_AWS_CALLER_ARN" >&2; exit 1 ;;
          esac
          echo "AWS_OIDC_RUNTIME_PROOF=PASS"
```

- [ ] **Step 2: Run the focused contract and verify GREEN**

Run: `node --test tests/aws-oidc-runtime-proof.test.cjs`

Expected: 3 tests PASS, 0 FAIL.

- [ ] **Step 3: Run the full repository quality gate**

Run: `bash scripts/quality-gate.sh`

Expected: `VVIP_QUALITY_GATE=PASS`, including `GATE_node_cjs_tests=PASS`.

- [ ] **Step 4: Commit the implementation**

```bash
git add .github/workflows/aws-oidc-runtime-proof.yml
git commit -m "ci(aws): add OIDC runtime identity proof"
```

---

### Task 3: Open a protected delivery PR and preserve the runtime-proof boundary

**Files:**
- Review: `docs/superpowers/specs/2026-08-17-aws-oidc-runtime-proof-design.md`
- Review: `docs/superpowers/plans/2026-08-17-aws-oidc-runtime-proof.md`
- Review: `tests/aws-oidc-runtime-proof.test.cjs`
- Review: `.github/workflows/aws-oidc-runtime-proof.yml`

**Interfaces:**
- Consumes: feature branch `chore/aws-oidc-runtime-proof-20260817`.
- Produces: draft PR to `main`; no merge and no runtime dispatch performed by this task.

- [ ] **Step 1: Verify the branch diff is limited to the approved four files**

Run: `git diff --name-only origin/main...HEAD`

Expected exactly:

```text
.github/workflows/aws-oidc-runtime-proof.yml
docs/superpowers/plans/2026-08-17-aws-oidc-runtime-proof.md
docs/superpowers/specs/2026-08-17-aws-oidc-runtime-proof-design.md
tests/aws-oidc-runtime-proof.test.cjs
```

- [ ] **Step 2: Open a Draft PR to protected `main`**

Title: `ci(aws): prove GitHub OIDC runtime identity`

Body must state:

```markdown
## Purpose
Prove GitHub Actions -> OIDC -> AWS STS -> `TIGER-VVIP-GitHub-ProductionDeploy` without long-lived AWS credentials and without deployment permissions.

## Security boundary
- manual `workflow_dispatch` only
- `production-build` environment only
- `contents: read` + `id-token: write` only
- exact role/account/region assertions
- no AWS deployment/resource mutation
- no AWS permission policy added
- no trust-policy widening

## Important runtime note
The current IAM trust policy also requires `ref = refs/heads/main`, so the authoritative OIDC runtime proof cannot succeed from this feature branch. After normal protected review/merge, dispatch the workflow from the exact approved `main` SHA and preserve that run as evidence.

## Non-claim
This PR does not deploy Production and does not make F05 or TIGER-VVIP Global Launch Ready.
```

- [ ] **Step 3: Do not merge or dispatch from the feature branch**

Expected state: PR remains Draft until branch CI/review is complete. Runtime proof remains pending protected delivery to `main`.
