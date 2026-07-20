const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(
  __dirname,
  '../supabase/migrations/20260702_ai_analytics_ads_tables.sql',
);
const migration = fs.readFileSync(migrationPath, 'utf8');

const policies = [
  {
    name: 'Anyone can read analytics events',
    table: 'feed_analytics_events',
    operation: 'select',
    predicate: 'using',
  },
  {
    name: 'Anyone can insert analytics events',
    table: 'feed_analytics_events',
    operation: 'insert',
    predicate: 'with check',
  },
  {
    name: 'Anyone can read ad campaign settings',
    table: 'ad_campaign_settings',
    operation: 'select',
    predicate: 'using',
  },
  {
    name: 'Anyone can insert ad campaign settings',
    table: 'ad_campaign_settings',
    operation: 'insert',
    predicate: 'with check',
  },
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('analytics migration uses PostgreSQL-supported repeatable policy syntax', () => {
  assert.doesNotMatch(
    migration,
    /create\s+policy\s+if\s+not\s+exists/i,
    'PostgreSQL does not support CREATE POLICY IF NOT EXISTS',
  );

  for (const { name, table, operation, predicate } of policies) {
    const escapedName = escapeRegExp(name);
    assert.match(
      migration,
      new RegExp(
        `drop\\s+policy\\s+if\\s+exists\\s+"${escapedName}"` +
          `\\s+on\\s+public\\.${table}\\s*;`,
        'i',
      ),
      `missing repeatability guard for ${name}`,
    );
    assert.match(
      migration,
      new RegExp(
        `create\\s+policy\\s+"${escapedName}"\\s+on\\s+public\\.${table}` +
          `\\s+for\\s+${operation}\\s+${predicate.replace(' ', '\\s+')}\\s*\\(\\s*true\\s*\\)\\s*;`,
        'i',
      ),
      `policy semantics changed for ${name}`,
    );
  }
});

test('analytics syntax repair does not add grants or alter table definitions', () => {
  assert.doesNotMatch(migration, /\bgrant\b/i);
  assert.equal(
    (migration.match(/create\s+table\s+if\s+not\s+exists/gi) || []).length,
    2,
    'the two existing table definitions must remain intact',
  );
  assert.equal(
    (migration.match(/create\s+policy\b/gi) || []).length,
    4,
    'the four existing policies must remain intact',
  );
});
