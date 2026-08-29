'use strict';

const KNOWN = Object.freeze([
  'FINAL_STANDARD',
  'STABLE_PRODUCTION',
  'PROVIDER_MANAGED_STABLE',
  'CANDIDATE',
  'PREVIEW',
  'DRAFT',
  'EXPERIMENTAL'
]);

const PRODUCTION_ALLOWED = new Set([
  'FINAL_STANDARD',
  'STABLE_PRODUCTION',
  'PROVIDER_MANAGED_STABLE'
]);

function evaluateTechnologyProfile(profile, context = {}) {
  const maturity = String(profile && profile.maturity || '').trim();
  const target = String(context.target || '').trim();

  if (!KNOWN.includes(maturity)) {
    return Object.freeze({ allowed: false, code: 'TECH_MATURITY_UNKNOWN', maturity, target });
  }

  if (target === 'SOVEREIGN_PRODUCTION') {
    const allowed = PRODUCTION_ALLOWED.has(maturity);
    return Object.freeze({
      allowed,
      code: allowed ? 'TECH_MATURITY_PRODUCTION_ALLOWED' : 'TECH_MATURITY_NOT_PRODUCTION_STABLE',
      maturity,
      target
    });
  }

  if (target === 'LAB') {
    return Object.freeze({ allowed: true, code: 'TECH_MATURITY_LAB_ALLOWED', maturity, target });
  }

  if (target === 'CANARY') {
    const allowed = !['DRAFT', 'EXPERIMENTAL'].includes(maturity);
    return Object.freeze({
      allowed,
      code: allowed ? 'TECH_MATURITY_CANARY_ALLOWED' : 'TECH_MATURITY_CANARY_DENIED',
      maturity,
      target
    });
  }

  return Object.freeze({ allowed: false, code: 'TECH_MATURITY_TARGET_UNKNOWN', maturity, target });
}

module.exports = Object.freeze({ evaluateTechnologyProfile, KNOWN, PRODUCTION_ALLOWED });
