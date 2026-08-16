'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(
  path.resolve(__dirname, '../supabase/migrations/20260816105000_drop_legacy_profiles_table.sql'),
  'utf8'
);

test('empty legacy profiles table is dropped without cascade', () => {
  assert.match(migration, /drop\s+table\s+if\s+exists\s+public\.profiles\s*;/i);
  assert.doesNotMatch(migration, /cascade/i);
  assert.doesNotMatch(migration, /vvip_clerk_profiles/i);
});
