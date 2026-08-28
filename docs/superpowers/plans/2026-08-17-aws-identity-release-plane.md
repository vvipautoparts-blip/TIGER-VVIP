# AWS Identity and Release Security Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate zero-permission GitHub→AWS OIDC identity proof from protected Production deployment authorization while preserving exact trust, protected `main`, and the existing attested build-once release pipeline.

**Architecture:** Introduce a dedicated zero-permission IAM role contract, `TIGER-VVIP-GitHub-OIDCProof`, whose trust is exact-bound to repository/owner IDs and `refs/heads/main` without a GitHub Environment. Refactor the identity-proof workflow to run automatically after protected pushes to `main` and on manual dispatch, while keeping `TIGER-VVIP-GitHub-ProductionDeploy` and `production-build` unchanged. Treat the repository trust JSON plus static tests as the source-reviewed AWS bootstrap contract; actual IAM creation remains a one-time authenticated AWS administration step before merge.

**Tech Stack:** GitHub Actions, GitHub OIDC, AWS IAM/STS, Node.js `node:test`, JSON trust policy, existing VVIP quality/security gates.

## Global Constraints

- Repository: `vvipautoparts-blip/TIGER-VVIP` only.
- Protected base: `main`; no direct writes to `main`.
- AWS account: `211579682376` only.
- OIDC provider: `token.actions.githubusercontent.com` only.
- OIDC audience: `sts.amazonaws.com` only.
- New proof role: `TIGER-VVIP-GitHub-OIDCProof` with zero attached and zero inline AWS permission policies.
- Production role: `TIGER-VVIP-GitHub-ProductionDeploy` remains separate and remains bound to `production-build`.
- `production-build` remains protected by required independent review, prevent-self-review, no admin bypass, and `main`-only branch policy.
- Exact trust claims for proof role: `sub=repo:vvipautoparts-blip/TIGER-VVIP:ref:refs/heads/main`, `repository_id=1273805565`, `repository_owner_id=294954557`, `ref=refs/heads/main`, `aud=sts.amazonaws.com`.
- Trust conditions use `StringEquals`; no wildcard is authorized.
- GitHub job write permissions allow only `id-token: write`; `contents` stays `read`.
- The only shell AWS CLI operation allowed is `aws sts get-caller-identity`.
- No `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, repository AWS secrets, `jq`, deployment commands, or resource mutation/listing commands.
- Third-party actions remain pinned to immutable commit SHAs.
- Existing `.github/workflows/production-release-artifact.yml` is reused unchanged in this scope.
- No Amplify/Lambda/API Gateway/S3/CloudFront/Route53/Supabase/DNS Production deploy is authorized by this plan.

---

### Task 1: Lock the separated Identity Plane contract with RED tests

**Files:**
- Modify: `tests/aws-oidc-runtime-proof.test.cjs`
- Create later in Task 2: `infra/aws/iam/github-oidc-proof-trust.json`
- Modify later in Task 3: `.github/workflows/aws-oidc-runtime-proof.yml`

**Interfaces:**
- Consumes: existing workflow text at `.github/workflows/aws-oidc-runtime-proof.yml`.
- Produces: a static contract that requires the new proof role, exact trust JSON, automatic protected-main trigger, no `environment:`, SHA-scoped concurrency, and identity-only behavior.

- [ ] **Step 1: Replace the old environment-bound constants and path setup**

Use these exact constants at the top of `tests/aws-oidc-runtime-proof.test.cjs`:

```js
const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'aws-oidc-runtime-proof.yml');
const trustPath = path.join(process.cwd(), 'infra', 'aws', 'iam', 'github-oidc-proof-trust.json');
const ROLE_ARN = 'arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-OIDCProof';
const ACTION_SHA = 'e6de054238d6b7531b4efff3b6587d9aade6a06c';
const EXPECTED_SUB = 'repo:vvipautoparts-blip/TIGER-VVIP:ref:refs/heads/main';
```

Add a helper:

```js
function trustPolicy() {
  assert.equal(fs.existsSync(trustPath), true, 'canonical OIDCProof trust policy must exist');
  return JSON.parse(fs.readFileSync(trustPath, 'utf8'));
}
```

- [ ] **Step 2: Replace the old trigger/environment test with the separated trigger contract**

Add this exact behavior:

```js
test('AWS OIDC identity proof runs on protected main and manual dispatch without a Production environment', () => {
  const source = workflow();
  assert.match(source, /on:\s*\n(?:\s+[^\n]+\n)*?\s*push:\s*\n\s*branches:\s*\n\s*-\s*main/);
  assert.match(source, /workflow_dispatch:\s*\{\}/);
  assert.doesNotMatch(source, /\benvironment\s*:/);
  assert.match(source, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(source, /id-token:\s*write/);
  const writePermissions = [...source.matchAll(/^\s*([A-Za-z0-9_-]+):\s*write\s*$/gm)]
    .map(([, permission]) => permission);
  assert.deepEqual(writePermissions, ['id-token']);
});
```

- [ ] **Step 3: Require SHA-scoped concurrency and the new role**

Add assertions:

```js
test('AWS OIDC identity proof isolates duplicate runs by exact SHA', () => {
  const source = workflow();
  assert.match(source, /group:\s*aws-oidc-identity-proof-\$\{\{\s*github\.sha\s*\}\}/);
  assert.match(source, /cancel-in-progress:\s*true/);
});

test('AWS OIDC identity proof assumes only the zero-permission proof role through a pinned action', () => {
  const source = workflow();
  assert.match(source, new RegExp(`aws-actions\\/configure-aws-credentials@${ACTION_SHA}`));
  assert.ok(source.includes(`role-to-assume: ${ROLE_ARN}`));
  assert.match(source, /aws-region:\s*us-east-1/);
  assert.match(source, /allowed-account-ids:\s*['"]?211579682376['"]?/);
  assert.match(source, /role-duration-seconds:\s*900/);
  assert.match(source, /unset-current-credentials:\s*true/);
});
```

- [ ] **Step 4: Require the exact canonical trust policy and forbid wildcard/resource permissions**

Add:

```js
test('canonical OIDCProof trust policy is exact, main-bound, and wildcard-free', () => {
  const policy = trustPolicy();
  assert.equal(policy.Version, '2012-10-17');
  assert.equal(policy.Statement.length, 1);
  const statement = policy.Statement[0];
  assert.equal(statement.Effect, 'Allow');
  assert.equal(statement.Action, 'sts:AssumeRoleWithWebIdentity');
  assert.equal(
    statement.Principal.Federated,
    'arn:aws:iam::211579682376:oidc-provider/token.actions.githubusercontent.com',
  );
  assert.deepEqual(statement.Condition.StringEquals, {
    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    'token.actions.githubusercontent.com:sub': EXPECTED_SUB,
    'token.actions.githubusercontent.com:repository_id': '1273805565',
    'token.actions.githubusercontent.com:repository_owner_id': '294954557',
    'token.actions.githubusercontent.com:ref': 'refs/heads/main',
  });
  const serialized = JSON.stringify(policy);
  assert.doesNotMatch(serialized, /\*/);
  assert.doesNotMatch(serialized, /"Resource"|"NotResource"/);
});
```

- [ ] **Step 5: Update identity assertions and keep the existing command/write allowlists**

Change assumed-role matching from `TIGER-VVIP-GitHub-ProductionDeploy` to `TIGER-VVIP-GitHub-OIDCProof` and require marker `AWS_OIDC_IDENTITY_PROOF=PASS`. Keep tests enforcing no standing credentials, no `jq`, and exact AWS CLI allowlist `['sts get-caller-identity']`.

- [ ] **Step 6: Run focused RED test**

Run:

```bash
node --test tests/aws-oidc-runtime-proof.test.cjs
```

Expected: FAIL because `infra/aws/iam/github-oidc-proof-trust.json` is absent and the existing workflow still uses `production-build` plus the ProductionDeploy role.

- [ ] **Step 7: Commit RED contract**

```bash
git add tests/aws-oidc-runtime-proof.test.cjs
git commit -m "test(aws): define separated OIDC identity plane contract"
```

### Task 2: Add canonical zero-permission OIDCProof trust-as-code

**Files:**
- Create: `infra/aws/iam/github-oidc-proof-trust.json`
- Test: `tests/aws-oidc-runtime-proof.test.cjs`

**Interfaces:**
- Consumes: exact repository/owner/ref/audience identity defined in the approved spec.
- Produces: canonical trust JSON used for AWS bootstrap review; it contains trust only and no IAM permission policy document.

- [ ] **Step 1: Create the exact trust JSON**

Create `infra/aws/iam/github-oidc-proof-trust.json` with exactly:

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

- [ ] **Step 2: Run focused tests**

```bash
node --test tests/aws-oidc-runtime-proof.test.cjs
```

Expected: trust-policy test passes; workflow-related tests remain RED until Task 3.

- [ ] **Step 3: Commit canonical trust**

```bash
git add infra/aws/iam/github-oidc-proof-trust.json
git commit -m "sec(aws): add exact OIDC proof role trust contract"
```

### Task 3: Refactor OIDC workflow into the zero-permission Identity Plane

**Files:**
- Modify: `.github/workflows/aws-oidc-runtime-proof.yml`
- Test: `tests/aws-oidc-runtime-proof.test.cjs`

**Interfaces:**
- Consumes: IAM role ARN `arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-OIDCProof` bootstrapped from Task 2 trust JSON.
- Produces: automatic and manually dispatchable identity-only proof with no Production Environment dependency.

- [ ] **Step 1: Replace trigger and concurrency**

Use:

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch: {}

permissions:
  contents: read

concurrency:
  group: aws-oidc-identity-proof-${{ github.sha }}
  cancel-in-progress: true
```

- [ ] **Step 2: Remove the Environment and retain minimal job permissions**

The job header must be:

```yaml
jobs:
  prove_identity:
    name: Prove GitHub OIDC to AWS STS identity
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read
      id-token: write
```

There must be no `environment:` key in this workflow.

- [ ] **Step 3: Assume only the new proof role**

Keep the immutable action pin and configure:

```yaml
      - name: Assume zero-permission AWS identity-proof role
        uses: aws-actions/configure-aws-credentials@e6de054238d6b7531b4efff3b6587d9aade6a06c # v6.2.3
        with:
          role-to-assume: arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-OIDCProof
          aws-region: us-east-1
          audience: sts.amazonaws.com
          allowed-account-ids: '211579682376'
          role-duration-seconds: 900
          role-session-name: TIGER-VVIP-OIDCProof-${{ github.run_id }}
          unset-current-credentials: true
          mask-aws-account-id: true
          action-timeout-s: 90
```

- [ ] **Step 4: Assert exact AWS identity and new PASS marker**

Use exactly one AWS CLI operation:

```yaml
      - name: Fail closed unless AWS caller identity is exact
        shell: bash
        run: |
          set -Eeuo pipefail
          read -r account arn < <(aws sts get-caller-identity --query '[Account,Arn]' --output text --no-cli-pager)
          test "$account" = "211579682376"
          case "$arn" in
            arn:aws:sts::211579682376:assumed-role/TIGER-VVIP-GitHub-OIDCProof/*) ;;
            *) echo "UNEXPECTED_AWS_CALLER_ARN" >&2; exit 1 ;;
          esac
          echo "AWS_OIDC_IDENTITY_PROOF=PASS"
```

- [ ] **Step 5: Run focused GREEN test**

```bash
node --test tests/aws-oidc-runtime-proof.test.cjs
```

Expected: all focused tests PASS.

- [ ] **Step 6: Commit workflow refactor**

```bash
git add .github/workflows/aws-oidc-runtime-proof.yml tests/aws-oidc-runtime-proof.test.cjs
git commit -m "ci(aws): separate zero-permission OIDC identity proof"
```

### Task 4: Align documentation and verify no accidental Production-plane changes

**Files:**
- Modify: `docs/superpowers/specs/2026-08-17-aws-oidc-runtime-proof-design.md`
- Keep: `docs/superpowers/specs/2026-08-17-aws-identity-release-plane-design.md`
- Keep: `.github/workflows/production-release-artifact.yml` unchanged

**Interfaces:**
- Consumes: final workflow/trust behavior from Tasks 2–3.
- Produces: documentation with no stale statement that identity proof requires `production-build` or ProductionDeploy role.

- [ ] **Step 1: Mark the old OIDC runtime-proof design superseded**

At the top of `docs/superpowers/specs/2026-08-17-aws-oidc-runtime-proof-design.md`, add a short supersession notice pointing to `docs/superpowers/specs/2026-08-17-aws-identity-release-plane-design.md` and state that the old Environment-coupled runtime model must not be used for new implementation.

- [ ] **Step 2: Verify Production release artifact workflow is byte-for-byte unchanged on this branch**

```bash
git diff main -- .github/workflows/production-release-artifact.yml
```

Expected: no output.

- [ ] **Step 3: Commit documentation alignment**

```bash
git add docs/superpowers/specs/2026-08-17-aws-oidc-runtime-proof-design.md
git commit -m "docs(aws): supersede environment-coupled OIDC proof design"
```

### Task 5: Run exact-head repository verification before AWS bootstrap

**Files:**
- No intended source changes.

**Interfaces:**
- Consumes: exact final branch head from Tasks 1–4.
- Produces: evidence that static contracts and repository gates are green before asking AWS to trust the new role.

- [ ] **Step 1: Run focused identity-plane contract**

```bash
node --test tests/aws-oidc-runtime-proof.test.cjs
```

Expected: PASS.

- [ ] **Step 2: Run VVIP quality gate**

```bash
bash scripts/quality-gate.sh
```

Expected: exit 0.

- [ ] **Step 3: Verify exact diff boundary**

```bash
git diff --name-only main...HEAD
```

Expected files are limited to:

```text
.github/workflows/aws-oidc-runtime-proof.yml
docs/superpowers/plans/2026-08-17-aws-identity-release-plane.md
docs/superpowers/specs/2026-08-17-aws-identity-release-plane-design.md
docs/superpowers/specs/2026-08-17-aws-oidc-runtime-proof-design.md
infra/aws/iam/github-oidc-proof-trust.json
tests/aws-oidc-runtime-proof.test.cjs
```

- [ ] **Step 4: Record exact final head SHA and compare against `main`**

```bash
git rev-parse HEAD
git rev-list --left-right --count main...HEAD
```

Expected: branch ahead only; no unexpected divergence.

### Task 6: One-time AWS bootstrap gate for the zero-permission proof role

**Files:**
- Source of truth: `infra/aws/iam/github-oidc-proof-trust.json`

**Interfaces:**
- Consumes: reviewed exact trust JSON from Task 2 and final branch SHA from Task 5.
- Produces: AWS IAM role `TIGER-VVIP-GitHub-OIDCProof` with the exact trust and zero AWS permission policies.

- [ ] **Step 1: Create role through authenticated AWS administration/SSO**

Create role name exactly:

```text
TIGER-VVIP-GitHub-OIDCProof
```

Use `infra/aws/iam/github-oidc-proof-trust.json` as the trust policy. Do not attach any managed policy and do not add any inline policy.

- [ ] **Step 2: Verify role state before PR merge**

Required evidence:

```text
ARN = arn:aws:iam::211579682376:role/TIGER-VVIP-GitHub-OIDCProof
Attached permission policies = 0
Inline permission policies = 0
Trust Action = sts:AssumeRoleWithWebIdentity
Trust Condition = exact StringEquals claims from repository JSON
No wildcard = true
```

If any item differs, stop and correct AWS state before merge. Never compensate by weakening repository tests.

### Task 7: Protected PR, review, merge, and automatic runtime proof

**Files:**
- No new implementation files expected.

**Interfaces:**
- Consumes: verified branch plus exact AWS role state.
- Produces: protected merge to `main` followed automatically by zero-permission OIDC proof on the merged SHA.

- [ ] **Step 1: Open PR into `main` with exact security boundary**

PR must state: new proof role has zero AWS resource permissions; `production-build` and ProductionDeploy are unchanged; no deployment is authorized.

- [ ] **Step 2: Require all repository checks and independent review**

No ruleset bypass and no Environment bypass.

- [ ] **Step 3: Merge only after AWS bootstrap evidence and checks are green**

Protected merge only.

- [ ] **Step 4: Verify automatic `push` run on exact merged `main` SHA**

Success requires workflow log marker:

```text
AWS_OIDC_IDENTITY_PROOF=PASS
```

and caller ARN prefix:

```text
arn:aws:sts::211579682376:assumed-role/TIGER-VVIP-GitHub-OIDCProof/
```

- [ ] **Step 5: Preserve evidence and retire obsolete waiting runs**

Cancel only obsolete old Environment-coupled identity-proof runs. Do not alter `production-build` controls.
