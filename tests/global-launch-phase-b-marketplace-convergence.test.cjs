const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260808224500_global_launch_phase_b_marketplace_convergence.sql'
);

function source() {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    'Phase B migration must exist before its contract can pass'
  );
  return fs.readFileSync(migrationPath, 'utf8');
}

test('phase B migration exists', () => {
  assert.equal(fs.existsSync(migrationPath), true);
});

test('phase B creates the dark-launch authorization substrate without seed rows', () => {
  const sql = source();
  for (const table of [
    'vvip_authority_roles',
    'vvip_authority_permissions',
    'vvip_authority_principals',
    'vvip_authority_assignments',
    'vvip_authority_assignment_revisions',
    'vvip_country_authority_seals',
    'vvip_authorization_envelope_audit',
    'vvip_authorization_audit_events'
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
  }
  assert.doesNotMatch(sql, /insert\s+into\s+public\.vvip_(?:authority|country)/i);
});

test('phase B creates the complete marketplace data model', () => {
  const sql = source();
  for (const table of [
    'vvip_marketplace_listings',
    'vvip_marketplace_listing_media',
    'vvip_marketplace_favorites',
    'vvip_marketplace_listing_audit'
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
  }
  assert.match(sql, /vvip_marketplace_one_cover_per_listing/i);
  assert.match(sql, /vvip_marketplace_favorites_listing_id_idx/i);
});

test('phase B keeps marketplace ownership Clerk-subject-only', () => {
  const sql = source();
  assert.match(sql, /auth\.jwt\(\)\s*->>\s*'sub'/i);
  assert.match(sql, /like\s+'user\\_%'/i);
  assert.doesNotMatch(sql, /owner_subject\s*=\s*.*email/i);
});

test('phase B keeps country and reviewer authority helpers private', () => {
  const sql = source();
  assert.match(sql, /vvip_private\.vvip_marketplace_country_is_active/i);
  assert.match(sql, /vvip_private\.vvip_marketplace_actor_can_review/i);
  assert.match(sql, /listing\.review/i);
  assert.match(sql, /listing\.manage/i);
});

test('phase B enforces final FORCE RLS and split media ownership policies', () => {
  const sql = source();
  for (const table of [
    'vvip_marketplace_listings',
    'vvip_marketplace_listing_media',
    'vvip_marketplace_favorites',
    'vvip_marketplace_listing_audit'
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
  }
  for (const policy of [
    'vvip_marketplace_media_owner_insert',
    'vvip_marketplace_media_owner_update',
    'vvip_marketplace_media_owner_delete'
  ]) {
    assert.match(sql, new RegExp(policy, 'i'));
  }
});

test('phase B creates a private bounded listing-media bucket and scoped storage policies', () => {
  const sql = source();
  assert.match(sql, /'listing-media'/i);
  assert.match(sql, /10485760/);
  assert.match(sql, /array\['image\/jpeg',\s*'image\/png',\s*'image\/webp'\]/i);
  assert.match(sql, /vvip_listing_media_storage_owner_insert/i);
  assert.match(sql, /vvip_listing_media_storage_read/i);
});

test('phase B exposes authenticated trusted review and keeps audit surfaces server-only', () => {
  const sql = source();
  assert.match(
    sql,
    /grant execute on function public\.vvip_marketplace_review_listing\(uuid,\s*text,\s*text\)\s+to authenticated/i
  );
  assert.match(
    sql,
    /revoke all privileges on table[\s\S]*vvip_marketplace_listing_audit[\s\S]*from anon, authenticated/i
  );
  assert.match(sql, /MARKETPLACE_AUDIT_APPEND_ONLY/);
});

test('phase B contains no destructive business-row primitive or seeded activation', () => {
  const sql = source();
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.vvip_/i);
  assert.doesNotMatch(sql, /values\s*\([^)]*'ACTIVE'[^)]*'VALID'/i);
});

test('phase B emits its content address', () => {
  source();
  const digest = crypto.createHash('sha256').update(fs.readFileSync(migrationPath)).digest('hex');
  assert.match(digest, /^[a-f0-9]{64}$/);
  console.log(`GLOBAL_LAUNCH_PHASE_B_SHA256=${digest}`);
});
