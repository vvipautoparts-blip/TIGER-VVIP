const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260820220500_public_profile_projection.sql');

function readMigration() {
  assert.equal(fs.existsSync(migrationPath), true, 'public profile projection migration must exist');
  return fs.readFileSync(migrationPath, 'utf8').toLowerCase();
}

test('public profile projection uses a dedicated current-authority read model, never retired public.profiles', () => {
  const sql = readMigration();

  assert.match(sql, /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.vvip_social_profile_projection\s*\(/);
  assert.match(sql, /profile_id\s+uuid\s+primary\s+key\s+default\s+gen_random_uuid\(\)/);
  assert.match(sql, /subject\s+text\s+not\s+null\s+unique/);
  assert.match(sql, /profile_state\s+text\s+not\s+null\s+default\s+'active'/);
  assert.doesNotMatch(sql, /\bfrom\s+public\.profiles\b/);
  assert.doesNotMatch(sql, /\bjoin\s+public\.profiles\b/);
});

test('projection storage is FORCE RLS and browser roles have no direct table authority', () => {
  const sql = readMigration();

  assert.match(sql, /alter\s+table\s+public\.vvip_social_profile_projection\s+enable\s+row\s+level\s+security/);
  assert.match(sql, /alter\s+table\s+public\.vvip_social_profile_projection\s+force\s+row\s+level\s+security/);
  assert.match(sql, /revoke\s+all\s+on\s+table\s+public\.vvip_social_profile_projection\s+from\s+public/);
  assert.match(sql, /revoke\s+all\s+on\s+table\s+public\.vvip_social_profile_projection\s+from\s+anon/);
  assert.match(sql, /revoke\s+all\s+on\s+table\s+public\.vvip_social_profile_projection\s+from\s+authenticated/);
});

test('public profile RPC is authenticated-only, opaque-id based, and fails closed for non-active profiles', () => {
  const sql = readMigration();
  const securityLine = sql.split('\n').find((line) => line.includes('security definer')) || '';

  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_get_public_profile\s*\(\s*p_profile_id\s+uuid\s*\)/);
  assert.match(securityLine, /security\s+definer.*set\s+search_path\s*=\s*pg_catalog/);
  assert.match(sql, /p\.profile_state\s*=\s*'active'/);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.vvip_get_public_profile\(uuid\)\s+from\s+public/);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.vvip_get_public_profile\(uuid\)\s+from\s+anon/);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_get_public_profile\(uuid\)\s+to\s+authenticated/);
});

test('public profile RPC returns only presentation-safe fields and never exposes identity authority', () => {
  const sql = readMigration();

  const requiredReturnKeys = [
    "'profile_id'",
    "'display_name'",
    "'avatar_url'",
    "'business_name'",
    "'location'",
    "'specialization'",
    "'business_description'",
  ];

  for (const token of requiredReturnKeys) {
    assert.equal(sql.includes(token), true, `public profile projection must include ${token}`);
  }

  const forbiddenReturnKeys = [
    "'subject'",
    "'clerk_user_id'",
    "'email'",
    "'phone'",
    "'representative_phone'",
    "'account_status'",
    "'profile_state'",
    "'subscription'",
    "'trial_start_at'",
    "'trial_end_at'",
    "'role'",
    "'is_approved'",
    "'superior_id'",
    "'company_code'",
  ];

  for (const token of forbiddenReturnKeys) {
    assert.equal(sql.includes(token), false, `public profile projection must not return ${token}`);
  }
});
