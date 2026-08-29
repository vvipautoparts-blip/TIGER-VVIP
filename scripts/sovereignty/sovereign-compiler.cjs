'use strict';

const { createHash } = require('node:crypto');

const SCHEMA_VERSION = 'TIGER_SGF_SOVEREIGN_COMPILER_V1';
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const CAPABILITIES = new Set([
  'SOCIAL', 'DISCOVERY', 'MESSAGING', 'ADS_DELIVERY', 'ADS_BILLING', 'PULSE', 'AI_RECOMMENDATION', 'DATA_EXPORT'
]);
const ALLOWED_FIELDS = new Set([
  'marketId', 'capability', 'policyDigest', 'releaseDigest', 'requirements', 'evidence', 'now'
]);

function compilerError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function requireDigest(value, release = false) {
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  if (release && (normalized === 'latest' || !DIGEST_PATTERN.test(normalized))) {
    throw compilerError('SGF_COMPILER_RELEASE_INVALID');
  }
  if (!release && !DIGEST_PATTERN.test(normalized)) throw compilerError('SGF_COMPILER_DIGEST_INVALID');
  return normalized;
}

function normalizeRequirements(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 64) {
    throw compilerError('SGF_COMPILER_REQUIREMENTS_INVALID');
  }
  const seen = new Set();
  const result = input.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw compilerError('SGF_COMPILER_REQUIREMENTS_INVALID');
    }
    const id = String(entry.id == null ? '' : entry.id).trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(id) || seen.has(id) || typeof entry.expiryRequired !== 'boolean') {
      throw compilerError('SGF_COMPILER_REQUIREMENTS_INVALID');
    }
    seen.add(id);
    return Object.freeze({ id, expiryRequired: entry.expiryRequired });
  });
  return Object.freeze(result);
}

function compileSovereignReadiness(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  for (const key of Object.keys(source)) {
    if (!ALLOWED_FIELDS.has(key)) throw compilerError('SGF_COMPILER_FIELD_FORBIDDEN');
  }

  const marketId = String(source.marketId == null ? '' : source.marketId).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(marketId)) throw compilerError('SGF_COMPILER_MARKET_INVALID');
  const capability = String(source.capability == null ? '' : source.capability).trim().toUpperCase();
  if (!CAPABILITIES.has(capability)) throw compilerError('SGF_COMPILER_CAPABILITY_INVALID');
  const policyDigest = requireDigest(source.policyDigest);
  const releaseDigest = requireDigest(source.releaseDigest, true);
  const requirements = normalizeRequirements(source.requirements);
  const evidence = source.evidence && typeof source.evidence === 'object' && !Array.isArray(source.evidence) ? source.evidence : {};
  const current = Number((typeof source.now === 'function' ? source.now : Date.now)());
  if (!Number.isFinite(current)) throw compilerError('SGF_COMPILER_CLOCK_INVALID');

  const codes = [];
  const results = [];
  for (const requirement of requirements) {
    const item = evidence[requirement.id];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      codes.push(`DENY_${requirement.id}_MISSING`);
      results.push(Object.freeze({ id: requirement.id, status: 'MISSING', digest: null, validUntil: null }));
      continue;
    }

    const evidenceDigest = String(item.digest == null ? '' : item.digest).trim().toLowerCase();
    if (!DIGEST_PATTERN.test(evidenceDigest)) {
      codes.push(`DENY_${requirement.id}_DIGEST_INVALID`);
      results.push(Object.freeze({ id: requirement.id, status: 'DIGEST_INVALID', digest: null, validUntil: item.validUntil ?? null }));
      continue;
    }

    const rawValidity = item.validUntil;
    if (rawValidity == null || rawValidity === '') {
      if (requirement.expiryRequired) {
        codes.push(`DENY_${requirement.id}_VALIDITY_MISSING`);
        results.push(Object.freeze({ id: requirement.id, status: 'VALIDITY_MISSING', digest: evidenceDigest, validUntil: null }));
      } else {
        results.push(Object.freeze({ id: requirement.id, status: 'PASS', digest: evidenceDigest, validUntil: null }));
      }
      continue;
    }

    const validUntilMs = Date.parse(rawValidity);
    if (!Number.isFinite(validUntilMs)) {
      codes.push(`DENY_${requirement.id}_VALIDITY_INVALID`);
      results.push(Object.freeze({ id: requirement.id, status: 'VALIDITY_INVALID', digest: evidenceDigest, validUntil: null }));
      continue;
    }
    const validUntil = new Date(validUntilMs).toISOString();
    if (current >= validUntilMs) {
      codes.push(`DENY_${requirement.id}_EXPIRED`);
      results.push(Object.freeze({ id: requirement.id, status: 'EXPIRED', digest: evidenceDigest, validUntil }));
      continue;
    }
    results.push(Object.freeze({ id: requirement.id, status: 'PASS', digest: evidenceDigest, validUntil }));
  }

  const status = codes.length === 0 ? 'READY_FOR_OWNER_SEAL' : 'DENY';
  const canonical = JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    marketId,
    capability,
    policyDigest,
    releaseDigest,
    requirements,
    evidenceResults: results,
    status,
    codes
  });
  const compileDigest = `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`;

  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    marketId,
    capability,
    policyDigest,
    releaseDigest,
    status,
    codes: Object.freeze([...codes]),
    evidenceResults: Object.freeze([...results]),
    compileDigest
  });
}

module.exports = Object.freeze({ SCHEMA_VERSION, compileSovereignReadiness });
