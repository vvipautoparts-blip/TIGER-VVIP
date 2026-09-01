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

test('Pulse tiers are platform base prices and verified statutory tax is added above them', () => {
  const manifest = loadManifest();
  const pulse = manifest.pulseRing;

  assert.deepEqual(pulse.tiersJod, [2, 10, 20, 45]);
  assert.equal(pulse.tiersArePlatformBasePrices, true);
  assert.equal(pulse.countryPricingMode, 'PLATFORM_BASE_PLUS_VERIFIED_STATUTORY_TAX');
  assert.equal(pulse.countryTaxAddedToPlatformBasePrice, true);
  assert.equal(pulse.noTaxRateCeiling, true);
  assert.equal(pulse.statutoryTaxExcludedFromDistribution, true);
  assert.equal(
    pulse.statutoryTaxAuthority,
    'docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md'
  );
  assert.equal(
    pulse.canonicalTaxModule,
    'project-control/finance/statutory-tax-boundary.cjs'
  );
  assert.equal(Object.prototype.hasOwnProperty.call(pulse, 'referencePriceIncludesBaselineTaxBps'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(pulse, 'countryTaxAppliedToUntaxedBase'), false);
});

test('Fusion validator fails closed if Pulse base-plus-tax authority is weakened', () => {
  const mutations = [
    (manifest) => { manifest.pulseRing.tiersArePlatformBasePrices = false; },
    (manifest) => { manifest.pulseRing.countryPricingMode = 'FIXED_GLOBAL_PRICE'; },
    (manifest) => { manifest.pulseRing.countryTaxAddedToPlatformBasePrice = false; },
    (manifest) => { manifest.pulseRing.noTaxRateCeiling = false; },
    (manifest) => { manifest.pulseRing.statutoryTaxExcludedFromDistribution = false; },
    (manifest) => { manifest.pulseRing.canonicalTaxModule = 'client-tax.js'; }
  ];

  for (const mutate of mutations) {
    const manifest = loadManifest();
    mutate(manifest);
    const result = verify(manifest);
    assert.equal(result.ok, false);
  }
});
