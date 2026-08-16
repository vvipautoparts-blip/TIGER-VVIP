'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(
  path.resolve(__dirname, '../supabase/migrations/20260816093000_sovereign_publication_authority.sql'),
  'utf8'
);

test('publication reservation qualifies entitlement state in UPDATE predicates', () => {
  assert.match(
    sql,
    /update\s+public\.vvip_listing_activation_entitlements\s+as\s+entitlement[\s\S]{0,700}where\s+entitlement\.entitlement_id\s*=\s*current_entitlement\.entitlement_id[\s\S]{0,200}entitlement\.entitlement_state\s*=\s*'ISSUED'/i
  );
  assert.doesNotMatch(sql, /where\s+entitlement_id\s*=\s*current_entitlement\.entitlement_id\s+and\s+entitlement_state\s*=\s*'ISSUED'/i);
});
