'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const registry = require('../project-control/tsn26/invariants.v1.json');
const {
  FORBIDDEN_LEGACY_PATTERNS,
  isActiveSource,
  scanActiveLegacyFinance,
  assertNoActiveLegacyFinance,
} = require('../scripts/tsn26/governance/legacy-finance-purge-guard.cjs');

test('TSN-26 invariant registry is fail-closed and has unique sovereign rules', () => {
  assert.equal(registry.schema_version, 'TIGER_TSN26_INVARIANTS_V1');
  assert.equal(registry.reference, 'TSN-26');
  assert.equal(registry.fail_closed, true);
  const ids = registry.invariants.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const required of [
    'FIN-001', 'FIN-002', 'FIN-003', 'FIN-007', 'FIN-009',
    'AUD-001', 'PAY-001', 'AUTH-001', 'CRYPTO-001', 'POL-001',
    'ATTR-001', 'EXP-001', 'CTY-001', 'AI-001', 'AI-002',
    'OBS-001', 'RPT-001', 'LEG-001', 'LEG-002', 'LEG-003',
  ]) {
    assert.ok(ids.includes(required), `missing invariant ${required}`);
  }
  assert.ok(registry.invariants.every((item) => item.severity === 'BLOCK_RELEASE'));
});

test('purge guard covers every active executable/configuration surface, not only src and scripts', () => {
  for (const file of [
    'index.html',
    'auth-clerk-index.js',
    'styles/tiger-social/core-shell.css',
    'services/media-finalizer/src/handler.js',
    'workers/media/f05-heif-worker.js',
    'tools/vvip_public_release.py',
    'project-control/production-handover/current-authority.v1.json',
    '.github/workflows/vvip-quality-gate.yml',
    'config/tsn26/financial-constitution.v1.json',
  ]) {
    assert.equal(isActiveSource(file), true, `expected active purge coverage for ${file}`);
  }

  for (const file of [
    'docs/historical-note.md',
    'reports/old-finance.json',
    'archive/legacy-finance.js',
    'tests/legacy-fixture.cjs',
    'supabase/migrations/20200101000000_historical.sql',
    'prisma/migrations/20200101000000_historical/migration.sql',
    'scripts/tsn26/governance/legacy-finance-purge-guard.cjs',
  ]) {
    assert.equal(isActiveSource(file), false, `expected historical/policy exclusion for ${file}`);
  }
});

test('purge guard explicitly blocks superseded treasury split vocabulary', () => {
  const ids = new Set(FORBIDDEN_LEGACY_PATTERNS.map((entry) => entry.id));
  assert.ok(ids.has('LEGACY_DIRECT_DISTRIBUTION'));
  assert.ok(ids.has('LEGACY_PLATFORM_TREASURY'));
});

test('active repository has no forbidden parallel legacy financial implementation', () => {
  const root = path.resolve(__dirname, '..');
  const violations = scanActiveLegacyFinance(root);
  assert.deepEqual(violations, []);
  assert.doesNotThrow(() => assertNoActiveLegacyFinance(root));
});
