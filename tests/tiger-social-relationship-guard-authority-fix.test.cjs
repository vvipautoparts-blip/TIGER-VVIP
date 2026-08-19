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

test('forward fix hardens the relationship guard as a pinned definer without exposing the private block oracle', () => {
  const text = sql();
  const guard = functionDefinition(text, 'vvip_social_guard_relationship_write');

  assert.match(
    guard,
    /security\s+definer\s+set\s+search_path\s*=\s*pg_catalog,\s*public/i,
    'guard must have database authority to call the private block helper'
  );
  assert.doesNotMatch(
    text,
    /grant\s+execute\s+on\s+function\s+public\.vvip_social_is_blocked_pair\s*\(\s*text\s*,\s*text\s*\)\s+to\s+authenticated/i,
    'fix must not expose the private block-pair oracle'
  );
  assert.match(guard, /vvip_social_is_blocked_pair/i, 'guard must continue enforcing the private block boundary');
});

test('definer guard is actor-authoritative and no longer trusts current_user role branches', () => {
  const text = sql();
  const guard = functionDefinition(text, 'vvip_social_guard_relationship_write');

  assert.match(guard, /actor\s+text\s*:=\s*public\.vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.doesNotMatch(guard, /current_user/i, 'SECURITY DEFINER guard must not branch on the definer current_user');
  assert.match(guard, /actor\s+is\s+not\s+null\s+and\s+actor\s+not\s+like\s+'user\\_%'/i, 'non-user actor identities must fail closed');
});

test('relationship invariants remain enforced for insert, update and delete', () => {
  const text = sql();
  const guard = functionDefinition(text, 'vvip_social_guard_relationship_write');

  assert.match(guard, /NEW\.requester_subject\s*=\s*NEW\.addressee_subject/i, 'self relationships stay forbidden');
  assert.match(guard, /NEW\.relationship_state\s*<>\s*'pending'/i, 'new relationships must start pending');
  assert.match(guard, /OLD\.relationship_state\s*<>\s*'pending'/i, 'updates must originate from pending');
  assert.match(guard, /NEW\.relationship_state\s*<>\s*'friends'/i, 'accepted relationship must become friends');
  assert.match(guard, /NEW\.requester_subject\s*<>\s*OLD\.requester_subject/i, 'relationship requester remains immutable');
  assert.match(guard, /NEW\.addressee_subject\s*<>\s*OLD\.addressee_subject/i, 'relationship addressee remains immutable');
  assert.match(guard, /actor\s+is\s+not\s+null\s+and\s+NEW\.requester_subject\s*<>\s*actor/i, 'signed actor must own an insert request');
  assert.match(guard, /actor\s+is\s+not\s+null\s+and\s+actor\s*<>\s*OLD\.addressee_subject/i, 'signed actor must be the accepting recipient');
  assert.match(guard, /actor\s+is\s+not\s+null[\s\S]*actor\s+not\s+in\s*\(\s*OLD\.requester_subject\s*,\s*OLD\.addressee_subject\s*\)/i, 'signed actor must be a participant to delete');
});