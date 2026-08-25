'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createExposureContract } = require('../src/tsn26/exposure-contract.cjs');

test('pre-purchase exposure contract uses range + confidence + velocity, never sold days', () => {
  const contract = createExposureContract({
    packageJod: 25,
    targeting: { geoLevel: 'ADMIN_1', geoId: 'JO-AM', sectorMode: 'ONE_SECTOR', sectorId: 'AUTO' },
    forecast: {
      eligibleAudience: 10_000n,
      qualifiedLow: 5_100n,
      qualifiedCentral: 6_000n,
      qualifiedHigh: 6_800n,
      confidenceBps: 8800,
      velocityIndex: 82,
      modelVersion: 'exposure-model-2026.08.1',
    },
  });

  assert.equal(contract.packageId, 'T25');
  assert.deepEqual(contract.estimatedCoverageBps, { low: 5100, central: 6000, high: 6800 });
  assert.equal(contract.confidenceBps, 8800);
  assert.equal(contract.velocity.label, 'FAST');
  assert.equal(contract.predictionNotGuarantee, true);
  assert.equal('days' in contract, false);
  assert.equal('durationDays' in contract, false);
});

test('velocity maps only to SLOW, GOOD, FAST', () => {
  const base = {
    packageJod: 10,
    targeting: { geoLevel: 'COUNTRY', geoId: 'JO', sectorMode: 'ALL_SECTORS' },
    forecast: { eligibleAudience: 100n, qualifiedLow: 10n, qualifiedCentral: 20n, qualifiedHigh: 30n, confidenceBps: 7000, modelVersion: 'm1' },
  };
  assert.equal(createExposureContract({ ...base, forecast: { ...base.forecast, velocityIndex: 39 } }).velocity.label, 'SLOW');
  assert.equal(createExposureContract({ ...base, forecast: { ...base.forecast, velocityIndex: 40 } }).velocity.label, 'GOOD');
  assert.equal(createExposureContract({ ...base, forecast: { ...base.forecast, velocityIndex: 75 } }).velocity.label, 'FAST');
});

test('forecast ranges cannot exceed eligible audience or reverse order', () => {
  const base = {
    packageJod: 45,
    targeting: { geoLevel: 'COUNTRY', geoId: 'JO', sectorMode: 'ALL_SECTORS' },
    forecast: { eligibleAudience: 100n, qualifiedLow: 50n, qualifiedCentral: 60n, qualifiedHigh: 70n, confidenceBps: 9000, velocityIndex: 80, modelVersion: 'm1' },
  };
  assert.throws(() => createExposureContract({ ...base, forecast: { ...base.forecast, qualifiedHigh: 101n } }), /TSN26_FORECAST_EXCEEDS_ELIGIBLE_AUDIENCE/);
  assert.throws(() => createExposureContract({ ...base, forecast: { ...base.forecast, qualifiedLow: 70n, qualifiedCentral: 60n } }), /TSN26_FORECAST_RANGE_INVALID/);
});

test('targeting supports one sector or all sectors with universal geo levels', () => {
  const forecast = { eligibleAudience: 100n, qualifiedLow: 10n, qualifiedCentral: 20n, qualifiedHigh: 30n, confidenceBps: 7000, velocityIndex: 50, modelVersion: 'm1' };
  assert.throws(() => createExposureContract({
    packageJod: 2,
    targeting: { geoLevel: 'ADMIN_2', geoId: 'x', sectorMode: 'ONE_SECTOR' },
    forecast,
  }), /TSN26_SECTOR_ID_REQUIRED/);
  assert.throws(() => createExposureContract({
    packageJod: 2,
    targeting: { geoLevel: 'PLANET', geoId: 'x', sectorMode: 'ALL_SECTORS' },
    forecast,
  }), /TSN26_GEO_LEVEL_INVALID/);
});
