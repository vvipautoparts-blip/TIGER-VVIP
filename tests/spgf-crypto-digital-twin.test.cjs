'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { REQUIRED_SURFACES, harvestSourceCryptoEvidence } = require('../scripts/security/crypto-evidence-harvester.cjs');
const { buildCryptoTwin, detectCryptoDrift } = require('../scripts/security/crypto-digital-twin.cjs');

const root = path.resolve(__dirname, '..');
const identityPath = path.join(root, 'services/media-finalizer/src/identity.js');
const identitySource = fs.readFileSync(identityPath, 'utf8');

test('source harvester extracts current Media Finalizer OIDC/JWT crypto evidence without inventing provider facts', () => {
  const evidence = harvestSourceCryptoEvidence([{
    surface: 'OIDC_JWT',
    path: 'services/media-finalizer/src/identity.js',
    content: identitySource,
    sourceSha: 'a'.repeat(40)
  }], { observedAt: 1000 });
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].surface, 'OIDC_JWT');
  assert.equal(evidence[0].algorithm, 'RS256');
  assert.equal(evidence[0].primitive, 'RSA');
  assert.equal(evidence[0].provider, null);
  assert.equal(evidence[0].keyLocation, null);
  assert.match(evidence[0].evidenceDigest, /^sha256:[0-9a-f]{64}$/);
});

test('crypto twin evidences only observed surfaces and leaves incomplete surfaces pending', () => {
  const evidence = harvestSourceCryptoEvidence([{surface:'OIDC_JWT',path:'services/media-finalizer/src/identity.js',content:identitySource,sourceSha:'a'.repeat(40)}], { observedAt:1000 });
  const twin = buildCryptoTwin(evidence, { generatedAt: 1001 });
  assert.deepEqual(twin.assets.map((x) => x.surface), REQUIRED_SURFACES);
  const oidc = twin.assets.find((x) => x.surface === 'OIDC_JWT');
  const tls = twin.assets.find((x) => x.surface === 'TLS_TRANSPORT');
  assert.equal(oidc.status, 'PARTIALLY_EVIDENCED');
  assert.equal(oidc.algorithm, 'RS256');
  assert.equal(tls.status, 'DISCOVERY_REQUIRED');
  assert.equal(tls.algorithm, null);
  assert.equal(twin.inventoryComplete, false);
  assert.ok(twin.pendingSurfaces.includes('TLS_TRANSPORT'));
  assert.ok(twin.pendingSurfaces.includes('OIDC_JWT'));
});

test('crypto drift is detected when observed algorithm differs from expected evidence', () => {
  const result = detectCryptoDrift(
    {surface:'OIDC_JWT', status:'PARTIALLY_EVIDENCED', algorithm:'RS256', evidenceDigest:'sha256:'+'1'.repeat(64)},
    {surface:'OIDC_JWT', status:'PARTIALLY_EVIDENCED', algorithm:'ES256', evidenceDigest:'sha256:'+'2'.repeat(64)}
  );
  assert.equal(result.drift, true);
  assert.equal(result.code, 'CRYPTO_DRIFT_ALGORITHM');
});

test('unsupported source pattern does not produce false evidence', () => {
  const evidence = harvestSourceCryptoEvidence([{surface:'TLS_TRANSPORT',path:'x.js',content:'const x = true;',sourceSha:'a'.repeat(40)}], {observedAt:1000});
  assert.deepEqual(evidence, []);
});
