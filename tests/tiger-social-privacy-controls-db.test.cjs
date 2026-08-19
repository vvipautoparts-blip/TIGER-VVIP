'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260819130000_social_privacy_controls.sql'
);

function sql() {
  assert.equal(
    fs.existsSync(MIGRATION),
    true,
    'privacy-controls migration must exist before Privacy Proof can be GREEN'
  );
  return fs.readFileSync(MIGRATION, 'utf8');
}

function expectPattern(text, pattern, message) {
  assert.match(text, pattern, message);
}

test('privacy controls create block, mute and report authorities with forced RLS', () => {
  const text = sql();

  for (const table of [
    'vvip_social_blocks',
    'vvip_social_mutes',
    'vvip_social_reports',
  ]) {
    expectPattern(text, new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}`, 'i'), `${table} must be created`);
    expectPattern(text, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'), `${table} must enable RLS`);
    expectPattern(text, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i'), `${table} must force RLS`);
    expectPattern(text, new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public`, 'i'), `${table} must revoke direct PUBLIC access`);
  }
});

test('block semantics are two-way, idempotent and sever existing friendship', () => {
  const text = sql();

  expectPattern(text, /create\s+or\s+replace\s+function\s+public\.vvip_social_is_blocked_pair/i, 'internal block-pair authority is required');
  expectPattern(text, /create\s+or\s+replace\s+function\s+public\.vvip_social_block_user/i, 'block RPC is required');
  expectPattern(text, /create\s+or\s+replace\s+function\s+public\.vvip_social_unblock_user/i, 'unblock RPC is required');
  expectPattern(text, /delete\s+from\s+public\.vvip_social_relationships/i, 'blocking must sever existing friendship state');
  expectPattern(text, /on\s+conflict\s*\([^)]*blocker_subject[^)]*blocked_subject[^)]*\)\s+do\s+nothing/i, 'block must be idempotent');
});

test('post visibility and relationship creation become block-aware', () => {
  const text = sql();

  expectPattern(text, /create\s+or\s+replace\s+function\s+public\.vvip_social_can_view_post/i, 'post visibility function must be replaced');
  expectPattern(text, /vvip_social_is_blocked_pair/i, 'post visibility must consult block authority');
  expectPattern(text, /drop\s+policy\s+if\s+exists\s+vvip_social_post_visible_read/i, 'current post read policy must be replaced deliberately');
  expectPattern(text, /create\s+policy\s+vvip_social_post_visible_read/i, 'block-aware post read policy must be recreated');
  expectPattern(text, /create\s+or\s+replace\s+function\s+public\.vvip_social_guard_relationship_write/i, 'current relationship guard must remain the enforced boundary');
});

test('mute is feed-only and does not masquerade as a privacy block', () => {
  const text = sql();

  expectPattern(text, /create\s+or\s+replace\s+function\s+public\.vvip_social_mute_user/i, 'mute RPC is required');
  expectPattern(text, /create\s+or\s+replace\s+function\s+public\.vvip_social_unmute_user/i, 'unmute RPC is required');
  expectPattern(text, /create\s+or\s+replace\s+function\s+public\.vvip_social_feed_read/i, 'bounded feed-read RPC is required');
  expectPattern(text, /vvip_social_mutes/i, 'feed read must consult mute state');
});

test('reports are write-only through a bounded RPC for normal authenticated users', () => {
  const text = sql();

  expectPattern(text, /create\s+or\s+replace\s+function\s+public\.vvip_social_report_user/i, 'report RPC is required');
  expectPattern(text, /revoke\s+all\s+on\s+table\s+public\.vvip_social_reports\s+from\s+authenticated/i, 'authenticated users must not directly read report rows');
  expectPattern(text, /grant\s+execute\s+on\s+function\s+public\.vvip_social_report_user/i, 'authenticated users receive only bounded report execution');
});

test('privacy RPCs derive the actor from server-side identity authority', () => {
  const text = sql();

  for (const fn of [
    'vvip_social_block_user',
    'vvip_social_unblock_user',
    'vvip_social_mute_user',
    'vvip_social_unmute_user',
    'vvip_social_report_user',
    'vvip_social_feed_read',
  ]) {
    const start = text.toLowerCase().indexOf(`function public.${fn}`);
    assert.notEqual(start, -1, `${fn} must exist`);
    const fragment = text.slice(start, start + 4500);
    expectPattern(fragment, /vvip_marketplace_actor_id\s*\(\s*\)/i, `${fn} must derive actor from vvip_marketplace_actor_id()`);
    expectPattern(fragment, /security\s+definer/i, `${fn} must be SECURITY DEFINER`);
  }
});
