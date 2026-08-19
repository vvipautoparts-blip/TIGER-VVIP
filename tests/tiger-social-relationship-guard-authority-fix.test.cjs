'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FIX = path.join(
  ROOT,
  'supabase/migrations/20260819131500_social_relationship_guard_authority_fix.sql'
);

function sql() {
  assert.equal(
    fs.existsSync(FIX),
    true,
    'forward-only relationship guard authority fix migration must exist'
  );
  return fs.readFileSync(FIX, 'utf8');
}

function functionDefinition(text, fn) {
  const lower = text.toLowerCase();
  const start = lower.indexOf(`function public.${fn.toLowerCase()}`);
  assert.notEqual(start, -1, `${fn} must exist`);
  const end = text.indexOf('$function$;', start);
  assert.notEqual(end, -1, `${fn} definition must terminate`);
  return text.slice(start, end + '$function$;'.length);
}

test('bounded current-actor helper can inspect block state without exposing the pair oracle', () => {
  const text = sql();
  const helper = functionDefinition(text, 'vvip_social_is_blocked_for_current_actor');

  assert.match(helper, /security\s+definer\s+set\s+search_path\s*=\s*pg_catalog,\s*public/i);
  assert.match(helper, /vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.match(helper, /vvip_social_is_blocked_pair\s*\(\s*v_actor\s*,\s*p_other_subject\s*\)/i);
  assert.match(text, /grant\s+execute\s+on\s+function\s+public\.vvip_social_is_blocked_for_current_actor\s*\(\s*text\s*\)\s+to\s+authenticated/i);
  assert.doesNotMatch(text, /grant\s+execute\s+on\s+function\s+public\.vvip_social_is_blocked_pair\s*\(\s*text\s*,\s*text\s*\)\s+to\s+authenticated/i);
});

test('relationship trigger remains invoker-authoritative and uses bounded helper for browser writes', () => {
  const text = sql();
  const guard = functionDefinition(text, 'vvip_social_guard_relationship_write');

  assert.doesNotMatch(guard, /security\s+definer/i, 'relationship trigger must preserve current_user browser-role checks');
  assert.match(guard, /set\s+search_path\s*=\s*pg_catalog,\s*public/i);
  assert.match(guard, /current_user\s+in\s*\(\s*'anon'\s*,\s*'authenticated'\s*\)/i);
  assert.match(guard, /vvip_social_is_blocked_for_current_actor/i);
  assert.match(guard, /vvip_social_is_blocked_pair/i, 'trusted non-browser writes must still honor the private block authority');
});

test('browser identity validation occurs before bounded block lookup on relationship insert and update', () => {
  const text = sql();
  const guard = functionDefinition(text, 'vvip_social_guard_relationship_write');

  const insertStart = guard.indexOf("if TG_OP = 'INSERT'");
  const updateStart = guard.indexOf("if TG_OP = 'UPDATE'");
  const deleteStart = guard.indexOf("if TG_OP = 'DELETE'");
  assert.ok(insertStart >= 0 && updateStart > insertStart && deleteStart > updateStart);

  const insertBlock = guard.slice(insertStart, updateStart);
  assert.ok(insertBlock.indexOf('NEW.requester_subject <> actor') < insertBlock.indexOf('vvip_social_is_blocked_for_current_actor'), 'insert must bind requester to actor before block lookup');

  const updateBlock = guard.slice(updateStart, deleteStart);
  assert.ok(updateBlock.indexOf('actor <> OLD.addressee_subject') < updateBlock.indexOf('vvip_social_is_blocked_for_current_actor'), 'update must bind recipient to actor before block lookup');
});