'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260820003500_social_media_worker_dispatch.sql');
const RECOVERY_MIGRATION = path.join(ROOT, 'supabase/migrations/20260820003700_social_media_stale_worker_recovery.sql');
const FINALIZER = path.join(ROOT, 'supabase/functions/social-media-finalizer/index.ts');

function sql() {
  assert.equal(fs.existsSync(MIGRATION), true, `Gate 2 worker-dispatch migration missing: ${MIGRATION}`);
  return fs.readFileSync(MIGRATION, 'utf8');
}

function recoverySql() {
  assert.equal(
    fs.existsSync(RECOVERY_MIGRATION),
    true,
    `Gate 2 stale-worker recovery migration missing: ${RECOVERY_MIGRATION}`,
  );
  return fs.readFileSync(RECOVERY_MIGRATION, 'utf8');
}

test('dispatcher uses pg_cron + pg_net and never embeds a project credential', () => {
  const text = sql();
  assert.match(text, /create\s+extension\s+if\s+not\s+exists\s+pg_cron/i);
  assert.match(text, /create\s+extension\s+if\s+not\s+exists\s+pg_net/i);
  assert.match(text, /net\.http_post\s*\(/i);
  assert.match(text, /cron\.schedule\s*\(/i);
  assert.match(text, /5\s+seconds/i);
  assert.doesNotMatch(text, /https:\/\/[a-z0-9-]+\.supabase\.co/i);
  assert.doesNotMatch(text, /eyJ[a-zA-Z0-9_-]{20,}/);
});

test('dispatcher reads scoped runtime URL and worker secret from Vault only when due work exists', () => {
  const text = sql();
  assert.match(text, /vvip_social_media_webhook_inbox/i);
  assert.match(text, /event_state\s*=\s*'pending'/i);
  assert.match(text, /next_attempt_at\s*<=\s*statement_timestamp\(\)/i);
  assert.match(text, /vault\.decrypted_secrets/i);
  assert.match(text, /tiger_social_media_worker_url/i);
  assert.match(text, /tiger_media_worker_secret/i);
  assert.match(text, /x-tiger-worker-secret/i);
});

test('dispatcher is not browser executable and quietly fails closed when runtime secrets are absent', () => {
  const text = sql();
  assert.match(text, /if\s+v_worker_url\s+is\s+null\s+or\s+v_worker_secret\s+is\s+null\s+then[\s\S]{0,120}return\s+null/i);
  assert.match(text, /revoke\s+all\s+on\s+function\s+public\.vvip_social_media_dispatch_worker\(\)[^;]*from\s+public,\s*anon,\s*authenticated,\s*service_role/i);
  assert.doesNotMatch(text, /grant\s+execute[^;]*vvip_social_media_dispatch_worker[^;]*to\s+(?:anon|authenticated)/i);
});

test('stale processing claims are recovered with bounded SKIP LOCKED semantics', () => {
  const text = recoverySql();
  assert.match(text, /event_state\s*=\s*'processing'/i);
  assert.match(text, /locked_at\s*<=\s*statement_timestamp\(\)\s*-\s*interval\s*'5 minutes'/i);
  assert.match(text, /for\s+update\s+skip\s+locked/i);
  assert.match(text, /limit\s+max_rows/i);
  assert.match(text, /event_state\s*=\s*'pending'/i);
  assert.match(text, /next_attempt_at\s*=\s*statement_timestamp\(\)/i);
});

test('stale workers cannot finalize or fail a newer claim generation', () => {
  const text = recoverySql();
  assert.match(text, /expected_attempt_count\s+smallint/i);
  assert.match(text, /attempt_count\s*<>\s*expected_attempt_count/i);
  assert.match(text, /SOCIAL_MEDIA_WORKER_CLAIM_STALE/i);

  const finalizer = fs.readFileSync(FINALIZER, 'utf8');
  assert.match(finalizer, /expected_attempt_count:\s*claim\.attempt_count/);
});
