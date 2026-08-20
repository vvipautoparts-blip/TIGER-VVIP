'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKER = path.join(ROOT, 'supabase/functions/tiger-notification-worker/index.ts');
const ADAPTER = path.join(ROOT, 'supabase/functions/tiger-notification-worker/adapter.ts');
const ADAPTER_TEST = path.join(ROOT, 'supabase/functions/tiger-notification-worker/adapter_test.ts');

function readRequired(file, label) {
  assert.equal(fs.existsSync(file), true, `${label} missing: ${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}

test('Gate 4 adapter exposes only normalized provider result classes and deterministic fake mode', () => {
  const text = readRequired(ADAPTER, 'Gate 4 provider adapter');
  for (const result of ['accepted','retryable','rate_limited','endpoint_invalid','permanent_failure']) {
    assert.match(text, new RegExp(`['\"]${result}['\"]`));
  }
  assert.match(text, /fake|local/i);
  assert.match(text, /notification_id|notificationId/);
  assert.match(text, /ttl/i);
  assert.match(text, /collapse/i);
  assert.match(text, /endpoint/i);
});

test('Gate 4 repository worker fails closed instead of embedding production provider credentials', () => {
  const text = readRequired(WORKER, 'Gate 4 notification worker');
  assert.doesNotMatch(text, /APNS_KEY|FCM_SERVER_KEY|FIREBASE_PRIVATE_KEY|WEB_PUSH_PRIVATE_KEY|VAPID_PRIVATE_KEY/);
  assert.match(text, /SUPABASE_URL/);
  assert.match(text, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(text, /Cache-Control['\"]?\s*:\s*['\"]no-store/i);
  assert.match(text, /vvip_notification_claim_dispatches/);
  assert.match(text, /vvip_notification_settle_dispatch/);
  assert.doesNotMatch(text, /auth\.uid\s*\(/i);
});

test('worker never logs endpoint capability or notification private payloads', () => {
  const text = readRequired(WORKER, 'Gate 4 notification worker');
  assert.doesNotMatch(text, /console\.(?:log|info|debug|warn)\s*\([^\n]*(?:endpoint_capability|endpointCapability|template_args|message_body)/i);
  assert.doesNotMatch(text, /JSON\.stringify\s*\([^\n]*(?:endpoint_capability|endpointCapability)/i);
});

test('worker processes bounded batches through claim -> adapter -> settle only', () => {
  const text = readRequired(WORKER, 'Gate 4 notification worker');
  assert.match(text, /MAX_BATCH\s*=\s*(?:[1-9]|[12][0-9]|3[0-2])\b/);
  assert.match(text, /claim/i);
  assert.match(text, /sendPush|send_push|send\s*\(/i);
  assert.match(text, /settle/i);
  assert.match(text, /service_role|SERVICE_ROLE/i);
});

test('adapter has executable Deno tests for privacy and terminal normalization', () => {
  const text = readRequired(ADAPTER_TEST, 'Gate 4 adapter Deno tests');
  assert.match(text, /Deno\.test/);
  assert.match(text, /accepted/i);
  assert.match(text, /endpoint_invalid/i);
  assert.match(text, /expired|ttl/i);
  assert.match(text, /social_message|message/i);
  assert.match(text, /generic|redact/i);
});
