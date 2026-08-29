'use strict';

const CAPABILITIES = Object.freeze([
  'SOCIAL',
  'DISCOVERY',
  'MESSAGING',
  'ADS_DELIVERY',
  'ADS_BILLING',
  'PULSE',
  'AI_RECOMMENDATION',
  'DATA_EXPORT'
]);

const DEFAULT_FIELDS = Object.freeze([
  'country',
  'currency',
  'paymentProvider',
  'legalEntity',
  'taxProfile',
  'market'
]);

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((item, index) => actual[index] === item);
}

function verifySgfAuthority(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, errors: ['manifest must be an object'] };
  }

  if (manifest.schemaVersion !== 'TIGER_SGF_V1') errors.push('schemaVersion must be TIGER_SGF_V1');

  const owner = manifest.ownerRoot || {};
  if (owner.id !== 'OWNER_ROOT') errors.push('ownerRoot.id must be OWNER_ROOT');
  if (owner.country !== null) errors.push('OWNER_ROOT country must be null');
  if (owner.currency !== null) errors.push('OWNER_ROOT currency must be null');
  if (owner.market !== null) errors.push('OWNER_ROOT market must be null');
  if (owner.standingRuntimePrivilege !== false) errors.push('OWNER_ROOT standing runtime privilege must be false');

  const defaults = manifest.defaults || {};
  for (const field of DEFAULT_FIELDS) {
    if (defaults[field] !== null) errors.push(`defaults.${field} must be null`);
  }

  if (!exactArray(manifest.capabilityRegistry, CAPABILITIES)) {
    errors.push('capabilityRegistry must equal the SGF V1 capability registry');
  }
  if (!Array.isArray(manifest.markets)) errors.push('markets must be an array');
  if (manifest.marketSelectionPolicy !== 'EXPLICIT_ONLY') {
    errors.push('marketSelectionPolicy must be EXPLICIT_ONLY');
  }
  if (manifest.publicReadMarketPolicy !== 'OPTIONAL_EXPLICIT_OR_GLOBAL') {
    errors.push('publicReadMarketPolicy must be OPTIONAL_EXPLICIT_OR_GLOBAL');
  }
  if (manifest.runtimeMarketResolver !== 'scripts/sovereignty/explicit-market-context.cjs') {
    errors.push('runtimeMarketResolver must point to explicit-market-context.cjs');
  }
  if (manifest.activationAuthority !== 'MARKET_CAPABILITY_PASSPORT') {
    errors.push('activationAuthority must be MARKET_CAPABILITY_PASSPORT');
  }
  if (manifest.fallbackPolicy !== 'DENY_NO_SOVEREIGN_FALLBACK') {
    errors.push('fallbackPolicy must be DENY_NO_SOVEREIGN_FALLBACK');
  }

  return { ok: errors.length === 0, errors };
}

module.exports = Object.freeze({ verifySgfAuthority, CAPABILITIES, DEFAULT_FIELDS });
