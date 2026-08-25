'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const registry = require('../project-control/tsn26/invariants.v1.json');
const {
  scanActiveLegacyFinance,
  assertNoActiveLegacyFinance,
} = require('../scripts/tsn26/governance/legacy-finance-purge-guard.cjs');

test('TSN-26 invariant registry is fail-closed and has unique sovereign rules', () => {
  assert.equal(registry.schema_version, 'TIGER_TSN26_INVARIANTS_V1');
  assert.equal(registry.reference, 'TSN-26');
  assert.equal(registry.fail_closed, true);
  const ids = registry.invariants.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const required of ['FIN-001', 'FIN-002', 'FIN-003', 'FIN-007', 'AUD-001', 'PAY-001', 'AUTH-001', 'ATTR-001', 'EXP-001', 'AI-001', 'LEG-001', 'LEG-002', 'LEG-003']) {
    assert.ok(ids.includes(required), `missing invariant ${required}`);
  }
  assert.ok(registry.invariants.every((item) => item.severity === 'BLOCK_RELEASE'));
});

test('active repository has no forbidden parallel legacy financial implementation', () => {
  const root = path.resolve(__dirname, '..');
  const violations = scanActiveLegacyFinance(root);
  assert.deepEqual(violations, []);
  assert.doesNotThrow(() => assertNoActiveLegacyFinance(root));
});
