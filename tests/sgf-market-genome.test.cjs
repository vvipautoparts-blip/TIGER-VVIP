'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const genome = require('../scripts/sovereignty/market-genome.cjs');

const D = (char) => `sha256:${char.repeat(64)}`;
function input(overrides = {}) {
  return {
    marketId: 'US',
    legalPolicyDigest: D('1'),
    taxPolicyDigest: D('2'),
    privacyPolicyDigest: D('3'),
    dataResidencyPolicyDigest: D('4'),
    advertisingPolicyDigest: D('5'),
    paymentPolicyDigest: D('6'),
    aiPolicyDigest: D('7'),
    securityPolicyDigest: D('8'),
    runtimePolicyDigest: D('9'),
    releaseDigest: D('a'),
    ownerAuthorityDigest: D('b'),
    ...overrides
  };
}

test('market genome is deterministic and content-addressed', () => {
  const a = genome.buildMarketGenome(input());
  const reversed = Object.fromEntries(Object.entries(input()).reverse());
  const b = genome.buildMarketGenome(reversed);
  assert.equal(a.schemaVersion, 'TIGER_SGF_MARKET_GENOME_V1');
  assert.equal(a.genomeDigest, b.genomeDigest);
  assert.match(a.genomeDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(a), true);
});

test('changing any sovereign input changes the genome identity', () => {
  const base = genome.buildMarketGenome(input());
  for (const [field, value] of [
    ['legalPolicyDigest', D('c')],
    ['paymentPolicyDigest', D('d')],
    ['securityPolicyDigest', D('e')],
    ['releaseDigest', D('f')]
  ]) {
    assert.notEqual(genome.buildMarketGenome(input({ [field]: value })).genomeDigest, base.genomeDigest, field);
  }
});

test('genome rejects missing malformed or floating release identity', () => {
  assert.throws(() => genome.buildMarketGenome(input({ marketId: '' })), { code: 'SGF_GENOME_MARKET_INVALID' });
  assert.throws(() => genome.buildMarketGenome(input({ legalPolicyDigest: 'abc' })), { code: 'SGF_GENOME_DIGEST_INVALID' });
  assert.throws(() => genome.buildMarketGenome(input({ releaseDigest: 'latest' })), { code: 'SGF_GENOME_RELEASE_INVALID' });
});

test('genome rejects extra authority-shaping fields', () => {
  assert.throws(() => genome.buildMarketGenome(input({ defaultCountry: 'JO' })), { code: 'SGF_GENOME_FIELD_FORBIDDEN' });
  assert.throws(() => genome.buildMarketGenome(input({ defaultCurrency: 'JOD' })), { code: 'SGF_GENOME_FIELD_FORBIDDEN' });
});
