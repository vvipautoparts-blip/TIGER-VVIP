'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const migrationRel = 'supabase/migrations/20260808180000_lc06_rls_performance_hardening.sql';
const migration = path.join(root, migrationRel);
const scanner = path.join(root, 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh');
const expected = 'ed34063e2f3ba32434e08b45c1f1e415115c092ffb07c6cb810ff974ed467f35';

test('LC06 reviewed migration bytes match the content-addressed approval', () => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(migration)).digest('hex');
  assert.equal(actual, expected, `LC06 reviewed hash drift: expected=${expected} actual=${actual}`);
});

test('Steel Shield recognizes the exact LC06 migration as reviewed', () => {
  const result = spawnSync('bash', [scanner], { cwd: root, encoding: 'utf8', env: process.env });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.equal(result.status, 0, output);
  assert.ok(
    output.includes(`REVIEWED_BASELINE:${migrationRel}`),
    `missing exact reviewed-baseline marker for ${migrationRel}\n${output}`,
  );
});
