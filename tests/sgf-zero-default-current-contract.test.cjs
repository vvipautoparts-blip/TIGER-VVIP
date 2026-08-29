'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function readJson(relative) {
  return JSON.parse(read(relative));
}

test('SGF machine truth has no sovereign defaults', () => {
  const sgf = readJson('config/sovereignty/sgf-v1.json');
  assert.equal(sgf.ownerRoot.id, 'OWNER_ROOT');
  assert.equal(sgf.ownerRoot.country, null);
  assert.equal(sgf.ownerRoot.currency, null);
  assert.equal(sgf.ownerRoot.market, null);
  assert.equal(sgf.ownerRoot.standingRuntimePrivilege, false);

  for (const field of ['country', 'currency', 'paymentProvider', 'legalEntity', 'taxProfile', 'market']) {
    assert.equal(sgf.defaults[field], null, `defaults.${field} must remain null`);
  }

  assert.deepEqual(sgf.markets, []);
  assert.equal(sgf.activationAuthority, 'MARKET_CAPABILITY_PASSPORT');
  assert.equal(sgf.fallbackPolicy, 'DENY_NO_SOVEREIGN_FALLBACK');
});

test('Fusion authority cannot restore global JOD or another global Pulse price', () => {
  const fusion = readJson('config/fusion/current-authority.json');
  assert.equal(Object.prototype.hasOwnProperty.call(fusion.pulseRing, 'tiersJod'), false);
  assert.deepEqual(fusion.pulseRing.productLevels, ['PULSE_2', 'PULSE_10', 'PULSE_25', 'PULSE_45']);
  assert.equal(fusion.pulseRing.globalPrice, null);
  assert.equal(fusion.pulseRing.globalCurrency, null);
  assert.equal(fusion.pulseRing.pricingAuthority, 'MARKET_PRICING_CONTRACT');
  assert.equal(fusion.retainedFoundations.includes('COUNTRY_ACTIVATION_GATES'), false);
  assert.ok(fusion.retainedFoundations.includes('SOVEREIGN_MARKET_CAPABILITY_GATES'));

  const fusionText = read('config/fusion/current-authority.json');
  assert.doesNotMatch(fusionText, /"tiersJod"\s*:/);
  assert.doesNotMatch(fusionText, /"globalCurrency"\s*:\s*"[A-Z]{3}"/);
  assert.doesNotMatch(fusionText, /"globalPrice"\s*:\s*(?!null)\d/);
});

test('Current validators reject legacy sovereign pricing rather than require it', () => {
  const fusionValidator = read('scripts/fusion/verify-current-authority.cjs');
  const sgfValidator = read('scripts/sovereignty/verify-sgf-authority.cjs');

  assert.match(fusionValidator, /Pulse global tiersJod authority is forbidden by SGF/);
  assert.match(fusionValidator, /Pulse globalCurrency must be null under SGF/);
  assert.match(fusionValidator, /Pulse pricingAuthority must be MARKET_PRICING_CONTRACT/);
  assert.doesNotMatch(fusionValidator, /Pulse tiers must be exactly 2\/10\/25\/45 JOD/);

  assert.match(sgfValidator, /OWNER_ROOT country must be null/);
  assert.match(sgfValidator, /defaults\.currency must be null|defaults\.\$\{field\} must be null/);
  assert.match(sgfValidator, /DENY_NO_SOVEREIGN_FALLBACK/);
});

test('Owner and advertising authority positively declare market-sovereign pricing', () => {
  const binding = read('docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  const pulse = read('docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md');
  const sgf = read('docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md');

  assert.match(binding, /ZERO DEFAULT COUNTRY/i);
  assert.match(binding, /ZERO DEFAULT CURRENCY/i);
  assert.match(binding, /NO SOVEREIGN FALLBACK/i);
  assert.match(pulse, /There is no global\/default Pulse currency/i);
  assert.match(pulse, /Market Pricing Contract/);
  assert.match(sgf, /GLOBAL_DEFAULT_PAYMENT_PROVIDER = NONE/);
});

test('TIGER ONE delegates sovereign monetization to SGF instead of fixing JOD globally', () => {
  const tigerOne = read('docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md');

  assert.match(tigerOne, /TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(tigerOne, /Market Pricing Contract/);
  assert.doesNotMatch(tigerOne, /3\/10\/20 JOD/i);
  assert.doesNotMatch(tigerOne, /20 JOD (?:charge )?cap/i);
  assert.doesNotMatch(tigerOne, /45\/120 JOD/i);
});

test('Current Social execution map does not restore a global JOD Pulse authority', () => {
  const matrix = read('docs/owner-control/TIGER_SOCIAL_FUNCTIONAL_PARITY_MATRIX.md');

  assert.match(matrix, /Market Pricing Contract/);
  assert.match(matrix, /PULSE_2/);
  assert.doesNotMatch(matrix, /Pulse Ring 3\/10\/20 JOD authority/i);
  assert.doesNotMatch(matrix, /global(?:ly)?[^\n]{0,80}JOD/i);
});

test('superseded JOD Pulse design input is absent from the current tree', () => {
  const superseded = path.join(root, 'docs/superpowers/specs/2026-08-18-tiger-pulse-ring-attention-allocation-engine-design.md');
  assert.equal(fs.existsSync(superseded), false);
});

test('Authority registry protects SGF boundaries and no longer protects JOD as a global advertising boundary', () => {
  const registry = readJson('project-control/authority/authority-registry.v1.json');
  const sgf = registry.records.find((record) => record.authority_id === 'authority.sovereign-genome-fabric.v1');
  const advertising = registry.records.find((record) => record.authority_id === 'authority.advertising.v1');

  assert.ok(sgf);
  assert.equal(sgf.status, 'CURRENT_ONLY');
  assert.ok(sgf.protected_boundaries.includes('zero-default-country'));
  assert.ok(sgf.protected_boundaries.includes('zero-default-currency'));
  assert.ok(sgf.protected_boundaries.includes('zero-default-payment-provider'));
  assert.ok(sgf.protected_boundaries.includes('no-sovereign-fallback'));

  assert.ok(advertising);
  assert.equal(advertising.protected_boundaries.includes('2-10-25-45-jod'), false);
  assert.ok(advertising.protected_boundaries.includes('pulse-product-levels-market-priced'));
  assert.ok(advertising.protected_boundaries.includes('no-global-sovereign-currency'));
});
