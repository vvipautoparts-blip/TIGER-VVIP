'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const sourcePath = path.resolve(__dirname, '../scripts/media/f05-decoder-policy.js');
const moduleUrl = pathToFileURL(sourcePath).href;
async function loadPolicy() { return import(`${moduleUrl}?decoder-policy=${Date.now()}-${Math.random()}`); }

function activePolicy(overrides = {}) {
  return Object.freeze({
    decoderPolicyVersion: 'F05_DECODER_POLICY_V1',
    artifactVersion: 'libheif-1.23.1-vvip1',
    artifactSha256: 'a'.repeat(64),
    status: 'ACTIVE',
    notBefore: '2026-08-14T00:00:00.000Z',
    expiresAt: '2026-08-15T00:00:00.000Z',
    minimumAppPolicyVersion: 'F05_BPLUS_V1',
    serverConfirmed: true,
    ...overrides
  });
}

test('F05 decoder policy accepts only a confirmed active exact artifact inside its validity window', async () => {
  const { validateDecoderPolicy } = await loadPolicy();
  const result = validateDecoderPolicy(activePolicy(), Date.parse('2026-08-14T12:00:00Z'), 'a'.repeat(64));
  assert.equal(result.ok, true);
  assert.equal(result.artifactVersion, 'libheif-1.23.1-vvip1');
  assert.equal(result.artifactSha256, 'a'.repeat(64));
  assert.equal(Object.isFrozen(result), true);
});

test('F05 decoder kill switch fails closed for revoked and disabled packs', async () => {
  const { validateDecoderPolicy } = await loadPolicy();
  for (const status of ['REVOKED', 'DISABLED']) {
    assert.deepEqual(
      validateDecoderPolicy(activePolicy({status}), Date.parse('2026-08-14T12:00:00Z'), 'a'.repeat(64)),
      {ok:false, code:'heif_decoder_revoked'}
    );
  }
});

test('F05 decoder policy denies expired not-yet-valid and unconfirmed descriptors', async () => {
  const { validateDecoderPolicy } = await loadPolicy();
  assert.deepEqual(validateDecoderPolicy(activePolicy(), Date.parse('2026-08-16T00:00:00Z'), 'a'.repeat(64)), {ok:false,code:'heif_decoder_policy_expired'});
  assert.deepEqual(validateDecoderPolicy(activePolicy(), Date.parse('2026-08-13T23:59:59Z'), 'a'.repeat(64)), {ok:false,code:'heif_decoder_policy_invalid'});
  assert.deepEqual(validateDecoderPolicy(activePolicy({serverConfirmed:false}), Date.parse('2026-08-14T12:00:00Z'), 'a'.repeat(64)), {ok:false,code:'heif_decoder_policy_invalid'});
});

test('F05 decoder policy binds exact digest and app policy version', async () => {
  const { validateDecoderPolicy } = await loadPolicy();
  assert.deepEqual(validateDecoderPolicy(activePolicy(), Date.parse('2026-08-14T12:00:00Z'), 'b'.repeat(64)), {ok:false,code:'heif_decoder_integrity_failed'});
  assert.deepEqual(validateDecoderPolicy(activePolicy({minimumAppPolicyVersion:'F06'}), Date.parse('2026-08-14T12:00:00Z'), 'a'.repeat(64)), {ok:false,code:'heif_decoder_policy_invalid'});
});

test('F05 decoder policy rejects malformed mutable or unknown authority inputs', async () => {
  const { validateDecoderPolicy } = await loadPolicy();
  const now = Date.parse('2026-08-14T12:00:00Z');
  for (const descriptor of [null, {}, activePolicy({status:'PAUSED'}), activePolicy({artifactSha256:'abc'}), activePolicy({decoderPolicyVersion:'F05_DECODER_POLICY_V2'})]) {
    assert.deepEqual(validateDecoderPolicy(descriptor, now, 'a'.repeat(64)), {ok:false,code:'heif_decoder_policy_invalid'});
  }
});
