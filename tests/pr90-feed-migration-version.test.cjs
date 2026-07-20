const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationsDirectory = path.resolve(__dirname, '../supabase/migrations');

test('analytics and feed migrations have distinct Supabase ledger versions', () => {
  const files = fs
    .readdirSync(migrationsDirectory)
    .filter((name) => /^2026070[23]_.+\.sql$/.test(name))
    .sort();

  const analytics = files.find((name) => name.endsWith('_ai_analytics_ads_tables.sql'));
  const feed = files.find((name) => name.endsWith('_feed_posts_table.sql'));

  assert.equal(analytics, '20260702_ai_analytics_ads_tables.sql');
  assert.equal(feed, '20260703_feed_posts_table.sql');

  const analyticsVersion = analytics.split('_', 1)[0];
  const feedVersion = feed.split('_', 1)[0];
  assert.notEqual(
    feedVersion,
    analyticsVersion,
    'duplicate versions violate supabase_migrations.schema_migrations_pkey',
  );
});
