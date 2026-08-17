'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const scanner = path.join(root, 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh');
const reviewed = [
  {
    rel: 'supabase/migrations/20260808134000_lc04_production_legacy_rpc_hardening.sql',
    expected: '86cd92e65b1d7294158798b6828d33fe7c346946ff9d955371fc55f5f13388fa',
  },
  {
    rel: 'supabase/migrations/20260817060000_retire_lc04_legacy_profile_helper_graph.sql',
    expected: '692c3c54f636583b623935b18df1263b31d10ca32d900144fb5a84209b2896c2',
  },
];

test('LC04 reviewed migration bytes match their content-addressed approvals', () => {
  for (const item of reviewed) {
    const actual = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, item.rel)))
      .digest('hex');
    assert.equal(actual, item.expected, `LC04 reviewed hash drift: ${item.rel} expected=${item.expected} actual=${actual}`);
  }
});

test('Steel Shield recognizes both exact LC04 migrations as reviewed', () => {
  const result = spawnSync('bash', [scanner], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.equal(result.status, 0, output);
  for (const item of reviewed) {
    assert.ok(
      output.includes(`REVIEWED_BASELINE:${item.rel}`),
      `missing exact reviewed-baseline marker for ${item.rel}\n${output}`,
    );
  }
});
