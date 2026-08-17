'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(
  path.resolve(__dirname, '../supabase/migrations/20260816171000_sovereign_publication_rpc_hardening.sql'),
  'utf8'
);

test('publication reservation qualifies entitlement state in UPDATE predicates', () => {
  assert.match(
    sql,
    /update\s+public\.vvip_listing_activation_entitlements\s+as\s+entitlement[\s\S]{0,700}where\s+entitlement\.entitlement_id\s*=\s*current_entitlement\.entitlement_id[\s\S]{0,200}entitlement\.entitlement_state\s*=\s*'ISSUED'/i
  );
  assert.doesNotMatch(sql, /where\s+entitlement_id\s*=\s*current_entitlement\.entitlement_id\s+and\s+entitlement_state\s*=\s*'ISSUED'/i);
});

test('post-stack publication hardening preserves one fail-closed RPC authority', () => {
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_marketplace_request_publication/i);
  assert.match(sql, /security\s+definer[\s\S]*set\s+search_path\s*=\s*pg_catalog\s*,\s*public\s*,\s*extensions/i);
  assert.match(sql, /PUBLICATION_IDEMPOTENCY_STATE_INVALID/);
  assert.match(sql, /ENTITLEMENT_REPLAY_BLOCKED/);
  assert.match(sql, /MEDIA_SERVER_FINALIZATION_REQUIRED/);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.vvip_marketplace_request_publication[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_marketplace_request_publication[\s\S]*to\s+authenticated/i);
  assert.doesNotMatch(sql, /grant\s+execute[\s\S]*to\s+(?:public|anon)/i);
});
