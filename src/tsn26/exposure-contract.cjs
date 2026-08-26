'use strict';

const CANONICAL_PACKAGES = new Set([2, 10, 25, 45]);
const GEO_LEVELS = new Set(['COUNTRY', 'ADMIN_1', 'ADMIN_2', 'ADMIN_3', 'LOCALITY', 'NEIGHBORHOOD']);
const SECTOR_MODES = new Set(['ONE_SECTOR', 'ALL_SECTORS']);

function nonEmpty(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
}

function nonNegativeBigInt(value, field) {
  if (typeof value !== 'bigint' || value < 0n) throw new Error(`TSN26_FORECAST_COUNT_INVALID:${field}`);
  return value;
}

function coverageBps(count, eligibleAudience) {
  if (eligibleAudience <= 0n) throw new Error('TSN26_ELIGIBLE_AUDIENCE_REQUIRED');
  return Number((count * 10_000n) / eligibleAudience);
}

function velocityLabel(index) {
  if (!Number.isInteger(index) || index < 0 || index > 100) throw new Error('TSN26_VELOCITY_INDEX_INVALID');
  if (index <= 39) return 'SLOW';
  if (index <= 74) return 'GOOD';
  return 'FAST';
}

function normalizeTargeting(targeting) {
  if (!targeting || typeof targeting !== 'object') throw new Error('TSN26_TARGETING_REQUIRED');
  const geoLevel = nonEmpty(targeting.geoLevel, 'TSN26_GEO_LEVEL_REQUIRED');
  if (!GEO_LEVELS.has(geoLevel)) throw new Error(`TSN26_GEO_LEVEL_INVALID:${geoLevel}`);
  const geoId = nonEmpty(targeting.geoId, 'TSN26_GEO_ID_REQUIRED');
  const sectorMode = nonEmpty(targeting.sectorMode, 'TSN26_SECTOR_MODE_REQUIRED');
  if (!SECTOR_MODES.has(sectorMode)) throw new Error(`TSN26_SECTOR_MODE_INVALID:${sectorMode}`);

  let sectorId = null;
  if (sectorMode === 'ONE_SECTOR') sectorId = nonEmpty(targeting.sectorId, 'TSN26_SECTOR_ID_REQUIRED');
  if (sectorMode === 'ALL_SECTORS' && targeting.sectorId != null) {
    throw new Error('TSN26_ALL_SECTORS_MUST_NOT_PIN_SECTOR');
  }

  return Object.freeze({ geoLevel, geoId, sectorMode, sectorId });
}

function createExposureContract({ packageJod, targeting, forecast } = {}) {
  if (!Number.isInteger(packageJod) || !CANONICAL_PACKAGES.has(packageJod)) {
    throw new Error('TSN26_CANONICAL_EXPOSURE_PACKAGE_REQUIRED');
  }
  const normalizedTargeting = normalizeTargeting(targeting);
  if (!forecast || typeof forecast !== 'object') throw new Error('TSN26_EXPOSURE_FORECAST_REQUIRED');

  const eligibleAudience = nonNegativeBigInt(forecast.eligibleAudience, 'eligibleAudience');
  if (eligibleAudience <= 0n) throw new Error('TSN26_ELIGIBLE_AUDIENCE_REQUIRED');
  const qualifiedLow = nonNegativeBigInt(forecast.qualifiedLow, 'qualifiedLow');
  const qualifiedCentral = nonNegativeBigInt(forecast.qualifiedCentral, 'qualifiedCentral');
  const qualifiedHigh = nonNegativeBigInt(forecast.qualifiedHigh, 'qualifiedHigh');
  if (!(qualifiedLow <= qualifiedCentral && qualifiedCentral <= qualifiedHigh)) {
    throw new Error('TSN26_FORECAST_RANGE_INVALID');
  }
  if (qualifiedHigh > eligibleAudience) throw new Error('TSN26_FORECAST_EXCEEDS_ELIGIBLE_AUDIENCE');
  if (!Number.isInteger(forecast.confidenceBps) || forecast.confidenceBps < 0 || forecast.confidenceBps > 10_000) {
    throw new Error('TSN26_FORECAST_CONFIDENCE_INVALID');
  }
  const modelVersion = nonEmpty(forecast.modelVersion, 'TSN26_FORECAST_MODEL_VERSION_REQUIRED');
  const velocity = Object.freeze({ index: forecast.velocityIndex, label: velocityLabel(forecast.velocityIndex) });

  return Object.freeze({
    contractVersion: 'TSN26-EXPOSURE-CONTRACT-2026.08-V1',
    packageId: `T${packageJod}`,
    packageJod,
    targeting: normalizedTargeting,
    eligibleAudience,
    estimatedQualifiedExposure: Object.freeze({ low: qualifiedLow, central: qualifiedCentral, high: qualifiedHigh }),
    estimatedCoverageBps: Object.freeze({
      low: coverageBps(qualifiedLow, eligibleAudience),
      central: coverageBps(qualifiedCentral, eligibleAudience),
      high: coverageBps(qualifiedHigh, eligibleAudience),
    }),
    confidenceBps: forecast.confidenceBps,
    velocity,
    modelVersion,
    predictionNotGuarantee: true,
    productUnit: 'VERIFIED_EXPOSURE_CAPACITY',
  });
}

module.exports = { createExposureContract, velocityLabel };
