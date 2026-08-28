'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'config/fusion/current-authority.json');
const validatorPath = path.join(root, 'scripts/fusion/verify-current-authority.cjs');
const bindingPath = path.join(root, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function verify(manifest) {
  return require(validatorPath).verifyCurrentAuthority(manifest);
}

test('current authority is Latest-Only and binds the permanent owner reference', () => {
  const manifest = loadManifest();
  assert.equal(manifest.schemaVersion, 'VVIP_TIGER_FUSION_AUTHORITY_V2');
  assert.equal(manifest.primaryProductIdentity, 'SOCIAL_NETWORK_FIRST');
  assert.equal(manifest.currentReference, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  assert.equal(fs.existsSync(bindingPath), true);
  const binding = fs.readFileSync(bindingPath, 'utf8');
  assert.match(binding, /CURRENT_ONLY \/ OWNER_BINDING \/ NO_FALLBACK/);
  assert.match(binding, /newest explicit owner-approved decision/i);
  assert.match(binding, /no owner-approved time lifetime/i);
  assert.match(binding, /no fixed commercial or weekly posting quota/i);
  assert.match(binding, /maximum of \*\*7 images\*\*/i);
  assert.match(binding, /SPARK.*3 JOD/s);
  assert.match(binding, /PULSE.*10 JOD/s);
  assert.match(binding, /SURGE.*20 JOD/s);
  const result = verify(manifest);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('current authority rejects fixed four-posts-per-week and any product lifetime', () => {
  const quota = loadManifest();
  quota.ordinaryPublication.fixedCommercialPostQuota = 4;
  let result = verify(quota);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('ordinary publication must not restore a fixed commercial/weekly post quota'));

  const lifetime = loadManifest();
  lifetime.ordinaryPublication.productLifetime = '120 days';
  result = verify(lifetime);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('ordinary publication must not have a product/content lifetime'));
});

test('current authority rejects publishing cards, subscriptions and paid publication gates', () => {
  for (const mutate of [
    (manifest) => { manifest.ordinaryPublication.publishingCard = true; },
    (manifest) => { manifest.ordinaryPublication.publishingSubscription = true; },
    (manifest) => { manifest.ordinaryPublication.paidPublishingGate = true; },
    (manifest) => { manifest.ordinaryPublication.submitContract = 'REQUEST_PUBLICATION'; }
  ]) {
    const manifest = loadManifest();
    mutate(manifest);
    const result = verify(manifest);
    assert.equal(result.ok, false);
  }
});

test('Pulse remains separate verified-impression visibility with no product-time expiry', () => {
  const manifest = loadManifest();
  assert.deepEqual(manifest.pulseRing.tiersJod, [3, 10, 20]);
  assert.equal(manifest.pulseRing.purchasedValue, 'VERIFIED_ELIGIBLE_IMPRESSIONS');
  assert.equal(manifest.pulseRing.productTimeExpiry, null);
  assert.equal(manifest.pulseRing.ordinaryPublicationPrerequisite, false);

  const expired = loadManifest();
  expired.pulseRing.productTimeExpiry = '30 days';
  const result = verify(expired);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('Pulse verified-impression value must not have product-time expiry'));
});

test('platform cannot become a party to marketplace transactions', () => {
  const manifest = loadManifest();
  manifest.ownerMarketplaceBoundary.platformIsMarketplaceTransactionParty = true;
  manifest.ownerMarketplaceBoundary.platformOwnedFinancialScope.push('marketplace_transaction_commission_payout');
  const result = verify(manifest);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('platform must not be a party to marketplace transactions'));
  assert.ok(result.errors.includes('platformOwnedFinancialScope must be limited to platform-owned advertising services'));
});

test('all mandatory legacy decisions remain explicitly superseded', () => {
  const manifest = loadManifest();
  const decisions = new Map(manifest.supersededDecisions.map((entry) => [entry.id, entry.status]));
  for (const id of require(validatorPath).REQUIRED_SUPERSEDED_IDS) {
    assert.equal(decisions.get(id), 'SUPERSEDED', `${id} must stay SUPERSEDED`);
  }
});
