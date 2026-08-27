'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW_PATH = path.join(ROOT, '.github/workflows/media-finalizer-deploy.yml');
const PROBE_PATH = path.join(ROOT, 'scripts/security/media-finalizer-runtime-probes.mjs');

function readRequired(filePath) {
  assert.equal(fs.existsSync(filePath), true, `REQUIRED_FILE_MISSING:${path.relative(ROOT, filePath)}`);
  return fs.readFileSync(filePath, 'utf8').replace(/\r/g, '');
}

function indexOfOrFail(text, pattern, label) {
  const match = text.match(pattern);
  assert.ok(match, `MISSING_DEPLOY_CONTRACT:${label}`);
  return match.index;
}

test('Task 10 deployment authorities exist', () => {
  readRequired(WORKFLOW_PATH);
  readRequired(PROBE_PATH);
});

test('deploy workflow is protected, exact-main, digest-only, build-once consuming, and OIDC-only', () => {
  const workflow = readRequired(WORKFLOW_PATH);

  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  for (const input of ['source_sha', 'build_run_id', 'image_digest']) {
    assert.match(workflow, new RegExp(`^      ${input}:`, 'm'), `missing protected input ${input}`);
  }
  assert.match(workflow, /^  contents: read$/m);
  assert.match(workflow, /^  actions: read$/m);
  assert.match(workflow, /^  id-token: write$/m);
  assert.match(workflow, /^    environment: production$/m);
  assert.match(workflow, /git fetch --no-tags origin main/);
  assert.match(workflow, /git rev-parse origin\/main/);
  assert.match(workflow, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(workflow, /\^sha256:\[0-9a-f\]\{64\}\$/);
  assert.match(workflow, /gh run download[^\n]*BUILD_RUN_ID/);
  assert.match(workflow, /release-passport\.json/);
  assert.match(workflow, /gh attestation verify/);
  assert.match(workflow, /attestations[^\n]*verified|verified[^\n]*attestations/i);

  assert.doesNotMatch(workflow, /docker\s+build|docker\s+push|npm\s+(?:i|install)\b/i);
  assert.doesNotMatch(workflow, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN\s*:/);
  assert.doesNotMatch(workflow, /secrets\.AWS_|secretsmanager\s+get-secret-value/i);
  assert.match(workflow, /aws-actions\/configure-aws-credentials@[0-9a-f]{40}/);

  const uses = [...workflow.matchAll(/^\s*-?\s*uses:\s*[^\s@]+@([^\s#]+)$/gm)].map((m) => m[1]);
  assert.ok(uses.length >= 2, 'expected pinned checkout + OIDC actions');
  for (const ref of uses) assert.match(ref, /^[0-9a-f]{40}$/, `action ref must be immutable SHA: ${ref}`);
});

test('deploy workflow validates IaC before a reviewed change set, canaries through CloudFront, and rolls back fail-closed', () => {
  const workflow = readRequired(WORKFLOW_PATH);

  assert.match(workflow, /cfn-lint==1\.55\.1/);
  assert.match(workflow, /cloudformation-guard\/releases\/download\/v3\.2\.0/);
  assert.match(workflow, /c78f7a1a6c2674f7edbf0ebdc0590126487a14b103e434aea31205a4d1034d21/);
  const lint = indexOfOrFail(workflow, /cfn-lint\s+infra\/media-finalizer\/template\.yaml/, 'cfn-lint');
  const guard = indexOfOrFail(workflow, /cfn-guard\s+validate[\s\S]*?media-finalizer\.guard/, 'cfn-guard validate');
  const create = indexOfOrFail(workflow, /aws cloudformation create-change-set/, 'create change set');
  assert.ok(lint < create && guard < create, 'cfn-lint and Guard must run before change-set creation');

  assert.match(workflow, /CFN_SERVICE_ROLE_ARN/);
  assert.match(workflow, /aws iam get-role/);
  assert.match(workflow, /PermissionsBoundary/);
  assert.match(workflow, /--role-arn\s+"\$CFN_SERVICE_ROLE_ARN"/);
  assert.match(workflow, /aws cloudformation wait change-set-create-complete/);
  assert.match(workflow, /aws cloudformation describe-change-set/);
  assert.match(workflow, /aws cloudformation execute-change-set/);
  assert.match(workflow, /aws cloudformation wait stack-update-complete/);
  assert.match(workflow, /ParameterKey=ImageUri/);
  assert.match(workflow, /ParameterKey=StableAliasVersion/);

  const execute = indexOfOrFail(workflow, /aws cloudformation execute-change-set/, 'execute change set');
  const canary = indexOfOrFail(workflow, /aws lambda update-alias[\s\S]*?AdditionalVersionWeights/, 'weighted alias canary');
  const probes = indexOfOrFail(workflow, /node scripts\/security\/media-finalizer-runtime-probes\.mjs/, 'runtime probes');
  const alarms = indexOfOrFail(workflow, /aws cloudwatch describe-alarms/, 'named alarms');
  const promote = indexOfOrFail(workflow, /PROMOTION_CHANGE_SET/, 'promotion change set');
  assert.ok(execute < canary && canary < probes && probes < alarms && alarms < promote, 'candidate -> canary -> probes -> alarms -> promotion order is mandatory');

  assert.match(workflow, /MediaFinalizerUrl/);
  assert.match(workflow, /get-function-url-config/);
  assert.match(workflow, /MediaFinalizerErrorAlarm/);
  assert.match(workflow, /MediaFinalizerThrottleAlarm/);
  assert.match(workflow, /ROLLBACK_CHANGE_SET/);
  assert.match(workflow, /rollback/i);
  assert.doesNotMatch(workflow, /TIGER_MEDIA_FINALIZER_URL\s*=|echo\s+["']?TIGER_MEDIA_FINALIZER_URL|gh\s+variable\s+set\s+TIGER_MEDIA_FINALIZER_URL/i);
});

test('runtime probes cover positive, abuse, replay, origin, and direct Function URL bypass while emitting bounded evidence only', async () => {
  readRequired(PROBE_PATH);
  const moduleUrl = `${pathToFileURL(PROBE_PATH).href}?t=${Date.now()}`;
  const probe = await import(moduleUrl);

  const required = [
    'positive-authenticated',
    'missing-body-hash',
    'bad-body-hash',
    'missing-jwt',
    'bad-jwt',
    'expired-token',
    'wrong-subject',
    'wrong-capability',
    'replay',
    'oversized-body',
    'wrong-method',
    'wrong-content-type',
    'hostile-origin',
    'direct-function-url-bypass',
  ];
  assert.deepEqual(probe.REQUIRED_SCENARIOS, required);
  assert.equal(typeof probe.runMediaFinalizerRuntimeProbes, 'function');

  const secretToken = 'SECRET_FIXTURE_TOKEN_SHOULD_NEVER_APPEAR';
  const fixture = {
    body: JSON.stringify({ mediaId: '11111111-1111-4111-8111-111111111111', finalizationToken: 'a'.repeat(64) }),
    validJwt: secretToken,
    expiredJwt: 'EXPIRED_' + secretToken,
    wrongSubjectJwt: 'WRONG_SUBJECT_' + secretToken,
    wrongCapabilityJwt: 'WRONG_CAP_' + secretToken,
    allowedOrigin: 'https://app.example.test',
  };
  const statuses = [200, 400, 400, 401, 401, 401, 403, 403, 409, 413, 405, 415, 403, 403];
  let call = 0;
  const fakeFetch = async () => {
    const status = statuses[call++];
    return { status, ok: status >= 200 && status < 300 };
  };
  const result = await probe.runMediaFinalizerRuntimeProbes({
    cloudFrontUrl: 'https://edge.example.test',
    functionUrl: 'https://direct.lambda-url.example.test',
    fixture,
    fetchImpl: fakeFetch,
    now: (() => { let n = 1000; return () => (n += 7); })(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.results.length, required.length);
  for (const record of result.results) {
    assert.deepEqual(Object.keys(record).sort(), ['durationMs', 'name', 'ok', 'status'].sort());
    assert.equal(typeof record.status, 'number');
    assert.equal(typeof record.durationMs, 'number');
  }
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(secretToken), false);
  assert.equal(serialized.includes(fixture.body), false);
  assert.equal(serialized.includes('11111111-1111-4111-8111-111111111111'), false);
  assert.equal(call, required.length);
});
