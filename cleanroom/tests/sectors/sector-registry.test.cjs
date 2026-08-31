'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CURRENT_OWNER_POLICY } = require('../../domain/policy/current-owner-policy.cjs');
const { createSectorRegistry } = require('../../domain/sectors/sector-registry.cjs');

test('seeds exactly ten current sectors and preserves immutable ids during rename', () => {
  const registry = createSectorRegistry(CURRENT_OWNER_POLICY.sectors);
  assert.equal(registry.listActive().length, 10);
  const before = registry.get('SEC-003');
  const renamed = registry.rename('SEC-003', 'مواد وتموين');
  assert.equal(before.id, 'SEC-003');
  assert.equal(renamed.id, 'SEC-003');
  assert.equal(renamed.labelAr, 'مواد وتموين');
});

test('unknown or inactive sector fails closed', () => {
  const registry = createSectorRegistry(CURRENT_OWNER_POLICY.sectors);
  assert.throws(() => registry.requireActive('SEC-999'), /SECTOR_NOT_ACTIVE/);
  registry.setActive('SEC-010', false);
  assert.throws(() => registry.requireActive('SEC-010'), /SECTOR_NOT_ACTIVE/);
});
