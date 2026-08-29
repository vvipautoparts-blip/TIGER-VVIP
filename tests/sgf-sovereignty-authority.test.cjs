'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sgfPath = path.join(root, 'config/sovereignty/sgf-v1.json');
const ownerBindingPath = path.join(root, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
const sgfAuthorityPath = path.join(root, 'docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md');
const sgfValidatorPath = path.join(root, 'scripts/sovereignty/verify-sgf-authority.cjs');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function verifySgf(manifest) {
  return require(sgfValidatorPath).verifySgfAuthority(manifest);
}

test('SGF owner root is global and every sovereign default is null', () => {
  assert.equal(fs.existsSync(sgfPath), true, 'SGF machine authority must exist');
  const sgf = loadJson(sgfPath);

  assert.equal(sgf.schemaVersion, 'TIGER_SGF_V1');
  assert.deepEqual(sgf.ownerRoot, {
    id: 'OWNER_ROOT',
    country: null,
    currency: null,
    market: null,
    standingRuntimePrivilege: false
  });
  assert.deepEqual(sgf.defaults, {
    country: null,
    currency: null,
    paymentProvider: null,
    legalEntity: null,
    taxProfile: null,
    market: null
  });
  assert.deepEqual(sgf.markets, []);
  assert.equal(sgf.marketSelectionPolicy, 'EXPLICIT_ONLY');
  assert.equal(sgf.publicReadMarketPolicy, 'OPTIONAL_EXPLICIT_OR_GLOBAL');
  assert.equal(sgf.runtimeMarketResolver, 'scripts/sovereignty/explicit-market-context.cjs');
  assert.equal(sgf.activationAuthority, 'MARKET_CAPABILITY_PASSPORT');
  assert.equal(sgf.fallbackPolicy, 'DENY_NO_SOVEREIGN_FALLBACK');
});

test('SGF is wired into current owner authority', () => {
  assert.equal(fs.existsSync(sgfAuthorityPath), true);
  const binding = fs.readFileSync(ownerBindingPath, 'utf8');
  assert.match(binding, /TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(binding, /ZERO DEFAULT COUNTRY/i);
  assert.match(binding, /ZERO DEFAULT CURRENCY/i);
  assert.match(binding, /NO SOVEREIGN FALLBACK/i);
});

test('SGF validator rejects every sovereign default and owner-root binding', () => {
  const base = loadJson(sgfPath);
  const mutations = [
    (x) => { x.ownerRoot.country = 'JO'; },
    (x) => { x.ownerRoot.currency = 'JOD'; },
    (x) => { x.ownerRoot.market = 'JO'; },
    (x) => { x.ownerRoot.standingRuntimePrivilege = true; },
    (x) => { x.defaults.country = 'JO'; },
    (x) => { x.defaults.currency = 'JOD'; },
    (x) => { x.defaults.paymentProvider = 'stripe'; },
    (x) => { x.defaults.legalEntity = 'JO_ENTITY'; },
    (x) => { x.defaults.taxProfile = 'JO_TAX'; },
    (x) => { x.defaults.market = 'JO'; },
    (x) => { x.marketSelectionPolicy = 'DEFAULT_COUNTRY'; },
    (x) => { x.publicReadMarketPolicy = 'DEFAULT_COUNTRY'; },
    (x) => { x.runtimeMarketResolver = 'scripts/runtime/default-country.js'; },
    (x) => { x.components.marketGenome = 'scripts/legacy/default-country-genome.js'; },
    (x) => { x.components.ownerExecutionLease = 'scripts/legacy/permanent-root.js'; },
    (x) => { x.components.signedPolicyBundle = 'scripts/legacy/unsigned-policy.js'; },
    (x) => { x.components.cryptoInventoryVerifier = 'scripts/security/skip-crypto-inventory.cjs'; },
    (x) => { x.fallbackPolicy = 'FALLBACK_TO_JO'; }
  ];

  for (const mutate of mutations) {
    const candidate = structuredClone(base);
    mutate(candidate);
    const result = verifySgf(candidate);
    assert.equal(result.ok, false, JSON.stringify(candidate));
  }
});

test('SGF capability registry is exact, duplicate-free and markets may be empty', () => {
  const sgf = loadJson(sgfPath);
  assert.deepEqual(sgf.capabilityRegistry, [
    'SOCIAL',
    'DISCOVERY',
    'MESSAGING',
    'ADS_DELIVERY',
    'ADS_BILLING',
    'PULSE',
    'AI_RECOMMENDATION',
    'DATA_EXPORT'
  ]);
  assert.equal(new Set(sgf.capabilityRegistry).size, sgf.capabilityRegistry.length);
  assert.equal(verifySgf(sgf).ok, true);
});

test('SGF machine truth binds explicit runtime market selection', () => {
  const sgf = loadJson(sgfPath);
  assert.equal(sgf.marketSelectionPolicy, 'EXPLICIT_ONLY');
  assert.equal(sgf.publicReadMarketPolicy, 'OPTIONAL_EXPLICIT_OR_GLOBAL');
  assert.equal(sgf.runtimeMarketResolver, 'scripts/sovereignty/explicit-market-context.cjs');
  assert.equal(verifySgf(sgf).ok, true);
});

test('SGF machine truth binds the canonical sovereignty components', () => {
  const sgf = loadJson(sgfPath);
  assert.deepEqual(sgf.components, {
    explicitMarketContext: 'scripts/sovereignty/explicit-market-context.cjs',
    capabilityLifecycle: 'scripts/sovereignty/market-capability-lifecycle.cjs',
    sovereignCompiler: 'scripts/sovereignty/sovereign-compiler.cjs',
    marketGenome: 'scripts/sovereignty/market-genome.cjs',
    activationPassport: 'scripts/sovereignty/market-activation-passport.cjs',
    executionSeal: 'scripts/sovereignty/genome-execution-seal.cjs',
    ownerExecutionLease: 'scripts/sovereignty/owner-execution-lease.cjs',
    signedPolicyBundle: 'scripts/sovereignty/signed-policy-bundle.cjs',
    killGrid: 'scripts/sovereignty/sovereign-kill-grid.cjs',
    cryptoInventoryVerifier: 'scripts/security/verify-crypto-inventory.cjs'
  });
  for (const relative of Object.values(sgf.components)) {
    assert.equal(fs.existsSync(path.join(root, relative)), true, relative);
  }
  assert.equal(verifySgf(sgf).ok, true);
});
