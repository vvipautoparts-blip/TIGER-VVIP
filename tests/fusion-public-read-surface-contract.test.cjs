'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260816091500_sovereign_public_read_surface.sql');
const REPOSITORY = path.join(ROOT, 'scripts/runtime/vvip-marketplace-repository.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('public marketplace feed exposes canonical projection without raw-media metadata', () => {
  assert.equal(fs.existsSync(MIGRATION), true, 'safe public read migration must exist');
  const sql = read(MIGRATION);

  for (const token of [
    'create view public.vvip_marketplace_public_feed',
    'canonical_storage_path',
    "'CANONICAL'",
    'vvip_private.vvip_marketplace_country_is_active',
    'vvip_private.vvip_marketplace_canonical_media_is_readable',
    'vvip_marketplace_media_owner_read',
    'grant select on public.vvip_marketplace_public_feed to anon, authenticated'
  ]) {
    assert.ok(sql.includes(token), `missing safe public-read contract: ${token}`);
  }

  assert.match(sql, /revoke\s+select\s+on\s+public\.vvip_marketplace_listing_media\s+from\s+anon/is);
  assert.doesNotMatch(sql, /jsonb_build_object\([^)]*storage_path(?![^)]*canonical_storage_path)/is);
  assert.doesNotMatch(sql, /jsonb_build_object\([^)]*owner_subject/is);
});

test('browser public reads use the safe projection rather than the raw media relation', () => {
  const source = read(REPOSITORY);
  assert.match(source, /\.from\(["']vvip_marketplace_public_feed["']\)/);
  assert.doesNotMatch(source, /media:vvip_marketplace_listing_media\(/);
});
