'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260820005000_social_realtime_messaging.sql'
);

function sql() {
  assert.equal(
    fs.existsSync(MIGRATION),
    true,
    'Gate 3 migration missing: 20260820005000_social_realtime_messaging.sql'
  );
  return fs.readFileSync(MIGRATION, 'utf8');
}

test('Gate 3 creates FORCE-RLS durable messaging tables with browser mutations closed', () => {
  const text = sql();
  for (const table of [
    'vvip_social_conversations',
    'vvip_social_conversation_members',
    'vvip_social_messages',
    'vvip_social_read_cursors',
  ]) {
    assert.match(text, new RegExp(`create\\s+table\\s+public\\.${table}`, 'i'));
    assert.match(text, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'));
    assert.match(text, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i'));
    assert.match(text, new RegExp(`revoke\\s+all(?:\\s+privileges)?\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, 'i'));
    assert.doesNotMatch(text, new RegExp(`grant\\s+(?:insert|update|delete|all)[^;]*public\\.${table}[^;]*to\\s+authenticated`, 'i'));
  }
});

test('direct conversation open derives Clerk actor, requires friendship, and rejects blocked pairs', () => {
  const text = sql();
  assert.match(text, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_social_open_direct_conversation\s*\(\s*peer_subject\s+text\s*,\s*idempotency_key\s+text\s*\)/i);
  assert.match(text, /vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.match(text, /relationship_state\s*=\s*'friends'/i);
  assert.match(text, /vvip_social_is_blocked_pair\s*\(/i);
  assert.match(text, /least\s*\(/i);
  assert.match(text, /greatest\s*\(/i);
  assert.match(text, /unique\s*\(\s*subject_low\s*,\s*subject_high\s*\)/i);
  assert.doesNotMatch(text, /auth\.uid\s*\(/i);
});

test('send is idempotent, row-locked, monotonically sequenced, and database-broadcast only', () => {
  const text = sql();
  assert.match(text, /create\s+(?:or\s+replace\s+)?function\s+public\.vvip_social_send_message\s*\(\s*conversation_id\s+uuid\s*,\s*client_message_id\s+uuid\s*,\s*body\s+text\s*\)/i);
  assert.match(text, /unique\s*\(\s*conversation_id\s*,\s*sender_subject\s*,\s*client_message_id\s*\)/i);
  assert.match(text, /for\s+update/i);
  assert.match(text, /next_sequence/i);
  assert.match(text, /last_message_sequence/i);
  assert.match(text, /realtime\.send\s*\(/i);
  assert.match(text, /'message_created'/i);
  assert.match(text, /true\s*\)/i);
});

test('catch-up uses bounded keyset sequence and read cursor is monotonic', () => {
  const text = sql();
  assert.match(text, /vvip_social_list_messages\s*\(/i);
  assert.match(text, /sequence\s*>\s*(?:after_sequence|p_after_sequence)/i);
  assert.match(text, /between\s+1\s+and\s+100|least\s*\([^;]*100/i);
  assert.doesNotMatch(text, /offset\s+/i);
  assert.match(text, /vvip_social_mark_read\s*\(/i);
  assert.match(text, /greatest\s*\(/i);
  assert.match(text, /last_message_sequence/i);
});

test('block transitions bump channel epoch and fresh authorization requires current epoch', () => {
  const text = sql();
  assert.match(text, /channel_epoch\s+bigint\s+not\s+null\s+default\s+1/i);
  assert.match(text, /membership_version\s+bigint\s+not\s+null\s+default\s+1/i);
  assert.match(text, /after\s+insert\s+or\s+delete\s+on\s+public\.vvip_social_blocks/i);
  assert.match(text, /channel_epoch\s*=\s*channel_epoch\s*\+\s*1/i);
  assert.match(text, /membership_version\s*=\s*membership_version\s*\+\s*1/i);
  assert.match(text, /conversation:/i);
  assert.match(text, /:epoch:/i);
  assert.match(text, /vvip_social_realtime_topic_authorized\s*\(/i);
});

test('Realtime policy permits private receive and Presence insert but never authenticated Broadcast insert', () => {
  const text = sql();
  assert.match(text, /create\s+policy[^;]*on\s+realtime\.messages[^;]*for\s+select[^;]*to\s+authenticated/is);
  assert.match(text, /extension\s+in\s*\(\s*'broadcast'\s*,\s*'presence'\s*\)/i);
  assert.match(text, /create\s+policy[^;]*on\s+realtime\.messages[^;]*for\s+insert[^;]*to\s+authenticated[^;]*extension\s*=\s*'presence'/is);
  assert.doesNotMatch(text, /create\s+policy[^;]*on\s+realtime\.messages[^;]*for\s+insert[^;]*to\s+authenticated[^;]*(?:extension\s*=\s*'broadcast'|extension\s+in\s*\([^)]*'broadcast')/is);
});

test('browser access is bounded through the five Gate 3 RPCs', () => {
  const text = sql();
  for (const fn of [
    'vvip_social_open_direct_conversation',
    'vvip_social_send_message',
    'vvip_social_list_messages',
    'vvip_social_mark_read',
    'vvip_social_get_channel_ticket',
  ]) {
    assert.match(text, new RegExp(`grant\\s+execute[^;]*${fn}[^;]*to\\s+authenticated`, 'i'));
  }
});
