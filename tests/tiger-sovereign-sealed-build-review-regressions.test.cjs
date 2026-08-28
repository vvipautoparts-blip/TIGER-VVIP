'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'tiger-media-sovereign-sealed-build.yml');

function readWorkflow() {
  return fs.readFileSync(WORKFLOW, 'utf8').replace(/\r/g, '');
}

test('Release Passport reuses the canonical SBOM digest that passed the supply gate', () => {
  const workflow = readWorkflow();
  assert.doesNotMatch(
    workflow,
    /SBOM_SHA="\$\(sha256sum \/tmp\/tiger-media\/artifacts\/media-cell\/oci-sbom\.cdx\.json/,
    'SBOM identity must not hash newline-terminated artifact bytes independently of the validator',
  );
  assert.match(
    workflow,
    /sbomSha256/,
    'Workflow must propagate the validator/supply-gate authoritative sbomSha256',
  );
});

test('Attestation verification evidence is recursively canonicalized before hashing', () => {
  const workflow = readWorkflow();
  assert.doesNotMatch(
    workflow,
    /JSON\.stringify\(value, Object\.keys\(value\)\.sort\(\)\)/,
    'Top-level JSON replacer collapses nested verification objects',
  );
  assert.match(
    workflow,
    /canonicalJson|canonicalize/,
    'Attestation evidence must use recursive canonicalization',
  );
});

test('Immutable ECR image publishing is retry-safe without weakening immutable tags', () => {
  const workflow = readWorkflow();
  const buildPushStart = workflow.indexOf('- name: Build once and push once');
  assert.notEqual(buildPushStart, -1, 'BUILD_PUSH_STEP_MISSING');
  const buildPushEnd = workflow.indexOf('\n      - name:', buildPushStart + 1);
  const step = workflow.slice(buildPushStart, buildPushEnd === -1 ? undefined : buildPushEnd);
  const uniqueAttemptTag = /IMAGE_TAG=.*GITHUB_RUN_ID.*GITHUB_RUN_ATTEMPT|IMAGE_TAG=.*GITHUB_RUN_ATTEMPT.*GITHUB_RUN_ID/s.test(step);
  const validatedExistingDigest = /describe-images/.test(step) && /existing|EXISTING|already|ALREADY/.test(step);
  assert.equal(
    uniqueAttemptTag || validatedExistingDigest,
    true,
    'Immutable publishing must use a unique per-attempt tag or safely validate/reuse an existing digest',
  );
  assert.match(step, /MANIFEST_DIGEST/, 'Publishing must resolve the immutable manifest digest');
});

test('Enhanced continuous scanning accepts ACTIVE only with completed-findings evidence', () => {
  const workflow = readWorkflow();
  assert.match(workflow, /ACTIVE/, 'CONTINUOUS_SCAN can report ACTIVE and must be handled explicitly');
  assert.match(
    workflow,
    /imageScanCompletedAt/,
    'ACTIVE must be accepted only after evidence of at least one completed scan exists',
  );
  assert.doesNotMatch(
    workflow,
    /status:\s*'COMPLETE'/,
    'Normalized evidence must not falsely rewrite ACTIVE to COMPLETE',
  );
});

test('Scan evidence hash binds the image subject and stable finding identities, not severity counters alone', () => {
  const workflow = readWorkflow();
  assert.match(
    workflow,
    /enhancedFindings|findings\s*\|\|\s*\[\]/,
    'Evidence projection must include actual scanner findings',
  );
  assert.match(
    workflow,
    /findingArn|vulnerabilityId|\bname\b/,
    'Evidence projection must include stable finding identifiers',
  );
  assert.match(
    workflow,
    /MANIFEST_DIGEST|manifestDigest/,
    'Evidence projection must bind findings to the exact OCI image subject',
  );
  assert.doesNotMatch(
    workflow,
    /createHash\('sha256'\)\.update\(canonical\).*canonicalCounts/s,
    'findingsSha256 must not be derived only from aggregate severity counters',
  );
});
