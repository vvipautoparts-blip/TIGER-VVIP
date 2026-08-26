export const ENTROPY_DIMENSIONS = Object.freeze([
  'dead_code',
  'duplication',
  'dependency_sprawl',
  'schema_drift',
  'artifact_staleness',
  'operational_burden',
  'cleanup_backlog',
  'orphaned_asset_count',
  'historical_residue_pressure',
  'reversibility_loss',
]);

const DIMENSIONS = new Set(ENTROPY_DIMENSIONS);
const MAX_ID_LENGTH = 256;

export class AionEntropyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionEntropyError';
    this.code = code;
  }
}

function fail(message) {
  throw new AionEntropyError('AION_ENTROPY_INVALID', message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ID_LENGTH || value.includes('\0')) {
    fail(`${field} is outside allowed bounds`);
  }
  return value;
}

function requireScore(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    fail(`${field} must be a finite score from 0 through 100`);
  }
  return value;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

export function scoreEntropy(input) {
  if (!isPlainObject(input)) fail('entropy input must be a plain object');
  if (!isPlainObject(input.dimensions)) fail('dimensions must be a plain object');

  const assetId = requireString(input.asset_id, 'asset_id');
  const businessValue = requireScore(input.business_value, 'business_value');
  const suppliedKeys = Object.keys(input.dimensions);
  if (suppliedKeys.length === 0) fail('at least one entropy dimension is required');

  for (const key of suppliedKeys) {
    if (!DIMENSIONS.has(key)) fail(`unsupported entropy dimension: ${key}`);
    requireScore(input.dimensions[key], `dimensions.${key}`);
  }

  const dimensions = {};
  for (const key of ENTROPY_DIMENSIONS) {
    dimensions[key] = suppliedKeys.includes(key) ? input.dimensions[key] : 0;
  }
  const structuralEntropy = round(
    ENTROPY_DIMENSIONS.reduce((total, key) => total + dimensions[key], 0) / ENTROPY_DIMENSIONS.length,
  );

  let recommendation = 'OBSERVE';
  if (businessValue >= 80 && structuralEntropy >= 40) recommendation = 'REVIEW_HIGH_VALUE';
  else if (structuralEntropy >= 70) recommendation = 'REVIEW_STRUCTURAL_ENTROPY';
  else if (structuralEntropy >= 40) recommendation = 'PLAN_MAINTENANCE';

  return Object.freeze({
    schema_version: 'TIGER-AION-ENTROPY-SCORE-1',
    asset_id: assetId,
    structural_entropy: structuralEntropy,
    business_value: businessValue,
    dimensions: Object.freeze(dimensions),
    recommendation,
    diagnostic_only: true,
  });
}
