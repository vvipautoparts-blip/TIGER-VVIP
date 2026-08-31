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

test('Pulse reference prices include a 16 percent baseline and rebase to verified country tax', () => {
  const manifest = loadManifest();
  const pulse = manifest.pulseRing;

  assert.deepEqual(pulse.tiersJod, [2, 10, 20, 45]);
  assert.equal(pulse.referencePriceIncludesBaselineTaxBps, 1600);
  assert.equal(
    pulse.countryPricingMode,
    'REMOVE_REFERENCE_16_THEN_APPLY_VERIFIED_COUNTRY_TAX'
  );
  assert.equal(pulse.countryTaxAppliedToUntaxedBase, true);
  assert.equal(pulse.displayedCountryPriceIsFinalCharge, true);
  assert.equal(pulse.additionalTaxAtCapture, false);
  assert.equal(
    pulse.statutoryTaxAuthority,
    'docs/owner-control/TIGER_STATUTORY_TAX_BOUNDARY_CURRENT.md'
  );
  assert.equal(
    pulse.canonicalTaxModule,
    'project-control/finance/statutory-tax-boundary.cjs'
  );
});

test('Fusion validator fails closed if Pulse country-tax rebasing authority is weakened', () => {
  const mutations = [
    (manifest) => { manifest.pulseRing.referencePriceIncludesBaselineTaxBps = 0; },
    (manifest) => { manifest.pulseRing.countryPricingMode = 'FIXED_GLOBAL_PRICE'; },
    (manifest) => { manifest.pulseRing.countryTaxAppliedToUntaxedBase = false; },
    (manifest) => { manifest.pulseRing.displayedCountryPriceIsFinalCharge = false; },
    (manifest) => { manifest.pulseRing.additionalTaxAtCapture = true; },
    (manifest) => { manifest.pulseRing.canonicalTaxModule = 'client-tax.js'; }
  ];

  for (const mutate of mutations) {
    const manifest = loadManifest();
    mutate(manifest);
    const result = verify(manifest);
    assert.equal(result.ok, false);
  }
});
