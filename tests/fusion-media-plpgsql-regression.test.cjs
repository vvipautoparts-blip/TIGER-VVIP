'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(
  path.resolve(__dirname, '../supabase/migrations/20260816090000_sovereign_media_finalization.sql'),
  'utf8'
);

test('media finalization request qualifies media_id in UPDATE predicates', () => {
  assert.match(
    sql,
    /update\s+public\.vvip_marketplace_listing_media\s+as\s+media[\s\S]{0,500}where\s+media\.media_id\s*=\s*target_media/i
  );
  assert.doesNotMatch(sql, /where\s+media_id\s*=\s*target_media/i);
});
