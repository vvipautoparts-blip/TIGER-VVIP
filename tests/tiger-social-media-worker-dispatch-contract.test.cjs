'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260820003500_social_media_worker_dispatch.sql');

function sql() {
  assert.equal(fs.existsSync(MIGRATION), true, `Gate 2 worker-dispatch migration missing: ${MIGRATION}`);
  return fs.readFileSync(MIGRATION, 'utf8');
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

test('dispatcher is not browser executable and fails closed when runtime secrets are absent', () => {
  const text = sql();
  assert.match(text, /raise\s+exception\s+'SOCIAL_MEDIA_WORKER_RUNTIME_NOT_CONFIGURED'/i);
  assert.match(text, /revoke\s+all\s+on\s+function\s+public\.vvip_social_media_dispatch_worker\(\)[^;]*from\s+public,\s*anon,\s*authenticated,\s*service_role/i);
  assert.doesNotMatch(text, /grant\s+execute[^;]*vvip_social_media_dispatch_worker[^;]*to\s+(?:anon|authenticated)/i);
});
