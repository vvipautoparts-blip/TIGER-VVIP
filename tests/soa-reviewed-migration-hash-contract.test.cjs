'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const migrationRel = 'supabase/migrations/20260813170000_soa_owner_security_foundation.sql';
const migration = path.join(root, migrationRel);
const scanner = path.join(root, 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh');
const expected = 'df2a94ca4c967a90253bd87775c5c69dcdc48f7505e95714ee58b918a6d47c18';

test('SOA-01 reviewed migration bytes match the content-addressed approval', () => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(migration)).digest('hex');
  assert.equal(actual, expected, `SOA-01 reviewed hash drift: expected=${expected} actual=${actual}`);
});

test('Steel Shield recognizes only the exact SOA-01 migration as reviewed', () => {
  const result = spawnSync('bash', [scanner], { cwd: root, encoding: 'utf8', env: process.env });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.equal(result.status, 0, output);
  assert.ok(
    output.includes(`REVIEWED_BASELINE:${migrationRel}`),
    `missing exact reviewed-baseline marker for ${migrationRel}\n${output}`,
  );
});
