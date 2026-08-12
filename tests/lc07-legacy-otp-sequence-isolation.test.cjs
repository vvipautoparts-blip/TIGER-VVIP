'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const MIGRATION_REL = 'supabase/migrations/20260812070600_lc07_legacy_otp_sequence_isolation.sql';
const MIGRATION_PATH = path.join(__dirname, '..', MIGRATION_REL);
const LC05_VERSION = '20260808135000';

function migrationText() {
  return fs.existsSync(MIGRATION_PATH) ? fs.readFileSync(MIGRATION_PATH, 'utf8') : '';
}

function migrationVersion(relativePath) {
  const filename = path.basename(relativePath);
  const match = filename.match(/^(\d{14})_/);
  assert.ok(match, `migration filename must begin with a 14-digit version: ${filename}`);
  return match[1];
}

test('LC07 migration version parser enforces canonical fixed-width timestamps', () => {
  assert.equal(
    migrationVersion('supabase/migrations/20260812070600_example.sql'),
    '20260812070600',
  );
  assert.throws(
    () => migrationVersion('supabase/migrations/999_example.sql'),
    /14-digit version/,
  );
});

test('LC07 is a forward no-synthesis migration after LC05 credential isolation', () => {
  assert.equal(
    fs.existsSync(MIGRATION_PATH),
    true,
    `missing forward migration: ${MIGRATION_REL}`,
  );
  assert.ok(
    migrationVersion(MIGRATION_REL) > LC05_VERSION,
    'LC07 must sort after LC05 credential isolation',
  );
});

test('LC07 safely handles absence and revokes every browser privilege when the legacy OTP sequence exists', () => {
  const sql = migrationText();

  assert.match(sql, /to_regclass\s*\(\s*'public\.otp_codes_id_seq'\s*\)\s+is\s+null\s+then/i);
  assert.match(
    sql,
    /revoke\s+all\s+privileges\s+on\s+sequence\s+public\.otp_codes_id_seq\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  );
});

test('LC07 does not synthesize or broaden any OTP surface', () => {
  const sql = migrationText();

  assert.doesNotMatch(sql, /create\s+(?:table|sequence|policy)/i);
  assert.doesNotMatch(sql, /grant\s+/i);
  assert.doesNotMatch(sql, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.doesNotMatch(sql, /phone_otp_challenges/i);
  assert.doesNotMatch(sql, /alter\s+table/i);
  assert.doesNotMatch(sql, /\bnot\s+null\b/i);
});
