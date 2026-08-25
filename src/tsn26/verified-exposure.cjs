'use strict';

const QVE_POLICY = Object.freeze({
  id: 'TSN26-QVE-2026.08-V1',
  minimumVisibleRatioBps: 5000,
  minimumDwellMs: 1000,
});

function nonEmpty(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
}

function qualifyExposure(input) {
  if (!input || typeof input !== 'object') throw new Error('TSN26_EXPOSURE_EVENT_REQUIRED');
  nonEmpty(input.eventId, 'TSN26_EXPOSURE_EVENT_ID_REQUIRED');
  nonEmpty(input.campaignId, 'TSN26_EXPOSURE_CAMPAIGN_ID_REQUIRED');
  nonEmpty(input.viewerKey, 'TSN26_EXPOSURE_VIEWER_KEY_REQUIRED');
  if (!Number.isFinite(Date.parse(input.occurredAt))) throw new Error('TSN26_EXPOSURE_TIME_INVALID');
  if (!Number.isInteger(input.visibleRatioBps) || input.visibleRatioBps < 0 || input.visibleRatioBps > 10_000) {
    throw new Error('TSN26_VISIBLE_RATIO_INVALID');
  }
  if (!Number.isInteger(input.dwellMs) || input.dwellMs < 0) throw new Error('TSN26_DWELL_INVALID');

  const reasons = [];
  if (input.rendered !== true) reasons.push('NOT_RENDERED');
  if (input.measurable !== true) reasons.push('NOT_MEASURABLE');
  if (input.visibleRatioBps < QVE_POLICY.minimumVisibleRatioBps) reasons.push('INSUFFICIENT_VISIBLE_RATIO');
  if (input.dwellMs < QVE_POLICY.minimumDwellMs) reasons.push('INSUFFICIENT_DWELL');
  if (input.invalidTraffic === true) reasons.push('INVALID_TRAFFIC');
  if (input.geoMatched !== true) reasons.push('GEO_MISMATCH');
  if (input.sectorMatched !== true) reasons.push('SECTOR_MISMATCH');
  if (input.privacyMeasurementAllowed !== true) reasons.push('MEASUREMENT_NOT_ALLOWED');

  return Object.freeze({
    qualified: reasons.length === 0,
    policyId: QVE_POLICY.id,
    eventId: input.eventId,
    campaignId: input.campaignId,
    viewerKey: input.viewerKey,
    occurredAt: new Date(Date.parse(input.occurredAt)).toISOString(),
    rejectionReasons: Object.freeze(reasons),
  });
}

function createVerifiedExposureAccumulator() {
  const eventIds = new Set();
  const viewerCampaignKeys = new Set();
  let count = 0n;

  return Object.freeze({
    record(input) {
      const result = qualifyExposure(input);
      if (eventIds.has(result.eventId)) {
        return Object.freeze({ consumed: false, reason: 'DUPLICATE_EVENT', qualification: result });
      }
      eventIds.add(result.eventId);

      if (!result.qualified) {
        return Object.freeze({ consumed: false, reason: 'NOT_QUALIFIED', qualification: result });
      }

      const viewerCampaignKey = `${result.campaignId}:${result.viewerKey}`;
      if (viewerCampaignKeys.has(viewerCampaignKey)) {
        return Object.freeze({ consumed: false, reason: 'DUPLICATE_VIEWER_CAMPAIGN', qualification: result });
      }

      viewerCampaignKeys.add(viewerCampaignKey);
      count += 1n;
      return Object.freeze({ consumed: true, reason: 'QUALIFIED_VERIFIED_EXPOSURE', qualification: result });
    },
    verifiedCount() {
      return count;
    },
  });
}

function verifiedCompletionBps({ verified, target } = {}) {
  if (typeof verified !== 'bigint' || verified < 0n) throw new Error('TSN26_INVALID_VERIFIED_EXPOSURE_COUNT');
  if (typeof target !== 'bigint' || target <= 0n) throw new Error('TSN26_INVALID_EXPOSURE_TARGET');
  const bps = Number((verified * 10_000n) / target);
  return Math.min(10_000, bps);
}

module.exports = {
  QVE_POLICY,
  qualifyExposure,
  createVerifiedExposureAccumulator,
  verifiedCompletionBps,
};
