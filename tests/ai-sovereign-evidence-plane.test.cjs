'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ADAPTERS,
  createEvidenceQuery,
  executeEvidenceQuery,
  evaluateFinancialEvidence,
} = require('../scripts/ai/sovereign-evidence-plane.js');

const ownerScope = Object.freeze({ country: 'JO', sector: '*', resource: 'platform' });

test('evidence plane registers only approved read-only source adapters', () => {
  assert.deepEqual(Object.keys(ADAPTERS).sort(), ['analytics', 'country_config', 'engineering', 'finance', 'listings']);
  for (const adapter of Object.values(ADAPTERS)) {
    assert.equal(adapter.readOnly, true);
    assert.equal(Object.isFrozen(adapter), true);
    assert.ok(adapter.allowedFields.length > 0);
    for (const forbidden of ['password', 'token', 'secret', 'service_role', 'raw_jwt']) {
      assert.equal(adapter.allowedFields.includes(forbidden), false);
    }
  }
});

test('query scope may narrow but never widen caller scope', () => {
  assert.equal(createEvidenceQuery({ source: 'finance', callerScope: ownerScope, requestedScope: { country: '*', sector: '*', resource: 'platform' }, params: {} }).reasonCode, 'SCOPE_EXPANSION_DENIED');
  assert.equal(createEvidenceQuery({ source: 'finance', callerScope: ownerScope, requestedScope: { country: 'JO', sector: 'AUTOMOTIVE', resource: 'platform' }, params: {} }).ok, true);
});

test('unknown sources and client field-projection overrides fail closed', () => {
  assert.equal(createEvidenceQuery({ source: 'database.raw', callerScope: ownerScope, requestedScope: ownerScope, params: {} }).reasonCode, 'UNKNOWN_SOURCE');
  assert.equal(createEvidenceQuery({ source: 'analytics', callerScope: ownerScope, requestedScope: ownerScope, params: {}, fields: ['token'] }).reasonCode, 'UNKNOWN_FIELD');
});

test('adapter execution projects allowlisted fields, drops secrets and stamps source/freshness metadata', async () => {
  const query = createEvidenceQuery({ source: 'finance', callerScope: ownerScope, requestedScope: { country: 'JO', sector: '*', resource: 'platform' }, params: { period: '2026-08' } });
  const response = await executeEvidenceQuery({
    query: query.value,
    now: () => '2026-08-07T10:00:00.000Z',
    sources: {
      finance: async () => ({
        rows: [{ country: 'JO', currency: 'JOD', period: '2026-08', gross: 100, net: 84, tax: 16, cost: 20, service_role: 'drop-me', password: 'drop-me' }],
        observedAt: '2026-08-07T09:58:00.000Z',
      }),
    },
  });
  assert.equal(response.ok, true);
  assert.deepEqual(response.evidence.rows[0], { country: 'JO', currency: 'JOD', period: '2026-08', gross: 100, net: 84, tax: 16, cost: 20 });
  assert.equal(response.evidence.sourceId.startsWith('finance:'), true);
  assert.equal(response.evidence.freshness, 'fresh');
  assert.equal(JSON.stringify(response).includes('drop-me'), false);
});

test('adapter output outside requested country scope is rejected rather than silently filtered', async () => {
  const query = createEvidenceQuery({ source: 'listings', callerScope: ownerScope, requestedScope: { country: 'JO', sector: 'AUTOMOTIVE', resource: 'platform' }, params: {} });
  const response = await executeEvidenceQuery({ query: query.value, sources: { listings: async () => ({ rows: [{ country: 'SA', sector: 'AUTOMOTIVE', listingCount: 5 }], observedAt: '2026-08-07T10:00:00.000Z' }) } });
  assert.equal(response.ok, false);
  assert.equal(response.reasonCode, 'SOURCE_SCOPE_VIOLATION');
});

test('financial evidence requires complete currency/period/gross/net/tax/cost and fresh observation for material recommendation', () => {
  const fresh = evaluateFinancialEvidence({ rows: [{ country: 'JO', currency: 'JOD', period: '2026-08', gross: 100, net: 84, tax: 16, cost: 20 }], freshness: 'fresh' });
  assert.equal(fresh.ok, true);
  assert.equal(fresh.status, 'READY');

  const stale = evaluateFinancialEvidence({ rows: [{ country: 'JO', currency: 'JOD', period: '2026-08', gross: 100, net: 84, tax: 16, cost: 20 }], freshness: 'stale' });
  assert.equal(stale.status, 'INSUFFICIENT_EVIDENCE');

  const incomplete = evaluateFinancialEvidence({ rows: [{ country: 'JO', currency: 'JOD', period: '2026-08', gross: 100 }], freshness: 'fresh' });
  assert.equal(incomplete.status, 'INSUFFICIENT_EVIDENCE');
});
