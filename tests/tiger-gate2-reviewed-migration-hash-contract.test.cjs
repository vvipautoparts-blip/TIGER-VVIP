'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const scanner = path.join(root, 'scripts/security/p08-steel-shield/scan-dangerous-sql.sh');

const reviewed = new Map([
  ['supabase/migrations/20260820002000_social_media_canonical_authority.sql', '110e5ebc1fa2b1f7eb64dbc85b521902ac10e3cb4452ef9c8e14ea91b6848c3c'],
  ['supabase/migrations/20260820002500_social_media_atomic_finalize_cleanup.sql', '363df5db37b97b7784d58a72bb64e08f49ae56e598afd01623b2062aa3afe333'],
  ['supabase/migrations/20260820002700_social_media_durable_quarantine_purge.sql', '339bdec95ec4310d1098b6fdfbaa91fd281ef1c3041b26a7cb2c592b6ff8136c'],
  ['supabase/migrations/20260820002900_social_media_unified_quarantine_cleanup.sql', '904aa34c69ba10b2cf04f25485936ef9c61bf72468cbb062973be469d0475ed8'],
  ['supabase/migrations/20260820003100_social_media_reservation_content_identity_hardening.sql', '23b0674202780fdaaab93387db5b343384e700719dc7f58188acdd8115e57d87'],
  ['supabase/migrations/20260820003300_social_media_storage_event_ingress.sql', 'b565b1e5fcc210e492c54bdfb036accf8ebf81a53609e2d4abf86afcf7fbc9dd'],
  ['supabase/migrations/20260820003500_social_media_worker_dispatch.sql', 'eff9c85c8674c8191e6951841fb4d329fedb7ebce8f958b5effff6734d25c4f5'],
]);

for (const [migrationRel, expected] of reviewed) {
  test(`Gate 2 reviewed migration bytes remain exact: ${path.basename(migrationRel)}`, () => {
    const actual = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, migrationRel)))
      .digest('hex');
    assert.equal(actual, expected, `Gate 2 reviewed hash drift: expected=${expected} actual=${actual}`);
  });
}

test('Steel Shield recognizes every exact Gate 2 migration as a reviewed baseline', () => {
  const result = spawnSync('bash', [scanner], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.equal(result.status, 0, output);
  for (const migrationRel of reviewed.keys()) {
    assert.ok(
      output.includes(`REVIEWED_BASELINE:${migrationRel}`),
      `missing exact reviewed-baseline marker for ${migrationRel}\n${output}`,
    );
  }
  assert.match(output, /SUMMARY:CRITICAL=0 HIGH=0/);
});
