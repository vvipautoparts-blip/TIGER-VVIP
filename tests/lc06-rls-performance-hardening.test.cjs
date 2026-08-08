'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const migrationPath = path.join(
  repoRoot,
  'supabase',
  'migrations',
  '20260808180000_lc06_rls_performance_hardening.sql',
);

function sql() {
  assert.ok(
    fs.existsSync(migrationPath),
    'LC06 migration must exist before the hardening contract can pass',
  );
  return fs.readFileSync(migrationPath, 'utf8');
}

function collectRuntimeReferences(directory, relative = '') {
  const excludedDirectories = new Set([
    '.git',
    '.github',
    'docs',
    'node_modules',
    'supabase',
    'tests',
  ]);
  const references = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;

    const absolute = path.join(directory, entry.name);
    const nextRelative = path.join(relative, entry.name);

    if (entry.isDirectory()) {
      references.push(...collectRuntimeReferences(absolute, nextRelative));
      continue;
    }

    if (!/\.(?:html?|js|mjs)$/i.test(entry.name)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    if (/vvip_clerk_profiles/i.test(text)) references.push(nextRelative);
  }

  return references;
}

test('shipped runtime no longer depends on the transitional vvip_clerk_profiles table', () => {
  assert.deepEqual(collectRuntimeReferences(repoRoot), []);
});

test('LC06 binds marketplace actor identity to a real Clerk user subject', () => {
  const text = sql();
  assert.match(text, /create\s+or\s+replace\s+function\s+public\.vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.match(text, /like\s+'user\\_%'\s+escape\s+'\\'/i);
  assert.match(text, /else\s+null/i);
});

test('LC06 seals the transitional Clerk profile table as server-only', () => {
  const text = sql();
  assert.match(text, /alter\s+table\s+public\.vvip_clerk_profiles\s+enable\s+row\s+level\s+security/i);
  assert.match(text, /alter\s+table\s+public\.vvip_clerk_profiles\s+force\s+row\s+level\s+security/i);
  for (const policy of [
    'Clerk users can read own vvip profile',
    'Clerk users can insert own vvip profile',
    'Clerk users can update own vvip profile',
  ]) {
    assert.match(text, new RegExp(`drop policy if exists "${policy}"`, 'i'));
  }
  assert.match(text, /revoke\s+all\s+privileges\s+on\s+table\s+public\.vvip_clerk_profiles\s+from\s+public,\s*anon,\s*authenticated/i);
  assert.doesNotMatch(text, /create\s+policy[\s\S]*?on\s+public\.vvip_clerk_profiles/i);
});

test('LC06 removes SELECT overlap from marketplace media owner-write policy', () => {
  const text = sql();
  assert.match(text, /drop policy if exists vvip_marketplace_media_owner_write/i);
  assert.doesNotMatch(text, /create\s+policy\s+vvip_marketplace_media_owner_write[\s\S]*?for\s+all/i);
  for (const action of ['insert', 'update', 'delete']) {
    assert.match(text, new RegExp(`create\\s+policy\\s+vvip_marketplace_media_owner_${action}[\\s\\S]*?for\\s+${action}`, 'i'));
  }
});

test('LC06 gives anon and authenticated listing reads one non-overlapping policy each', () => {
  const text = sql();
  assert.match(text, /drop policy if exists vvip_marketplace_public_read_active/i);
  assert.match(text, /drop policy if exists vvip_marketplace_owner_read/i);
  assert.match(text, /create\s+policy\s+vvip_marketplace_public_read_active[\s\S]*?for\s+select[\s\S]*?to\s+anon/i);
  assert.match(text, /create\s+policy\s+vvip_marketplace_authenticated_read[\s\S]*?for\s+select[\s\S]*?to\s+authenticated/i);
});

test('LC06 adds covering indexes for every advisor-reported missing foreign key in the modern staging schema', () => {
  const text = sql();
  const indexes = [
    ['ai_audit_events_approval_id_idx', 'ai_audit_events', 'approval_id'],
    ['profiles_superior_id_idx', 'profiles', 'superior_id'],
    ['vvip_authority_assignments_role_id_idx', 'vvip_authority_assignments', 'role_id'],
    ['vvip_marketplace_favorites_listing_id_idx', 'vvip_marketplace_favorites', 'listing_id'],
  ];
  for (const [indexName, tableName, columnName] of indexes) {
    assert.match(
      text,
      new RegExp(`create\\s+index\\s+if\\s+not\\s+exists\\s+${indexName}\\s+on\\s+public\\.${tableName}\\s*\\(\\s*${columnName}\\s*\\)`, 'i'),
    );
  }
});

test('LC06 is scoped hardening and contains no Production command or destructive table operation', () => {
  const text = sql();
  assert.doesNotMatch(text, /drop\s+table|truncate|delete\s+from/i);
  assert.doesNotMatch(text, /supabase\s+db\s+push|production[_ -]?approved|owner[_ -]?approved/i);
});
