'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const migrationRel = 'supabase/migrations/20260808134000_lc04_production_legacy_rpc_hardening.sql';
const migration = path.join(root, migrationRel);
const scanner = path.join(root, 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh');
const expected = '86cd92e65b1d7294158798b6828d33fe7c346946ff9d955371fc55f5f13388fa';

test('LC04 reviewed migration bytes match the content-addressed approval', () => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(migration)).digest('hex');
  assert.equal(actual, expected, `LC04 reviewed hash drift: expected=${expected} actual=${actual}`);
});

test('Steel Shield recognizes the exact LC04 migration as reviewed', () => {
  const result = spawnSync('bash', [scanner], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.equal(result.status, 0, output);
  assert.ok(
    output.includes(`REVIEWED_BASELINE:${migrationRel}`),
    `missing exact reviewed-baseline marker for ${migrationRel}\n${output}`,
  );
});
