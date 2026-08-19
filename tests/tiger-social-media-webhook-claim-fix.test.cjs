'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const path = 'supabase/migrations/20260819140500_social_media_webhook_claim_fix.sql';

test('webhook claim repair qualifies the persisted attempt counter and stays lock-bounded', () => {
  const sql = fs.readFileSync(path, 'utf8');
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_social_media_webhook_claim/i);
  assert.match(sql, /attempt_count\s*=\s*public\.vvip_social_media_webhook_inbox\.attempt_count\s*\+\s*1/i);
  assert.match(sql, /for\s+update\s+skip\s+locked/i);
  assert.match(sql, /set\s+local\s+lock_timeout\s*=\s*'2s'/i);
  assert.doesNotMatch(sql, /drop\s+function|drop\s+table|disable\s+row\s+level\s+security/i);
});
