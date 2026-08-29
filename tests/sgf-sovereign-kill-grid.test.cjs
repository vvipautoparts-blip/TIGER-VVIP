'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const grid = require('../scripts/sovereignty/sovereign-kill-grid.cjs');
const D = (c) => `sha256:${c.repeat(64)}`;
const context = (overrides = {}) => ({
  marketId: 'US', capability: 'PULSE', paymentProfile: 'stripe-us-v1',
  genomeDigest: D('1'), releaseDigest: D('2'), cell: 'americas-1', ingress: 'edge-us-1', ...overrides
});
const revoke = (id, scopeType, scopeValue, overrides = {}) => ({
  id, state: 'ACTIVE', scopeType, scopeValue,
  reasonCode: 'OWNER_SECURITY_STOP', authorityDigest: D('a'), issuedAt: '2026-08-29T10:00:00.000Z', ...overrides
});

test('market revocation blocks only the matching market', () => {
  const rules = [revoke('r1', 'MARKET', 'US')];
  assert.equal(grid.evaluateKillGrid(context(), rules).revoked, true);
  assert.equal(grid.evaluateKillGrid(context({ marketId: 'DE' }), rules).revoked, false);
});

test('capability revocation can kill one capability globally', () => {
  const rules = [revoke('r2', 'CAPABILITY', 'PULSE')];
  assert.equal(grid.evaluateKillGrid(context({ marketId: 'US' }), rules).revoked, true);
  assert.equal(grid.evaluateKillGrid(context({ marketId: 'DE' }), rules).revoked, true);
  assert.equal(grid.evaluateKillGrid(context({ capability: 'SOCIAL' }), rules).revoked, false);
});

test('release genome payment cell and ingress revocations are exact-scope', () => {
  const cases = [
    ['RELEASE_DIGEST', D('2')], ['GENOME_DIGEST', D('1')], ['PAYMENT_PROFILE', 'stripe-us-v1'],
    ['CELL', 'americas-1'], ['INGRESS', 'edge-us-1']
  ];
  for (const [scopeType, scopeValue] of cases) {
    const result = grid.evaluateKillGrid(context(), [revoke(`r-${scopeType}`, scopeType, scopeValue)]);
    assert.equal(result.revoked, true, scopeType);
  }
});

test('lifted revocation does not block and invalid rules fail closed', () => {
  assert.equal(grid.evaluateKillGrid(context(), [revoke('r3', 'MARKET', 'US', { state: 'LIFTED' })]).revoked, false);
  assert.throws(() => grid.evaluateKillGrid(context(), [revoke('r4', 'UNKNOWN', 'US')]), { code: 'SGF_KILL_GRID_RULE_INVALID' });
  assert.throws(() => grid.evaluateKillGrid(context(), [revoke('r5', 'RELEASE_DIGEST', 'latest')]), { code: 'SGF_KILL_GRID_RULE_INVALID' });
});
