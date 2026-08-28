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

test('current authority is Latest-Only and owner binding is the mandatory first reference', () => {
  const manifest = loadManifest();
  assert.equal(manifest.schemaVersion, 'VVIP_TIGER_FUSION_AUTHORITY_V2');
  assert.equal(manifest.primaryProductIdentity, 'SOCIAL_NETWORK_FIRST');
  assert.equal(manifest.currentReference, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  assert.equal(manifest.firstReferenceRequired, true);
  assert.equal(manifest.authorityPreflight, 'OWNER_BINDING_CURRENT_FIRST');
  assert.equal(manifest.supersededMaterialDisposition, 'DELETE_FROM_CURRENT_TREE_NO_FALLBACK_NO_IN_TREE_ARCHIVE');
  assert.equal(manifest.recheckOnNewOwnerDecision, true);
  assert.equal(manifest.historicalEvidencePolicy, 'GIT_HISTORY_ONLY_FOR_SUPERSEDED_CONFLICTING_MATERIAL');
  assert.equal(manifest.tigerFinancialDistributionReference, 'docs/owner-control/TIGER_FINANCIAL_DISTRIBUTION_CURRENT.md');
  assert.equal(manifest.tigerFinancialDistributionConfig, 'config/finance/current-distribution.json');
  assert.equal(fs.existsSync(bindingPath), true);
  const binding = fs.readFileSync(bindingPath, 'utf8');
  assert.match(binding, /FIRST_REFERENCE/);
  assert.match(binding, /before any action, modification, cleanup, feature, refactor, migration/i);
  assert.match(binding, /newest explicit owner-approved decision/i);
  assert.match(binding, /No hidden copy, trash folder, archive folder/i);
  assert.match(binding, /PULSE_2/);
  assert.match(binding, /PULSE_10/);
  assert.match(binding, /PULSE_25/);
  assert.match(binding, /PULSE_45/);
  assert.match(binding, /OWNER.*5%/s);
  assert.match(binding, /ACTUAL_OPERATIONS.*43%/s);
  assert.match(binding, /TAX_RESERVE.*16%/s);
  assert.match(binding, /SALES_ADMINISTRATION.*21%/s);
  const result = verify(manifest);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('validator rejects bypass of the mandatory first-reference preflight', () => {
  for (const mutate of [
    (manifest) => { manifest.firstReferenceRequired = false; },
    (manifest) => { manifest.authorityPreflight = 'OPTIONAL'; },
    (manifest) => { manifest.supersededMaterialDisposition = 'ARCHIVE_IN_TREE'; },
    (manifest) => { manifest.recheckOnNewOwnerDecision = false; }
  ]) {
    const manifest = loadManifest();
    mutate(manifest);
    const result = verify(manifest);
    assert.equal(result.ok, false);
  }
});

test('current authority rejects fixed post quota and product lifetime', () => {
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

test('Pulse is exactly 2/10/25/45 with no product-time expiry', () => {
  const manifest = loadManifest();
  assert.deepEqual(manifest.pulseRing.tiersJod, [2, 10, 25, 45]);
  assert.equal(manifest.pulseRing.purchasedValue, 'SERVER_AUTHORITATIVE_VISIBILITY_ALLOCATION');
  assert.equal(manifest.pulseRing.productTimeExpiry, null);
  assert.equal(manifest.pulseRing.ordinaryPublicationPrerequisite, false);
  assert.equal(manifest.pulseRing.selfServiceDiscountPercent, 7);
  assert.equal(manifest.pulseRing.oneSaleOneSalesWinner, true);

  const oldTiers = loadManifest();
  oldTiers.pulseRing.tiersJod = [3, 10, 20];
  let result = verify(oldTiers);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('Pulse tiers must be exactly 2/10/25/45 JOD'));

  const expired = loadManifest();
  expired.pulseRing.productTimeExpiry = '30 days';
  result = verify(expired);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('Pulse visibility value must not have product-time expiry'));
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
