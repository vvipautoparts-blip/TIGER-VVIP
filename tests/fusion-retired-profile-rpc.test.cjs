'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(
  path.resolve(__dirname, '../supabase/migrations/20260816104500_retire_legacy_profile_rpc.sql'),
  'utf8'
);

test('legacy profile resolver RPC retirement is idempotent and avoids cascade', () => {
  const absentGuardPattern = /if\s+to_regprocedure\('public\.vvip_resolve_own_profile\(text\)'\)\s+is\s+null\s+then/i;
  const elsePattern = /else/i;
  const revokePattern = /execute\s+'revoke\s+all\s+on\s+function\s+public\.vvip_resolve_own_profile\(text\)\s+from\s+public,\s*anon,\s*authenticated'/i;
  const dropPattern = /execute\s+'drop\s+function\s+if\s+exists\s+public\.vvip_resolve_own_profile\(text\)'/i;

  assert.match(migration, absentGuardPattern);
  assert.match(migration, revokePattern);
  assert.match(migration, dropPattern);

  const guardIndex = migration.search(absentGuardPattern);
  const elseIndex = migration.search(elsePattern);
  const revokeIndex = migration.search(revokePattern);
  const dropIndex = migration.search(dropPattern);
  const endIfIndex = migration.search(/end\s+if\s*;/i);

  assert.ok(guardIndex >= 0 && guardIndex < elseIndex, 'absence guard must precede the existing-function branch');
  assert.ok(elseIndex < revokeIndex, 'REVOKE must execute only when the legacy RPC exists');
  assert.ok(revokeIndex < dropIndex, 'privileges must be revoked before the legacy RPC is dropped');
  assert.ok(dropIndex < endIfIndex, 'DROP must remain inside the guarded existing-function branch');
  assert.doesNotMatch(migration, /cascade/i);
});
