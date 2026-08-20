'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260820002700_social_media_durable_quarantine_purge.sql'
);

function sql() {
  assert.equal(fs.existsSync(MIGRATION), true, 'durable quarantine purge migration must exist');
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('expired quarantine remains retryable until physical storage deletion is acknowledged', () => {
  const text = sql();
  assert.match(text, /quarantine_purged_at\s+timestamptz/i);
  assert.match(text, /quarantine_purge_attempt_count\s+smallint/i);
  assert.match(text, /quarantine_purge_next_attempt_at\s+timestamptz/i);
  assert.match(text, /media_state\s+in\s*\(\s*'reserved'\s*,\s*'quarantined'\s*,\s*'expired'\s*\)/i);
  assert.match(text, /quarantine_purged_at\s+is\s+null/i);
  assert.match(text, /for\s+update\s+skip\s+locked/i);
});

test('service role alone can acknowledge physical quarantine purge', () => {
  const text = sql();
  assert.match(text, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_social_media_mark_quarantine_purged\s*\(/i);
  assert.match(text, /quarantine_purged_at\s*=\s*statement_timestamp\s*\(\s*\)/i);
  assert.match(text, /grant\s+execute[^;]*vvip_social_media_mark_quarantine_purged[^;]*to\s+service_role/i);
  assert.doesNotMatch(text, /grant\s+execute[^;]*vvip_social_media_mark_quarantine_purged[^;]*to\s+authenticated/i);
});

test('purge retry schedule is database-owned and bounded away from hot looping', () => {
  const text = sql();
  assert.match(text, /quarantine_purge_attempt_count\s*=\s*asset\.quarantine_purge_attempt_count\s*\+\s*1/i);
  assert.match(text, /quarantine_purge_next_attempt_at\s*=\s*statement_timestamp\s*\(\s*\)\s*\+/i);
  assert.match(text, /interval\s+'30 seconds'/i);
  assert.match(text, /interval\s+'1 hour'/i);
  assert.match(text, /random\s*\(\s*\)/i);
});
