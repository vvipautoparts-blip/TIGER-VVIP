'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260820002500_social_media_atomic_finalize_cleanup.sql'
);
const FINALIZER = path.join(ROOT, 'supabase/functions/social-media-finalizer/index.ts');

function readRequired(file, label) {
  assert.equal(fs.existsSync(file), true, `${label} must exist`);
  return fs.readFileSync(file, 'utf8');
}

test('DB finalization atomically closes the exact claimed event and canonical media transition', () => {
  const text = readRequired(MIGRATION, 'Gate 2 atomic-finalize hardening migration');
  assert.match(text, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_social_media_finalize_event\s*\(/i);
  assert.match(text, /target_event\s+uuid/i);
  assert.match(text, /v_event\.media_id\s*<>\s*target_media/i);
  assert.match(text, /v_event\.event_state\s*=\s*'completed'/i);
  assert.match(text, /event_state\s*=\s*'completed'/i);
  assert.match(text, /completed_at\s*=\s*statement_timestamp\s*\(\s*\)/i);
  assert.match(text, /vvip_social_media_finalize\s*\(/i);
  assert.match(text, /revoke\s+all[^;]*vvip_social_media_finalize\([^;]*from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i);
  assert.match(text, /grant\s+execute[^;]*vvip_social_media_finalize_event[^;]*to\s+service_role/i);
});

test('worker success path uses only the atomic finalization RPC', () => {
  const text = readRequired(FINALIZER, 'Gate 2 trusted finalizer');
  assert.match(text, /vvip_social_media_finalize_event/i);
  assert.doesNotMatch(text, /\.rpc\s*\(\s*['"]vvip_social_media_webhook_complete['"]/i);
});

test('expired-quarantine sweeper is bounded, skip-locked and replaces the unbounded signature', () => {
  const text = readRequired(MIGRATION, 'Gate 2 atomic-finalize hardening migration');
  assert.match(text, /drop\s+function\s+if\s+exists\s+public\.vvip_social_media_expire_quarantine\s*\(\s*\)/i);
  assert.match(text, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_social_media_expire_quarantine\s*\(\s*max_rows\s+integer/i);
  assert.match(text, /max_rows\s+not\s+between\s+1\s+and\s+500/i);
  assert.match(text, /for\s+update\s+skip\s+locked/i);
  assert.match(text, /limit\s+max_rows/i);
  assert.match(text, /grant\s+execute[^;]*vvip_social_media_expire_quarantine\(integer\)[^;]*to\s+service_role/i);
});
