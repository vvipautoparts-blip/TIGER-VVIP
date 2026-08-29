'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'config/sovereignty/spgf-v1.json');
const validatorPath = path.join(root, 'scripts/sovereignty/verify-spgf-authority.cjs');
const load = () => JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

test('SPGF machine authority is sole zero-default proof-first root', () => {
  assert.equal(fs.existsSync(manifestPath), true);
  const manifest = load();
  assert.equal(manifest.schemaVersion, 'TIGER_SPGF_V1');
  assert.deepEqual(manifest.ownerRoot, {
    id: 'OWNER_ROOT',
    country: null,
    currency: null,
    market: null,
    standingRuntimePrivilege: false
  });
  assert.deepEqual(manifest.defaults, {
    country: null,
    currency: null,
    paymentProvider: null,
    legalEntity: null,
    taxProfile: null,
    dataRegion: null,
    market: null
  });
  assert.equal(manifest.trustModel, 'PROOF_CAPSULE_REQUIRED_FAIL_CLOSED');
  assert.equal(manifest.fallbackPolicy, 'DENY_NO_SOVEREIGN_FALLBACK');
  assert.equal(manifest.technologyMaturityPolicy, 'STABLE_ONLY_FOR_SOVEREIGN_PRODUCTION');
});

test('SPGF validator rejects sovereign defaults and weakened trust', () => {
  const { verifySpgfAuthority } = require(validatorPath);
  const base = load();
  assert.equal(verifySpgfAuthority(base).ok, true);

  const mutations = [
    (x) => { x.ownerRoot.country = 'JO'; },
    (x) => { x.ownerRoot.standingRuntimePrivilege = true; },
    (x) => { x.defaults.currency = 'JOD'; },
    (x) => { x.defaults.dataRegion = 'eu-west-1'; },
    (x) => { x.trustModel = 'CONFIG_IS_TRUTH'; },
    (x) => { x.fallbackPolicy = 'FALLBACK_TO_JO'; },
    (x) => { x.technologyMaturityPolicy = 'ALLOW_PREVIEW_PRODUCTION'; }
  ];

  for (const mutate of mutations) {
    const candidate = structuredClone(base);
    mutate(candidate);
    assert.equal(verifySpgfAuthority(candidate).ok, false);
  }
});
