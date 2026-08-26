'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  INVARIANTS,
  getInvariant,
  assertInvariantRegistryIntegrity,
} = require('../src/tsn26/invariant-registry.cjs');

test('TSN-26 invariant registry is internally valid and unique', () => {
  assert.equal(assertInvariantRegistryIntegrity(), true);
  const ids = Object.values(INVARIANTS).map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('critical financial invariants are fail-closed and mandatory', () => {
  for (const id of ['FIN-001', 'FIN-002', 'FIN-003', 'FIN-004', 'FIN-005', 'FIN-006']) {
    const invariant = getInvariant(id);
    assert.equal(invariant.domain, 'FINANCE');
    assert.equal(invariant.severity, 'CRITICAL');
    assert.equal(invariant.enforcement, 'FAIL_CLOSED');
  }
});

test('root authority, audit, payment replay, exposure, AI and release boundaries are registered', () => {
  for (const id of ['AUTH-001', 'AUD-001', 'PAY-001', 'EXP-001', 'AI-001', 'REL-001', 'REL-002', 'LEGACY-001']) {
    assert.ok(getInvariant(id));
  }
  const exactSource = getInvariant('REL-001');
  assert.equal(exactSource.domain, 'RELEASE');
  assert.equal(exactSource.enforcement, 'FAIL_CLOSED');
  assert.match(exactSource.rule, /exact.*source.*commit|source.*commit.*exact/i);

  const targetAncestry = getInvariant('REL-002');
  assert.equal(targetAncestry.domain, 'RELEASE');
  assert.equal(targetAncestry.enforcement, 'FAIL_CLOSED');
  assert.match(targetAncestry.rule, /target-base ancestry|target.*ancestry/i);
  assert.match(targetAncestry.rule, /repository-governance proof/i);
});

test('legacy financial fallback is explicitly forbidden', () => {
  const invariant = getInvariant('LEGACY-001');
  assert.equal(invariant.enforcement, 'FAIL_CLOSED');
  assert.match(invariant.rule, /legacy|fallback/i);
});

test('unknown invariant ids fail closed', () => {
  assert.throws(() => getInvariant('UNKNOWN-999'), /TSN26_UNKNOWN_INVARIANT/);
});
