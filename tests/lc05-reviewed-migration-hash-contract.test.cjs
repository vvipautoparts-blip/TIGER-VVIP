'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const migrationRel = 'supabase/migrations/20260808135000_lc05_credential_surface_isolation.sql';
const migration = path.join(root, migrationRel);
const scanner = path.join(root, 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh');
const expected = 'ebf13f51f5e1e11e1c8224126f8e812fd8e5c79911c6827f328be19192424e3f';

test('LC05 reviewed migration bytes match the content-addressed approval', () => {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(migration)).digest('hex');
  assert.equal(actual, expected, `LC05 reviewed hash drift: expected=${expected} actual=${actual}`);
});

test('Steel Shield recognizes the exact LC05 migration as reviewed', () => {
  const result = spawnSync('bash', [scanner], { cwd: root, encoding: 'utf8', env: process.env });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.equal(result.status, 0, output);
  assert.ok(
    output.includes(`REVIEWED_BASELINE:${migrationRel}`),
    `missing exact reviewed-baseline marker for ${migrationRel}\n${output}`,
  );
});
