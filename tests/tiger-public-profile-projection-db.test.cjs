const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260820220500_public_profile_projection.sql');

function readMigration() {
  assert.equal(fs.existsSync(migrationPath), true, 'public profile projection migration must exist');
  return fs.readFileSync(migrationPath, 'utf8').toLowerCase();
}

test('public profile projection is authenticated-only and fails closed for non-active profiles', () => {
  const sql = readMigration();

  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_get_public_profile\s*\(/);
  assert.match(sql, /security\s+definer/);
  assert.match(sql, /account_status\s*=\s*'active'/);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.vvip_get_public_profile\(uuid\)\s+from\s+public/);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.vvip_get_public_profile\(uuid\)\s+from\s+anon/);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_get_public_profile\(uuid\)\s+to\s+authenticated/);
});

test('public profile projection returns only presentation-safe fields', () => {
  const sql = readMigration();

  const required = [
    "'profile_id'",
    "'display_name'",
    "'avatar_url'",
    "'business_name'",
    "'location'",
    "'specialization'",
    "'business_description'",
  ];

  for (const token of required) {
    assert.equal(sql.includes(token), true, `public profile projection must include ${token}`);
  }

  const forbiddenReturnKeys = [
    "'clerk_user_id'",
    "'email'",
    "'phone'",
    "'representative_phone'",
    "'account_status'",
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
