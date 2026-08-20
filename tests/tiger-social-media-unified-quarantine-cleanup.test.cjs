'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260820002900_social_media_unified_quarantine_cleanup.sql'
);

function sql() {
  assert.equal(fs.existsSync(MIGRATION), true, 'unified quarantine cleanup migration must exist');
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('cleanup claims both successful READY source remnants and expired abandoned uploads', () => {
  const text = sql();
  assert.match(text, /vvip_social_media_claim_quarantine_cleanup/i);
  assert.match(text, /media_state\s*=\s*'ready'/i);
  assert.match(text, /upload_lease_expires_at\s*<=\s*statement_timestamp\s*\(\s*\)/i);
  assert.match(text, /quarantine_purged_at\s+is\s+null/i);
  assert.match(text, /for\s+update\s+skip\s+locked/i);
  assert.match(text, /limit\s+max_rows/i);
});

test('cleanup does not demote READY media when it schedules source-object deletion', () => {
  const text = sql();
  assert.match(text, /case\s+when\s+asset\.media_state\s*=\s*'ready'\s+then\s+'ready'/i);
});

test('purge acknowledgement accepts only READY or EXPIRED media and exact source path', () => {
  const text = sql();
  assert.match(text, /media_state\s+not\s+in\s*\(\s*'ready'\s*,\s*'expired'\s*\)/i);
  assert.match(text, /quarantine_storage_path\s*<>\s*expected_quarantine_path/i);
  assert.match(text, /quarantine_purged_at\s*=\s*statement_timestamp\s*\(\s*\)/i);
});
