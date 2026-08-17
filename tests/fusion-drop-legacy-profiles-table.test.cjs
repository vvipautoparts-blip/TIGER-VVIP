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
  const executableSql = migration.replace(/--.*$/gm, '');
  assert.match(executableSql, /drop\s+table\s+if\s+exists\s+public\.profiles\s*;/i);
  assert.doesNotMatch(executableSql, /drop\s+table[^;]*\bcascade\b/i);
  assert.doesNotMatch(executableSql, /vvip_clerk_profiles/i);
});
