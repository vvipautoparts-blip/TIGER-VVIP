'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  QVE_POLICY,
  qualifyExposure,
  createVerifiedExposureAccumulator,
  verifiedCompletionBps,
} = require('../src/tsn26/verified-exposure.cjs');

function event(overrides = {}) {
  return {
    eventId: 'exp-001',
    campaignId: 'campaign-001',
    viewerKey: 'viewer-hash-001',
    rendered: true,
    measurable: true,
    visibleRatioBps: 6000,
    dwellMs: 1500,
    invalidTraffic: false,
    geoMatched: true,
    sectorMatched: true,
    privacyMeasurementAllowed: true,
    occurredAt: '2026-08-26T01:00:00.000Z',
    ...overrides,
  };
}

test('qualified verified exposure requires every measurement and policy proof', () => {
  const result = qualifyExposure(event());
  assert.equal(result.qualified, true);
  assert.deepEqual(result.rejectionReasons, []);
  assert.equal(result.policyId, QVE_POLICY.id);
});

test('render alone never consumes paid verified exposure', () => {
  for (const invalid of [
    { measurable: false },
    { visibleRatioBps: 4999 },
    { dwellMs: 999 },
    { invalidTraffic: true },
    { geoMatched: false },
    { sectorMatched: false },
    { privacyMeasurementAllowed: false },
  ]) {
    const result = qualifyExposure(event(invalid));
    assert.equal(result.qualified, false);
    assert.ok(result.rejectionReasons.length > 0);
  }
});

test('duplicate event and duplicate viewer-campaign exposure cannot consume quota twice', () => {
  const accumulator = createVerifiedExposureAccumulator();
  const first = accumulator.record(event());
  const sameEvent = accumulator.record(event());
  const sameViewerNewEvent = accumulator.record(event({ eventId: 'exp-002' }));
  const newViewer = accumulator.record(event({ eventId: 'exp-003', viewerKey: 'viewer-hash-002' }));

  assert.equal(first.consumed, true);
  assert.equal(sameEvent.consumed, false);
  assert.equal(sameEvent.reason, 'DUPLICATE_EVENT');
  assert.equal(sameViewerNewEvent.consumed, false);
  assert.equal(sameViewerNewEvent.reason, 'DUPLICATE_VIEWER_CAMPAIGN');
  assert.equal(newViewer.consumed, true);
  assert.equal(accumulator.verifiedCount(), 2n);
});

test('verified completion uses integer basis points and caps at 100%', () => {
  assert.equal(verifiedCompletionBps({ verified: 0n, target: 100n }), 0);
  assert.equal(verifiedCompletionBps({ verified: 37n, target: 100n }), 3700);
  assert.equal(verifiedCompletionBps({ verified: 101n, target: 100n }), 10_000);
});
