'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'config/fusion/current-authority.json');
const validatorPath = path.join(root, 'scripts/fusion/verify-current-authority.cjs');

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function verify(manifest) {
  return require(validatorPath).verifyCurrentAuthority(manifest);
}

test('marketplace role is connection-only with zero transaction intermediation', () => {
  const boundary = loadManifest().ownerMarketplaceBoundary;

  assert.equal(boundary.marketplaceIntermediationRole, 'NONE');
  assert.equal(boundary.platformOnlyReducesDistance, true);
  assert.equal(boundary.transactionPartiesInteractDirectly, true);
  assert.equal(boundary.platformHasNoMarketplaceTransactionAuthority, true);
  assert.equal(boundary.platformIsMarketplaceTransactionParty, false);
  assert.equal(boundary.marketplaceTransactionHandledDirectlyByParties, true);
  assert.equal(boundary.platformDoesNotBrokerOrRepresentParties, true);
  assert.deepEqual(boundary.role, ['advertising', 'discovery', 'direct_contact', 'distance_reduction']);
});

test('validator fails closed if any marketplace intermediation is enabled', () => {
  const mutations = [
    (manifest) => { manifest.ownerMarketplaceBoundary.marketplaceIntermediationRole = 'BROKER'; },
    (manifest) => { manifest.ownerMarketplaceBoundary.platformOnlyReducesDistance = false; },
    (manifest) => { manifest.ownerMarketplaceBoundary.transactionPartiesInteractDirectly = false; },
    (manifest) => { manifest.ownerMarketplaceBoundary.platformHasNoMarketplaceTransactionAuthority = false; },
    (manifest) => { manifest.ownerMarketplaceBoundary.platformIsMarketplaceTransactionParty = true; },
    (manifest) => { manifest.ownerMarketplaceBoundary.marketplaceTransactionHandledDirectlyByParties = false; },
    (manifest) => { manifest.ownerMarketplaceBoundary.platformDoesNotBrokerOrRepresentParties = false; }
  ];

  for (const mutate of mutations) {
    const manifest = loadManifest();
    mutate(manifest);
    const result = verify(manifest);
    assert.equal(result.ok, false);
  }
});
