'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260816103000_sovereign_profile_authority_convergence.sql');

function read(file) { return fs.readFileSync(file, 'utf8'); }

test('legacy profiles bridge has no Supabase Auth ownership authority', () => {
  assert.equal(fs.existsSync(MIGRATION), true, 'profile authority convergence migration must exist');
  const sql = read(MIGRATION);

  for (const policy of [
    'Supabase users can insert own profile',
    'Supabase users can read own profile',
    'Supabase users can update own profile'
  ]) {
    assert.ok(sql.includes(`drop policy if exists "${policy}"`), `legacy policy not retired: ${policy}`);
  }

  assert.match(sql, /revoke\s+insert,\s*update,\s*delete\s+on\s+public\.profiles\s+from\s+authenticated/i);
  assert.match(sql, /create policy "Clerk users can read own profile"[\s\S]+\(select public\.vvip_marketplace_actor_id\(\)\)\s*=\s*clerk_user_id/i);
  assert.doesNotMatch(sql, /auth\.uid\(\)/i);
});
