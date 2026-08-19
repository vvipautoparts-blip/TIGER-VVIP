'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260820002000_social_media_canonical_authority.sql'
);

function sql() {
  assert.equal(
    fs.existsSync(MIGRATION),
    true,
    'Gate 2 canonical-authority migration must exist before this contract can turn GREEN'
  );
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('upload reservation accepts only post id plus idempotency key and derives authority server-side', () => {
  const text = sql();
  assert.match(
    text,
    /create\s+function\s+public\.vvip_social_media_reserve_upload\s*\(\s*target_post\s+uuid\s*,\s*request_idempotency_key\s+text\s*\)/i
  );
  assert.match(text, /vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.match(text, /SOCIAL_MEDIA_POST_OWNER_REQUIRED/i);

  const reserveStart = text.search(/create\s+function\s+public\.vvip_social_media_reserve_upload/i);
  const reserveEnd = text.indexOf('$function$;', reserveStart);
  assert.notEqual(reserveStart, -1);
  assert.notEqual(reserveEnd, -1);
  const reserve = text.slice(reserveStart, reserveEnd);
  assert.doesNotMatch(
    reserve,
    /(requested_mime|requested_bytes|requested_width|requested_height|p_mime_type|p_byte_size|p_width|p_height|p_sha256)/i
  );
});

test('media asset and queue tables are FORCE-RLS and browser-table-closed', () => {
  const text = sql();
  for (const table of ['vvip_social_media_assets', 'vvip_social_media_webhook_inbox']) {
    assert.match(text, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'));
    assert.match(text, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i'));
    assert.match(
      text,
      new RegExp(`revoke\\s+all(?:\\s+privileges)?\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, 'i')
    );
    assert.doesNotMatch(
      text,
      new RegExp(`grant\\s+(?:insert|update|delete|all)[^;]*public\\.${table}[^;]*to\\s+authenticated`, 'i')
    );
  }
});

test('source path is private opaque and canonical evidence is service-only', () => {
  const text = sql();
  assert.match(text, /'social-private-media'/i);
  assert.match(text, /false\s*,\s*5242880/i);
  assert.match(text, /source\//i);
  assert.match(text, /\.blob/i);
  assert.match(text, /canonical_sha256/i);
  assert.match(text, /canonical_mime_type/i);
  assert.match(text, /canonical_byte_size/i);
  assert.match(text, /canonical_width/i);
  assert.match(text, /canonical_height/i);
  assert.match(text, /grant\s+execute[^;]*vvip_social_media_finalize[^;]*to\s+service_role/i);
  assert.doesNotMatch(text, /grant\s+execute[^;]*vvip_social_media_finalize[^;]*to\s+authenticated/i);
});

test('webhook/work claim is idempotent, SKIP LOCKED, exponential backoff, and dead-letter bounded', () => {
  const text = sql();
  assert.match(text, /idempotency_key\s+text\s+not\s+null\s+unique/i);
  assert.match(text, /for\s+update\s+skip\s+locked/i);
  assert.match(text, /attempt_count\s+smallint/i);
  assert.match(text, /dead_letter/i);
  assert.match(text, /interval\s+'30 seconds'/i);
  assert.match(text, /interval\s+'2 minutes'/i);
  assert.match(text, /interval\s+'8 minutes'/i);
  assert.match(text, /interval\s+'32 minutes'/i);
  assert.match(text, /SOCIAL_MEDIA_WEBHOOK_IDEMPOTENCY_CONFLICT/i);
});

test('private read grants are short-lived, one-time, and re-check social visibility', () => {
  const text = sql();
  assert.match(text, /create\s+table\s+public\.vvip_social_media_read_grants/i);
  assert.match(text, /token_hash\s+text\s+not\s+null\s+unique/i);
  assert.match(text, /interval\s+'2 minutes'/i);
  assert.match(text, /vvip_social_can_view_post\s*\(/i);
  assert.match(text, /consumed_at\s+is\s+null/i);
});
