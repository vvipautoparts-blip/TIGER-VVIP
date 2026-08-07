'use strict';

const { scopeContained } = require('./sovereign-boardroom.js');

function freezeAdapter(id, allowedFields, maxAgeMs) {
  return Object.freeze({
    id,
    readOnly: true,
    allowedFields: Object.freeze([...allowedFields]),
    maxAgeMs,
  });
}

const ADAPTERS = Object.freeze({
  analytics: freezeAdapter('analytics', ['country', 'sector', 'metric', 'value', 'period'], 5 * 60 * 1000),
  finance: freezeAdapter('finance', ['country', 'currency', 'period', 'gross', 'net', 'tax', 'cost'], 10 * 60 * 1000),
  listings: freezeAdapter('listings', ['country', 'sector', 'listingCount', 'activeCount', 'conversionRate', 'period'], 10 * 60 * 1000),
  engineering: freezeAdapter('engineering', ['repository', 'branch', 'commitSha', 'qualityGate', 'codeql', 'dependencyReview', 'errorRate', 'observedVersion'], 5 * 60 * 1000),
  country_config: freezeAdapter('country_config', ['country', 'activeMarket', 'legalEntityCountry', 'residencyRegion', 'currency', 'taxRate', 'activationState'], 60 * 60 * 1000),
});

function result(ok, reasonCode, extra = {}) {
  return Object.freeze({ ok, reasonCode, ...extra });
}

function normalizeScope(scope) {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) return null;
  const normalized = {
    country: String(scope.country || '').trim(),
    sector: String(scope.sector || '').trim(),
    resource: String(scope.resource || '').trim(),
  };
  if (!normalized.country || !normalized.sector || !normalized.resource) return null;
  return Object.freeze(normalized);
}

function sanitizeParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return Object.freeze({});
  const output = {};
  for (const [key, value] of Object.entries(params)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) continue;
    if (typeof value === 'string' && value.length <= 256) output[key] = value;
    else if (Number.isFinite(value) || typeof value === 'boolean') output[key] = value;
  }
  return Object.freeze(output);
}

function createEvidenceQuery({ source, callerScope, requestedScope, params = {}, fields } = {}) {
  const adapter = ADAPTERS[source];
  if (!adapter) return result(false, 'UNKNOWN_SOURCE');
  if (fields !== undefined) return result(false, 'UNKNOWN_FIELD');
  const caller = normalizeScope(callerScope);
  const requested = normalizeScope(requestedScope);
  if (!caller || !requested) return result(false, 'SCOPE_INVALID');
  if (!scopeContained(caller, requested)) return result(false, 'SCOPE_EXPANSION_DENIED');
  return result(true, 'EVIDENCE_QUERY_READY', {
    value: Object.freeze({ source, scope: requested, params: sanitizeParams(params) }),
    adapter,
  });
}

function projectRow(row, adapter) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return Object.freeze({});
  const output = {};
  for (const field of adapter.allowedFields) {
    if (!Object.prototype.hasOwnProperty.call(row, field)) continue;
    const value = row[field];
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) output[field] = value;
  }
  return Object.freeze(output);
}

function rowMatchesScope(row, scope) {
  if (row.country && scope.country !== '*' && row.country !== scope.country) return false;
  if (row.sector && scope.sector !== '*' && row.sector !== scope.sector) return false;
  return true;
}

function classifyFreshness(observedAt, nowIso, maxAgeMs) {
  const observed = Date.parse(String(observedAt || ''));
  const now = Date.parse(String(nowIso || ''));
  if (!Number.isFinite(observed) || !Number.isFinite(now) || observed > now) return 'unknown';
  return now - observed <= maxAgeMs ? 'fresh' : 'stale';
}

async function executeEvidenceQuery({ query, sources = {}, now = () => new Date().toISOString() } = {}) {
  if (!query || !ADAPTERS[query.source]) return result(false, 'QUERY_INVALID');
  const adapter = ADAPTERS[query.source];
  const source = sources[query.source];
  if (typeof source !== 'function') return result(false, 'SOURCE_NOT_REGISTERED');

  let raw;
  try {
    raw = await source(Object.freeze({ scope: query.scope, params: query.params }));
  } catch {
    return result(false, 'SOURCE_UNAVAILABLE');
  }
  if (!raw || !Array.isArray(raw.rows)) return result(false, 'SOURCE_RESPONSE_INVALID');

  const projected = raw.rows.slice(0, 500).map((row) => projectRow(row, adapter));
  if (projected.some((row) => !rowMatchesScope(row, query.scope))) return result(false, 'SOURCE_SCOPE_VIOLATION');

  const observedAt = String(raw.observedAt || '');
  const nowIso = String(now());
  const freshness = classifyFreshness(observedAt, nowIso, adapter.maxAgeMs);
  const sourceId = `${query.source}:${query.scope.country}:${observedAt || 'unknown'}`;
  return result(true, 'EVIDENCE_READY', {
    evidence: Object.freeze({
      sourceId,
      source: query.source,
      scope: query.scope,
      observedAt,
      freshness,
      confidence: freshness === 'fresh' ? 0.95 : freshness === 'stale' ? 0.55 : 0.35,
      rows: Object.freeze(projected),
    }),
  });
}

function evaluateFinancialEvidence({ rows, freshness } = {}) {
  const required = ['country', 'currency', 'period', 'gross', 'net', 'tax', 'cost'];
  const complete = Array.isArray(rows) && rows.length > 0 && rows.every((row) => row && required.every((field) => Object.prototype.hasOwnProperty.call(row, field)));
  if (!complete || freshness !== 'fresh') return result(false, 'FINANCIAL_EVIDENCE_INCOMPLETE', { status: 'INSUFFICIENT_EVIDENCE' });
  return result(true, 'FINANCIAL_EVIDENCE_READY', { status: 'READY' });
}

module.exports = Object.freeze({
  ADAPTERS,
  createEvidenceQuery,
  executeEvidenceQuery,
  evaluateFinancialEvidence,
  classifyFreshness,
});
