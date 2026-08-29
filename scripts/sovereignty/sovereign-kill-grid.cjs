'use strict';

const CAPABILITIES = new Set([
  'SOCIAL', 'DISCOVERY', 'MESSAGING', 'ADS_DELIVERY', 'ADS_BILLING', 'PULSE', 'AI_RECOMMENDATION', 'DATA_EXPORT'
]);
const SCOPE_TYPES = new Set([
  'MARKET', 'CAPABILITY', 'PAYMENT_PROFILE', 'GENOME_DIGEST', 'RELEASE_DIGEST', 'CELL', 'INGRESS'
]);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

function gridError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function normalizeRule(rule) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) throw gridError('SGF_KILL_GRID_RULE_INVALID');
  const id = String(rule.id == null ? '' : rule.id).trim();
  const state = String(rule.state == null ? '' : rule.state).trim().toUpperCase();
  const scopeType = String(rule.scopeType == null ? '' : rule.scopeType).trim().toUpperCase();
  const reasonCode = String(rule.reasonCode == null ? '' : rule.reasonCode).trim().toUpperCase();
  const authorityDigest = String(rule.authorityDigest == null ? '' : rule.authorityDigest).trim().toLowerCase();
  const issuedAtMs = Date.parse(rule.issuedAt);
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(id) || !['ACTIVE', 'LIFTED'].includes(state) ||
      !SCOPE_TYPES.has(scopeType) || !/^[A-Z][A-Z0-9_]{1,63}$/.test(reasonCode) ||
      !DIGEST_PATTERN.test(authorityDigest) || !Number.isFinite(issuedAtMs)) {
    throw gridError('SGF_KILL_GRID_RULE_INVALID');
  }

  let scopeValue = String(rule.scopeValue == null ? '' : rule.scopeValue).trim();
  if (scopeType === 'MARKET') {
    scopeValue = scopeValue.toUpperCase();
    if (!/^[A-Z]{2}$/.test(scopeValue)) throw gridError('SGF_KILL_GRID_RULE_INVALID');
  } else if (scopeType === 'CAPABILITY') {
    scopeValue = scopeValue.toUpperCase();
    if (!CAPABILITIES.has(scopeValue)) throw gridError('SGF_KILL_GRID_RULE_INVALID');
  } else if (scopeType === 'GENOME_DIGEST' || scopeType === 'RELEASE_DIGEST') {
    scopeValue = scopeValue.toLowerCase();
    if (!DIGEST_PATTERN.test(scopeValue)) throw gridError('SGF_KILL_GRID_RULE_INVALID');
  } else if (!scopeValue || scopeValue.length > 128) {
    throw gridError('SGF_KILL_GRID_RULE_INVALID');
  }

  return Object.freeze({
    id,
    state,
    scopeType,
    scopeValue,
    reasonCode,
    authorityDigest,
    issuedAt: new Date(issuedAtMs).toISOString()
  });
}

function matches(context, rule) {
  const c = context && typeof context === 'object' ? context : {};
  switch (rule.scopeType) {
    case 'MARKET': return String(c.marketId || '').trim().toUpperCase() === rule.scopeValue;
    case 'CAPABILITY': return String(c.capability || '').trim().toUpperCase() === rule.scopeValue;
    case 'PAYMENT_PROFILE': return String(c.paymentProfile || '').trim() === rule.scopeValue;
    case 'GENOME_DIGEST': return String(c.genomeDigest || '').trim().toLowerCase() === rule.scopeValue;
    case 'RELEASE_DIGEST': return String(c.releaseDigest || '').trim().toLowerCase() === rule.scopeValue;
    case 'CELL': return String(c.cell || '').trim() === rule.scopeValue;
    case 'INGRESS': return String(c.ingress || '').trim() === rule.scopeValue;
    default: return false;
  }
}

function evaluateKillGrid(context, rules) {
  if (!Array.isArray(rules)) throw gridError('SGF_KILL_GRID_RULES_INVALID');
  const activeMatches = [];
  for (const source of rules) {
    const rule = normalizeRule(source);
    if (rule.state === 'ACTIVE' && matches(context, rule)) activeMatches.push(rule);
  }
  activeMatches.sort((a, b) => a.id.localeCompare(b.id));
  return Object.freeze({
    revoked: activeMatches.length > 0,
    matches: Object.freeze(activeMatches),
    reasonCodes: Object.freeze(activeMatches.map((rule) => rule.reasonCode))
  });
}

module.exports = Object.freeze({ evaluateKillGrid });
