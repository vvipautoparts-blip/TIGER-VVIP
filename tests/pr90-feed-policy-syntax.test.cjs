const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(
  path.resolve(__dirname, '../supabase/migrations/20260703_feed_posts_table.sql'),
  'utf8',
);

const policies = [
  {
    name: 'Anyone can read feed posts',
    operation: 'select',
    predicate: 'using',
  },
  {
    name: 'Anyone can insert feed posts',
    operation: 'insert',
    predicate: 'with\\s+check',
  },
];

test('feed migration uses PostgreSQL-supported repeatable policy syntax', () => {
  assert.doesNotMatch(
    migration,
    /create\s+policy\s+if\s+not\s+exists/i,
    'PostgreSQL does not support CREATE POLICY IF NOT EXISTS',
  );

  for (const { name, operation, predicate } of policies) {
    assert.match(
      migration,
      new RegExp(
        `drop\\s+policy\\s+if\\s+exists\\s+"${name}"` +
          '\\s+on\\s+public\\.feed_posts\\s*;',
        'i',
      ),
      `missing repeatability guard for ${name}`,
    );
    assert.match(
      migration,
      new RegExp(
        `create\\s+policy\\s+"${name}"\\s+on\\s+public\\.feed_posts` +
          `\\s+for\\s+${operation}\\s+${predicate}\\s*\\(\\s*true\\s*\\)\\s*;`,
        'i',
      ),
      `policy semantics changed for ${name}`,
    );
  }
});

test('feed syntax repair preserves the table and does not add grants', () => {
  assert.doesNotMatch(migration, /\bgrant\b/i);
  assert.equal(
    (migration.match(/create\s+table\s+if\s+not\s+exists\s+public\.feed_posts/gi) || []).length,
    1,
  );
  assert.equal((migration.match(/create\s+policy\b/gi) || []).length, 2);
});
