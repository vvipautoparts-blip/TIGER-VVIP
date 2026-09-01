'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const sql = fs.readFileSync('supabase/migrations/20260829183000_nexus_sector_publication.sql', 'utf8');

test('NEXUS forward migration preserves sector and intent in the authoritative feed read model', () => {
  assert.match(sql, /create or replace function public\.vvip_social_feed_read_keyset\s*\(/i);
  assert.match(sql, /'sector_key'\s*,\s*post\.sector_key/i);
  assert.match(sql, /'intent_class'\s*,\s*post\.intent_class/i);
});

test('feed read model never fabricates a generic sector or intent for historical rows', () => {
  assert.doesNotMatch(sql, /coalesce\s*\(\s*post\.sector_key\s*,\s*['"](?:general|legacy|unknown)/i);
  assert.doesNotMatch(sql, /coalesce\s*\(\s*post\.intent_class\s*,/i);
});
