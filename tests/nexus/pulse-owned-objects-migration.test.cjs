'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const migration = path.resolve(__dirname, '../../supabase/migrations/20260829214500_nexus_pulse_owned_objects.sql');
const source = fs.readFileSync(migration, 'utf8');

test('owned Pulse object projection is authenticated, owner-scoped, sector-bound, and read-only', () => {
  assert.match(source, /create function public\.vvip_nexus_owned_pulse_objects\s*\(\s*p_limit\s+integer\s+default\s+200\s*\)/i);
  assert.match(source, /v_actor\s+text\s*:=\s*public\.vvip_marketplace_actor_id\(\)/i);
  assert.match(source, /post\.author_subject\s*=\s*v_actor/i);
  assert.match(source, /post\.sector_key\s+is\s+not\s+null/i);
  assert.match(source, /post\.intent_class\s+is\s+not\s+null/i);
  assert.match(source, /least\s*\(\s*greatest\s*\(\s*p_limit\s*,\s*1\s*\)\s*,\s*200\s*\)/i);
  assert.match(source, /grant execute on function public\.vvip_nexus_owned_pulse_objects\(integer\)[\s\S]*to authenticated/i);
  assert.doesNotMatch(source, /\b(?:insert|update|delete)\s+(?:into\s+|from\s+)?public\.vvip_social_posts/i);
});
