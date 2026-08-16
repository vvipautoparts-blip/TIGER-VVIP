'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(
  path.resolve(__dirname, '../supabase/migrations/20260816104500_retire_legacy_profile_rpc.sql'),
  'utf8'
);

test('legacy profile resolver RPC is revoked and dropped without cascade', () => {
  assert.match(migration, /revoke\s+all\s+on\s+function\s+public\.vvip_resolve_own_profile\(text\)\s+from\s+public,\s*anon,\s*authenticated/i);
  assert.match(migration, /drop\s+function\s+if\s+exists\s+public\.vvip_resolve_own_profile\(text\)/i);
  assert.doesNotMatch(migration, /cascade/i);
});
