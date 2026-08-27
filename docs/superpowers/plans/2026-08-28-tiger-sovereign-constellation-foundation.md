# TIGER Sovereign Constellation Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the superseded single-stack Media Finalizer infrastructure authority with fail-closed, independently testable build-foundation, Seoul regional-runtime, and global-edge CloudFormation authorities, while quarantining the old live-mutating workflows until their Sovereign Constellation replacements exist.

**Architecture:** The first active Media Data Cell is Seoul (`ap-northeast-2`). The media build foundation owns the immutable KMS-encrypted ECR repository and least-privilege GitHub OIDC build role. The Seoul runtime owns Lambda, Function URL, runtime IAM, DLQ, logs, alarms, and the regional CloudFront invocation binding; the global edge stack in `us-east-1` owns ACM viewer TLS, CloudFront, OAC, WAF, and edge-only policies. Cross-region linkage is explicit through stack parameters/outputs; no CloudFormation stack owns a resource in another authority.

**Tech Stack:** AWS CloudFormation YAML, CloudFormation Guard 3.2.0, cfn-lint 1.55.1, GitHub Actions OIDC, Node.js 24 / `node:test` repository contract tests.

**Spec:** `docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md`

## Global Constraints

- First active Production Media runtime region: `ap-northeast-2`.
- Command/Security Anchor: `eu-central-1`; it is not on the current media hot path.
- `us-east-1` is edge-control only for CloudFront-scoped WAF, ACM viewer certificate, and explicitly required global-edge resources.
- CloudFront is the only public Production ingress; direct Lambda Function URL bypass must fail.
- Function URL auth is `AWS_IAM`; CloudFront OAC uses SigV4 `always` signing.
- ECR is private, immutable, deployed by OCI digest, and encrypted by customer-managed KMS authority.
- GitHub-to-AWS uses OIDC only; no AWS access key/secret key is stored in GitHub.
- Build, regional deploy, and edge deploy authorities are separate.
- The existing `TIGER-VVIP-GitHub-ProductionDeploy` role is not modified by this plan.
- No fabricated first-release stable version or weighted canary is permitted; first release uses Dark Bootstrap.
- No direct mutation of protected `main`; all implementation remains on the feature branch and must pass exact-head review gates before merge.
- No Production-ready claim is permitted from repository rehearsal evidence alone.

---

### Task 1: Seal the infrastructure authority split as RED repository contracts

**Files:**
- Create: `tests/tiger-sovereign-constellation-infrastructure.test.cjs`
- Read: `infra/media-finalizer/template.yaml`
- Read: `.github/workflows/media-finalizer-build.yml`
- Read: `.github/workflows/media-finalizer-deploy.yml`

**Interfaces:**
- Consumes: Master Spec region and ownership rules.
- Produces: Exact file/path/resource contracts used by Tasks 2–6.

- [ ] **Step 1: Write the failing contract test**

Create a `node:test` file that requires these new authorities:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const files = {
  foundation: 'infra/media-finalizer/foundation/template.yaml',
  foundationGuard: 'infra/media-finalizer/foundation/guard.guard',
  regional: 'infra/media-finalizer/regional/template.yaml',
  regionalGuard: 'infra/media-finalizer/regional/guard.guard',
  edge: 'infra/media-finalizer/edge/template.yaml',
  edgeGuard: 'infra/media-finalizer/edge/guard.guard',
};
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r/g, '');

test('Sovereign Constellation infrastructure authorities are physically split', () => {
  for (const relative of Object.values(files)) {
    assert.equal(fs.existsSync(path.join(ROOT, relative)), true, `MISSING_AUTHORITY:${relative}`);
  }
});

test('Seoul foundation owns ECR/KMS/build OIDC authority only', () => {
  const yaml = read(files.foundation);
  assert.match(yaml, /AWS::KMS::Key/);
  assert.match(yaml, /AWS::ECR::Repository/);
  assert.match(yaml, /EncryptionType:\s*KMS/);
  assert.match(yaml, /ImageTagMutability:\s*IMMUTABLE/);
  assert.match(yaml, /TIGER-VVIP-GitHub-MediaBuild/);
  assert.match(yaml, /token\.actions\.githubusercontent\.com/);
  assert.match(yaml, /repository_owner_id/);
  assert.match(yaml, /repository_id/);
  assert.match(yaml, /environment/);
  assert.match(yaml, /media-build/);
  assert.doesNotMatch(yaml, /AWS::Lambda::Function/);
  assert.doesNotMatch(yaml, /AWS::CloudFront::Distribution/);
  assert.doesNotMatch(yaml, /AWS::WAFv2::WebACL/);
});

test('Seoul regional runtime excludes edge and ECR ownership', () => {
  const yaml = read(files.regional);
  assert.match(yaml, /AWS::Lambda::Function/);
  assert.match(yaml, /AWS::Lambda::Url/);
  assert.match(yaml, /AuthType:\s*AWS_IAM/);
  assert.match(yaml, /AWS::SQS::Queue/);
  assert.match(yaml, /AWS::CloudWatch::Alarm/);
  assert.match(yaml, /CloudFrontDistributionArn/);
  assert.doesNotMatch(yaml, /AWS::ECR::Repository/);
  assert.doesNotMatch(yaml, /AWS::CloudFront::Distribution/);
  assert.doesNotMatch(yaml, /AWS::WAFv2::WebACL/);
  assert.doesNotMatch(yaml, /AWS::CertificateManager::Certificate/);
});

test('global edge owns custom TLS, CloudFront, OAC and CLOUDFRONT WAF only', () => {
  const yaml = read(files.edge);
  assert.match(yaml, /AWS::CertificateManager::Certificate/);
  assert.match(yaml, /AWS::CloudFront::Distribution/);
  assert.match(yaml, /AWS::CloudFront::OriginAccessControl/);
  assert.match(yaml, /AWS::WAFv2::WebACL/);
  assert.match(yaml, /Scope:\s*CLOUDFRONT/);
  assert.match(yaml, /HttpVersion:\s*http2and3/);
  assert.match(yaml, /IPV6Enabled:\s*true/);
  assert.match(yaml, /PriceClass:\s*PriceClass_All/);
  assert.match(yaml, /TLSv1\.2_2025/);
  assert.doesNotMatch(yaml, /CloudFrontDefaultCertificate:\s*true/);
  assert.doesNotMatch(yaml, /AWS::Lambda::Function/);
  assert.doesNotMatch(yaml, /AWS::ECR::Repository/);
});
```

- [ ] **Step 2: Run the new test and prove RED**

Run:

```bash
node --test tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: FAIL with one or more `MISSING_AUTHORITY:` assertions because the split templates do not exist yet.

- [ ] **Step 3: Commit only the RED contract**

```bash
git add tests/tiger-sovereign-constellation-infrastructure.test.cjs
git commit -m "test: seal Sovereign Constellation infrastructure split"
```

---

### Task 2: Create the Seoul media build foundation authority

**Files:**
- Create: `infra/media-finalizer/foundation/template.yaml`
- Create: `infra/media-finalizer/foundation/guard.guard`
- Modify: `tests/tiger-sovereign-constellation-infrastructure.test.cjs`

**Interfaces:**
- Consumes: Existing GitHub OIDC provider ARN as a parameter; repository owner ID `294954557`; repository ID `1273805565`; branch `refs/heads/main`; protected GitHub environment `media-build`.
- Produces: `RepositoryName`, `RepositoryArn`, `RepositoryUri`, `RepositoryKmsKeyArn`, and `MediaBuildRoleArn` outputs for Sealed Build configuration.

- [ ] **Step 1: Extend the RED test with least-privilege foundation assertions**

Add assertions that the foundation template:

```js
assert.match(yaml, /DeletionPolicy:\s*Retain/);
assert.match(yaml, /UpdateReplacePolicy:\s*Retain/);
assert.match(yaml, /kms:GenerateDataKey/);
assert.match(yaml, /kms:Decrypt/);
assert.match(yaml, /ecr:GetAuthorizationToken/);
for (const action of [
  'ecr:BatchCheckLayerAvailability',
  'ecr:GetDownloadUrlForLayer',
  'ecr:BatchGetImage',
  'ecr:InitiateLayerUpload',
  'ecr:UploadLayerPart',
  'ecr:CompleteLayerUpload',
  'ecr:PutImage',
  'ecr:DescribeImages',
  'ecr:DescribeImageScanFindings',
  'ecr:DescribeRepositories',
]) assert.match(yaml, new RegExp(action.replace(':', '\\:')));
assert.doesNotMatch(yaml, /Action:\s*['"]?\*['"]?/);
assert.doesNotMatch(yaml, /AdministratorAccess/);
assert.doesNotMatch(yaml, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY/);
```

- [ ] **Step 2: Run and prove the foundation contract is RED**

```bash
node --test tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: FAIL because `foundation/template.yaml` and `foundation/guard.guard` are absent.

- [ ] **Step 3: Implement the minimal foundation template**

The template must:

1. Accept the existing GitHub OIDC provider ARN instead of creating/replacing it.
2. Create a customer-managed KMS key/alias scoped for the Media ECR repository.
3. Create `tiger-media-finalizer` as a retained private ECR repository with `ImageTagMutability: IMMUTABLE`, scan-on-push, KMS encryption, and bounded lifecycle retention.
4. Create `TIGER-VVIP-GitHub-MediaBuild` with exact OIDC trust conditions for `aud`, `repository_owner_id=294954557`, `repository_id=1273805565`, `environment=media-build`, `ref=refs/heads/main`, and exact `sub`.
5. Grant `ecr:GetAuthorizationToken` only on `*`; grant repository actions only on the exact created repository ARN; grant only KMS use needed by ECR/build interaction.
6. Export only non-secret identifiers.

- [ ] **Step 4: Implement independent Guard policy**

`foundation/guard.guard` must independently require:

```guard
let repositories = Resources.*[ Type == 'AWS::ECR::Repository' ]
let keys = Resources.*[ Type == 'AWS::KMS::Key' ]
let roles = Resources.*[ Type == 'AWS::IAM::Role' ]

rule foundation_has_one_ecr_kms_and_build_role {
    %repositories !empty
    %keys !empty
    %roles !empty
}

rule ecr_is_immutable_kms_encrypted when %repositories !empty {
    %repositories {
        Properties.ImageTagMutability == 'IMMUTABLE'
        Properties.ImageScanningConfiguration.ScanOnPush == true
        Properties.EncryptionConfiguration.EncryptionType == 'KMS'
        Properties.EncryptionConfiguration.KmsKey exists
    }
}
```

Also assert the role trust is federated GitHub OIDC and no wildcard administrative action exists.

- [ ] **Step 5: Run contract test**

```bash
node --test tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: Foundation assertions PASS; regional/edge assertions remain RED.

- [ ] **Step 6: Commit**

```bash
git add infra/media-finalizer/foundation tests/tiger-sovereign-constellation-infrastructure.test.cjs
git commit -m "feat: add Seoul media build foundation authority"
```

---

### Task 3: Create the Seoul regional runtime authority with explicit edge binding

**Files:**
- Create: `infra/media-finalizer/regional/template.yaml`
- Create: `infra/media-finalizer/regional/guard.guard`
- Modify: `tests/tiger-sovereign-constellation-infrastructure.test.cjs`

**Interfaces:**
- Consumes: immutable `ImageUri` by digest, `ReleaseSha`, Secrets Manager ARN, Clerk configuration, allowed browser origins, and optional `CloudFrontDistributionArn` after edge creation.
- Produces: Lambda ARN, published version, live alias ARN/version, Function URL origin hostname, named alarm identifiers.

- [ ] **Step 1: Extend RED tests for regional ownership and Dark Bootstrap semantics**

Add:

```js
assert.match(yaml, /ImageUri/);
assert.match(yaml, /sha256:\[0-9a-f\]\{64\}/);
assert.match(yaml, /MemorySize:\s*2048/);
assert.match(yaml, /Timeout:\s*30/);
assert.match(yaml, /ReservedConcurrentExecutions:\s*8/);
assert.match(yaml, /AWS::Lambda::Version/);
assert.match(yaml, /AWS::Lambda::Alias/);
assert.match(yaml, /Name:\s*live/);
assert.match(yaml, /CloudFrontDistributionArn/);
assert.match(yaml, /AWS::Lambda::Permission/);
assert.match(yaml, /Principal:\s*cloudfront\.amazonaws\.com/);
assert.match(yaml, /FunctionUrlAuthType:\s*AWS_IAM/);
assert.match(yaml, /InvokedViaFunctionUrl:\s*true/);
assert.doesNotMatch(yaml, /AdditionalVersionWeights/);
assert.doesNotMatch(yaml, /Principal:\s*['"]?\*['"]?/);
```

- [ ] **Step 2: Run and prove RED**

```bash
node --test tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: regional authority missing.

- [ ] **Step 3: Implement the minimal regional template**

Move/adapt only regional resources from the historical template:

- retained explicit log group;
- least-privilege Lambda runtime role;
- encrypted retained SQS DLQ;
- image Lambda using exact `ImageUri` digest;
- published immutable Lambda version;
- `live` alias with first-release behavior that points to the newly published version when there is no legitimate previous stable version;
- Function URL with `AuthType: AWS_IAM` and POST-only Function URL CORS;
- named error/throttle alarms;
- two CloudFront Lambda permissions created only when `CloudFrontDistributionArn` is non-empty.

Do not create ECR, CloudFront, WAF, OAC, ACM, or viewer policies in this stack.

- [ ] **Step 4: Implement independent regional Guard policy**

Require Lambda image runtime, 2048 MB, 30s timeout, reserved concurrency 8, IAM-only Function URL, encrypted DLQ, bounded secret read, logs retention, alarms, and CloudFront-only permissions when present. Explicitly reject public `Principal: '*'` Lambda permission.

- [ ] **Step 5: Run contract test**

```bash
node --test tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: foundation + regional PASS; edge remains RED.

- [ ] **Step 6: Commit**

```bash
git add infra/media-finalizer/regional tests/tiger-sovereign-constellation-infrastructure.test.cjs
git commit -m "feat: add Seoul media regional runtime authority"
```

---

### Task 4: Create the us-east-1 Global Edge authority

**Files:**
- Create: `infra/media-finalizer/edge/template.yaml`
- Create: `infra/media-finalizer/edge/guard.guard`
- Modify: `tests/tiger-sovereign-constellation-infrastructure.test.cjs`

**Interfaces:**
- Consumes: custom production hostname, Route53 hosted-zone authority if DNS validation is managed here, regional Function URL origin hostname, WAF rate limit.
- Produces: ACM certificate ARN, CloudFront Distribution ID/ARN/domain, WAF WebACL ARN.

- [ ] **Step 1: Extend RED tests for Global Orbit properties**

Add:

```js
assert.match(yaml, /ViewerProtocolPolicy:\s*https-only/);
assert.match(yaml, /OriginAccessControlOriginType:\s*lambda/);
assert.match(yaml, /SigningBehavior:\s*always/);
assert.match(yaml, /SigningProtocol:\s*sigv4/);
assert.match(yaml, /AWSManagedRulesCommonRuleSet/);
assert.match(yaml, /AWSManagedRulesKnownBadInputsRuleSet/);
assert.match(yaml, /AWSManagedRulesAmazonIpReputationList/);
assert.match(yaml, /RateBasedStatement/);
assert.match(yaml, /DefaultTTL:\s*0/);
assert.match(yaml, /MaxTTL:\s*0/);
assert.match(yaml, /MinTTL:\s*0/);
```

- [ ] **Step 2: Run and prove RED**

```bash
node --test tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: edge authority missing.

- [ ] **Step 3: Implement the Global Edge template**

Create only edge resources:

- ACM viewer certificate for the explicit TIGER production hostname (deployed only in `us-east-1` by workflow contract);
- CloudFront OAC for Lambda Function URL with SigV4 `always`;
- zero-TTL cache policy;
- explicit origin request policy for the finalizer request contract;
- security response headers policy;
- WAFv2 `Scope: CLOUDFRONT` with method allow contract, bounded body/content-type protection where compatible, Common, Known Bad Inputs, Amazon IP Reputation, and rate-based rules;
- CloudFront distribution with custom alias/certificate, `TLSv1.2_2025`, SNI-only, HTTP/2 + HTTP/3, IPv6, HTTPS-only, `PriceClass_All`, and no caching for the authenticated finalizer path.

Do not create Lambda, Lambda permissions, ECR, Secrets Manager values, or regional runtime resources.

- [ ] **Step 4: Implement independent edge Guard policy**

Require custom viewer certificate authority, `PriceClass_All`, `http2and3`, IPv6, WAF CLOUDFRONT scope, OAC SigV4 always, zero TTL, managed rules, and rate limiting. Reject `CloudFrontDefaultCertificate: true`.

- [ ] **Step 5: Run contract test to GREEN for split resources**

```bash
node --test tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add infra/media-finalizer/edge tests/tiger-sovereign-constellation-infrastructure.test.cjs
git commit -m "feat: add TIGER Global Edge authority"
```

---

### Task 5: Rehearse all split templates independently before any AWS mutation

**Files:**
- Modify: `.github/workflows/media-finalizer-infra-rehearsal.yml`
- Modify: `tests/media-finalizer-infrastructure.test.cjs`
- Modify: `tests/tiger-sovereign-constellation-infrastructure.test.cjs`

**Interfaces:**
- Consumes: the three template/Guard pairs from Tasks 2–4.
- Produces: repository-level proof that all three authorities are linted and Guard-validated independently.

- [ ] **Step 1: Write failing workflow-order assertions**

Update tests to require exact commands for all authorities:

```js
for (const authority of ['foundation', 'regional', 'edge']) {
  assert.match(workflow, new RegExp(`cfn-lint\\s+infra/media-finalizer/${authority}/template\\.yaml`));
  assert.match(workflow, new RegExp(`cfn-guard\\s+validate[\\s\\S]*infra/media-finalizer/${authority}/template\\.yaml[\\s\\S]*infra/media-finalizer/${authority}/guard\\.guard`));
}
```

Also require the workflow to use cfn-lint `1.55.1` and Guard `3.2.0` with the already-approved archive hash.

- [ ] **Step 2: Run and prove RED**

```bash
node --test tests/media-finalizer-infrastructure.test.cjs tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: FAIL because the current rehearsal validates the historical combined template.

- [ ] **Step 3: Update rehearsal workflow**

Keep immutable action pins. Install `cfn-lint==1.55.1`, verify the Guard 3.2.0 archive SHA256 `c78f7a1a6c2674f7edbf0ebdc0590126487a14b103e434aea31205a4d1034d21`, then lint and Guard-validate `foundation`, `regional`, and `edge` independently. No AWS credentials or mutation are permitted in rehearsal.

- [ ] **Step 4: Refactor the legacy infrastructure test**

Remove assertions that demand ECR + Lambda + CloudFront + WAF in one file. Replace them with per-authority assertions or delegate to the new Sovereign Constellation test. Preserve the existing security invariants (digest-only image, IAM-only URL, explicit headers, managed WAF, log retention, no secret bytes, no public Lambda permission).

- [ ] **Step 5: Run tests**

```bash
node --test tests/media-finalizer-infrastructure.test.cjs tests/tiger-sovereign-constellation-infrastructure.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/media-finalizer-infra-rehearsal.yml tests/media-finalizer-infrastructure.test.cjs tests/tiger-sovereign-constellation-infrastructure.test.cjs
git commit -m "ci: rehearse split Sovereign Constellation infrastructure"
```

---

### Task 6: Quarantine superseded live-mutating build/deploy workflows fail-closed

**Files:**
- Modify: `.github/workflows/media-finalizer-build.yml`
- Modify: `.github/workflows/media-finalizer-deploy.yml`
- Create: `tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs`

**Interfaces:**
- Consumes: Master Spec rule forbidding silent fallback to old `us-east-1` runtime/single-stack deployment.
- Produces: a hard repository safety barrier until replacement Sealed Build, Seoul Dark Bootstrap deploy, and Global Edge deploy workflows are implemented in later plans.

- [ ] **Step 1: Write failing quarantine tests**

Require both historical workflows to contain:

```js
assert.match(workflow, /SOVEREIGN_CONSTELLATION_SUPERSEDED/);
assert.match(workflow, /exit\s+1/);
assert.doesNotMatch(workflow, /aws\s+cloudformation\s+(?:create-change-set|execute-change-set)/);
assert.doesNotMatch(workflow, /docker\s+(?:build|push)/);
```

The test must also assert that the deploy workflow no longer references `infra/media-finalizer/template.yaml` as a Production authority.

- [ ] **Step 2: Run and prove RED**

```bash
node --test tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs
```

Expected: FAIL because the old live-mutating paths still exist.

- [ ] **Step 3: Replace each historical workflow body with an explicit fail-closed quarantine workflow**

Preserve its recognizable workflow name plus a `SUPERSEDED` suffix. A manual dispatch may exist only to emit a clear failure message and exit non-zero; it must have no AWS OIDC permission and no mutation commands. Include the authoritative replacement spec path in the failure message.

Example job step:

```yaml
- name: SOVEREIGN_CONSTELLATION_SUPERSEDED
  shell: bash
  run: |
    echo "This workflow is superseded by docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md"
    exit 1
```

- [ ] **Step 4: Run quarantine test**

```bash
node --test tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Run affected legacy tests and update only assumptions made obsolete by the approved architecture**

```bash
node --test tests/media-finalizer-deployment-workflow.test.cjs tests/media-finalizer-release-evidence.test.cjs tests/media-finalizer-infrastructure.test.cjs tests/tiger-sovereign-constellation-*.test.cjs
```

Expected: any old test that insists the superseded live deploy workflow still performs canary/update mutation should be rewritten to validate the quarantine and deferred replacement contract, not weakened security behavior.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/media-finalizer-build.yml .github/workflows/media-finalizer-deploy.yml tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs tests/media-finalizer-deployment-workflow.test.cjs tests/media-finalizer-release-evidence.test.cjs
git commit -m "security: quarantine superseded media release authorities"
```

---

### Task 7: Exact-head repository verification for Foundation Phase

**Files:**
- Read: all files changed in Tasks 1–6.

**Interfaces:**
- Consumes: completed Foundation Phase implementation.
- Produces: exact feature-branch evidence suitable for review; it does not produce Production runtime evidence.

- [ ] **Step 1: Run focused Node tests**

```bash
node --test \
  tests/media-finalizer-infrastructure.test.cjs \
  tests/media-finalizer-deployment-workflow.test.cjs \
  tests/media-finalizer-release-evidence.test.cjs \
  tests/tiger-sovereign-constellation-infrastructure.test.cjs \
  tests/tiger-sovereign-constellation-workflow-quarantine.test.cjs
```

Expected: PASS.

- [ ] **Step 2: Run cfn-lint locally for every split template**

```bash
cfn-lint infra/media-finalizer/foundation/template.yaml
cfn-lint infra/media-finalizer/regional/template.yaml
cfn-lint infra/media-finalizer/edge/template.yaml
```

Expected: zero errors.

- [ ] **Step 3: Run Guard 3.2.0 locally for every split authority**

```bash
cfn-guard validate --data infra/media-finalizer/foundation/template.yaml --rules infra/media-finalizer/foundation/guard.guard
cfn-guard validate --data infra/media-finalizer/regional/template.yaml --rules infra/media-finalizer/regional/guard.guard
cfn-guard validate --data infra/media-finalizer/edge/template.yaml --rules infra/media-finalizer/edge/guard.guard
```

Expected: PASS for all three.

- [ ] **Step 4: Run repository security gates that are available without AWS mutation**

Run the repository's existing CleanGuard, Zero-Residue/full-history, Dependency Review-compatible local checks, and Node security suite as defined by the repo. Do not substitute skipped checks with a GREEN claim.

- [ ] **Step 5: Compare exact branch head with protected main and inspect diff**

Confirm only approved Sovereign Constellation files changed and no secret material, AWS key, mutable deployment authority, or fallback path was introduced.

- [ ] **Step 6: Stop before AWS bootstrap**

Do **not** create ECR, KMS, IAM deployment authority, regional runtime, CloudFront, WAF, ACM, or Production endpoint yet. Per the Master Spec, live AWS bootstrap starts only after repository exact-head gates are GREEN and reviewed.

## Plan Self-Review

- Spec coverage in this phase: §5 region authority, §6 edge baseline, §7 WAF baseline, §11 OIDC separation, §12 IAM separation for build authority, §13 infrastructure ownership split, §14 ECR/KMS baseline, §19 runtime bootstrap sizing, §23 first-release no-fake-baseline prerequisite, §29 repository governance, and §32 implementation steps 1–3.
- Deferred deliberately to later plans: real SBOM/Genome/Passport tooling (§15–18, §30), replacement Sealed Build workflow, Supabase live convergence, Dark Bootstrap regional/edge deployment orchestration, adaptive canary after a real baseline, observability/security aggregation, Phoenix DR, and live AWS execution.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation step is permitted.
- Authority check: no task modifies `main` directly or treats rehearsal as Production evidence.
