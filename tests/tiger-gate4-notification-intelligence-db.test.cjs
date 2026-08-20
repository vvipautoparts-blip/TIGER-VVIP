'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260820006000_notification_intelligence.sql');
const RECOVERY = path.join(ROOT, 'supabase/migrations/20260820006200_notification_dispatch_stale_recovery.sql');
const DESIGN = path.join(ROOT, 'docs/superpowers/specs/2026-08-20-tiger-gate4-notification-intelligence-design.md');

function sql() {
  assert.equal(fs.existsSync(MIGRATION), true, 'Gate 4 migration missing: 20260820006000_notification_intelligence.sql');
  return fs.readFileSync(MIGRATION, 'utf8');
}

function recoverySql() {
  assert.equal(fs.existsSync(RECOVERY), true, 'Gate 4 stale recovery migration missing: 20260820006200_notification_dispatch_stale_recovery.sql');
  return fs.readFileSync(RECOVERY, 'utf8');
}

function design() {
  assert.equal(fs.existsSync(DESIGN), true, 'Gate 4 design missing');
  return fs.readFileSync(DESIGN, 'utf8');
}

test('Gate 4 creates durable notification authorities with browser table mutation closed', () => {
  const text = sql();
  for (const table of [
    'vvip_notification_inboxes',
    'vvip_notifications',
    'vvip_notification_preferences',
    'vvip_notification_activity_leases',
    'vvip_notification_endpoints',
    'vvip_notification_dispatches',
  ]) {
    assert.match(text, new RegExp(`create\\s+table\\s+public\\.${table}`, 'i'));
    assert.match(text, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'));
    assert.match(text, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i'));
    assert.match(text, new RegExp(`revoke\\s+all(?:\\s+privileges)?\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, 'i'));
  }
});

test('legacy notification events cannot remain a competing browser notification authority', () => {
  const text = sql();
  assert.match(text, /revoke\s+all(?:\s+privileges)?\s+on\s+table\s+public\.vvip_notification_events\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i);
  assert.doesNotMatch(text, /grant\s+(?:select|insert|update|delete|all)[^;]*vvip_notification_events[^;]*to\s+authenticated/i);
});

test('category, sensitivity, dispatch and retry state are closed enums with five-attempt terminal budget', () => {
  const text = sql();
  for (const category of ['social_message','social_relationship','social_comment','social_reaction','marketplace_activity','security_account','system_integrity']) {
    assert.match(text, new RegExp(`'${category}'`));
  }
  for (const sensitivity of ['low','private','sensitive','security']) {
    assert.match(text, new RegExp(`'${sensitivity}'`));
  }
  for (const state of ['pending','leased','accepted','retry_wait','invalid_endpoint','permanent_failure','expired','dead_letter','suppressed']) {
    assert.match(text, new RegExp(`'${state}'`));
  }
  assert.match(text, /attempt_count\s*(?:<|<=)\s*5|attempt_count[^;]{0,160}5/is);
});

test('notification creation is idempotent, monotonically sequenced and server-authoritative', () => {
  const text = sql();
  assert.match(text, /unique\s*\(\s*inbox_id\s*,\s*event_key\s*\)/i);
  assert.match(text, /unique\s*\(\s*inbox_id\s*,\s*sequence\s*\)/i);
  assert.match(text, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_notification_create\s*\(/i);
  assert.match(text, /for\s+update/i);
  assert.match(text, /next_sequence/i);
  assert.match(text, /vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.doesNotMatch(text, /auth\.uid\s*\(/i);
});

test('browser RPC surface is bounded and endpoint capabilities are never browser-readable', () => {
  const text = sql();
  for (const fn of [
    'vvip_notification_list',
    'vvip_notification_mark_read',
    'vvip_notification_mark_all_read',
    'vvip_notification_get_channel_ticket',
    'vvip_notification_get_preferences',
    'vvip_notification_update_preference',
    'vvip_notification_update_activity_hint',
    'vvip_notification_register_endpoint',
    'vvip_notification_revoke_endpoint',
  ]) {
    assert.match(text, new RegExp(`grant\\s+execute[^;]*${fn}[^;]*to\\s+authenticated`, 'i'));
  }
  assert.doesNotMatch(text, /grant\s+select[^;]*vvip_notification_endpoints[^;]*to\s+authenticated/i);
  assert.match(text, /extensions\.digest\s*\([^;]*'sha256'/i);
  assert.doesNotMatch(text, /(?<!extensions\.)digest\s*\([^;]*'sha256'/i);
});

test('dispatch claiming uses SKIP LOCKED, bounded leases and generation fencing', () => {
  const text = sql();
  assert.match(text, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_notification_claim_dispatches\s*\(/i);
  assert.match(text, /for\s+update(?:\s+of\s+\w+)?\s+skip\s+locked/i);
  assert.match(text, /generation\s*=\s*(?:\w+\.)?generation\s*\+\s*1|generation\s*\+\s*1/i);
  assert.match(text, /lease_expires_at/i);
  assert.match(text, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_notification_settle_dispatch\s*\(/i);
  assert.match(text, /expected_generation|p_expected_generation/i);
  assert.match(text, /dead_letter/i);
});

test('expired worker leases are recovered with generation fencing and terminal budget', () => {
  const text = recoverySql();
  assert.match(text, /state\s*=\s*'leased'/i);
  assert.match(text, /lease_expires_at\s*<=\s*statement_timestamp\s*\(\s*\)/i);
  assert.match(text, /generation\s*=\s*dispatch\.generation\s*\+\s*1/i);
  assert.doesNotMatch(text, /generation\s*=\s*generation\s*\+\s*1/i);
  assert.match(text, /attempt_count\s*>=\s*5/i);
  assert.match(text, /dead_letter/i);
  assert.match(text, /retry_wait/i);
  assert.match(text, /expired/i);
  assert.match(text, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_notification_claim_dispatches\s*\(/i);
});

test('dispatch TTL rounds fractional remaining lifetime up until true expiry', () => {
  for (const text of [sql(), recoverySql()]) {
    assert.match(
      text,
      /greatest\s*\(\s*0\s*,\s*ceil\s*\(\s*extract\s*\(\s*epoch\s+from\s*\(\s*claimed\.expires_at\s*-\s*statement_timestamp\s*\(\s*\)\s*\)\s*\)\s*\)\s*\)\s*::\s*integer/i,
    );
    assert.doesNotMatch(
      text,
      /extract\s*\(\s*epoch\s+from\s*\(\s*claimed\.expires_at\s*-\s*statement_timestamp\s*\(\s*\)\s*\)\s*\)\s*::\s*integer/i,
    );
  }
});

test('Gate 4 design status records completed owner approval and implementation', () => {
  const text = design();
  assert.match(
    text,
    /^Status: owner-approved and implementation-complete; exact-SHA evidence is recorded in PR metadata and MUST be refreshed after every source change\.$/m,
  );
  assert.doesNotMatch(text, /requires explicit owner review before implementation begins/i);
});

test('activity lease, kill switches and privacy-safe message push policy are explicit', () => {
  const text = sql();
  assert.match(text, /interval\s+'90 seconds'|90\s*\*\s*interval\s+'1 second'/i);
  assert.match(text, /push_global|global_push|background_push/i);
  assert.match(text, /provider/i);
  assert.match(text, /category/i);
  assert.match(text, /sensitive_preview|preview/i);
  assert.match(text, /social_message/i);
  assert.match(text, /message body|message_body|generic/i);
});

test('notification Realtime is private current-epoch receive only and browser Broadcast INSERT is absent', () => {
  const text = sql();
  assert.match(text, /notifications:/i);
  assert.match(text, /:epoch:/i);
  assert.match(text, /vvip_notification_realtime_topic_authorized\s*\(/i);
  assert.match(text, /create\s+policy[^;]*on\s+realtime\.messages[^;]*for\s+select[^;]*to\s+authenticated/is);
  assert.doesNotMatch(text, /create\s+policy[^;]*on\s+realtime\.messages[^;]*for\s+insert[^;]*to\s+authenticated[^;]*broadcast/is);
});

test('notification listing is keyset based and offset pagination is forbidden', () => {
  const text = sql();
  assert.match(text, /sequence\s*>\s*(?:after_sequence|p_after_sequence)/i);
  assert.match(text, /between\s+1\s+and\s+100|least\s*\([^;]*100/i);
  assert.doesNotMatch(text, /offset\s+/i);
});
