'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW_PATH = path.join(ROOT, '.github/workflows/media-finalizer-deploy.yml');
const PROBE_PATH = path.join(ROOT, 'scripts/security/media-finalizer-runtime-probes.mjs');
const MASTER_SPEC = 'docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md';

function readRequired(filePath) {
  assert.equal(fs.existsSync(filePath), true, `REQUIRED_FILE_MISSING:${path.relative(ROOT, filePath)}`);
  return fs.readFileSync(filePath, 'utf8').replace(/\r/g, '');
}

test('deployment probe authority remains while the superseded live deploy workflow is quarantined', () => {
  readRequired(PROBE_PATH);
  const workflow = readRequired(WORKFLOW_PATH);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /SOVEREIGN_CONSTELLATION_SUPERSEDED/);
  assert.match(workflow, new RegExp(MASTER_SPEC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(workflow, /exit\s+1/);
  assert.doesNotMatch(workflow, /id-token:\s*write|configure-aws-credentials/i);
  assert.doesNotMatch(workflow, /aws\s+cloudformation|aws\s+lambda\s+update-alias|AdditionalVersionWeights/i);
  assert.doesNotMatch(workflow, /infra\/media-finalizer\/template\.yaml/);
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
