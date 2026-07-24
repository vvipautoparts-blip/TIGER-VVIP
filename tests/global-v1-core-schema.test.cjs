#!/usr/bin/env node
// VVIP TIGER — Global V1 Core Schema Migration Validation Test
// Validates the structure of 202607240001_global_v1_core_schema.sql

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION_FILE = path.join(ROOT, 'supabase/migrations/202607240001_global_v1_core_schema.sql');

const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

// 1. File exists and has content
assert.ok(sql.length > 1000, 'Migration file must have substantial content');

// 2. All expected tables are created
const expectedTables = [
  'vvip_sectors',
  'vvip_categories',
  'vvip_listings',
  'vvip_listing_status_history',
  'vvip_favorites',
  'vvip_conversations',
  'vvip_messages',
  'vvip_notification_events',
  'vvip_reports',
  'vvip_support_tickets',
  'vvip_consents',
  'vvip_user_blocks'
];
for (const table of expectedTables) {
  assert.ok(
    sql.includes(`create table if not exists ${table}`),
    `Migration must create table: ${table}`
  );
}

// 3. RLS is enabled on all tables
for (const table of expectedTables) {
  assert.ok(
    sql.includes(`alter table ${table} enable row level security`),
    `RLS must be enabled on: ${table}`
  );
}

// 4. Clerk JWT identity used (auth.jwt() ->> 'sub') — not auth.uid()
assert.ok(
  sql.includes("auth.jwt() ->> 'sub'"),
  'Policies must use auth.jwt() sub for Clerk compatibility, not auth.uid()'
);
assert.ok(
  !sql.includes('auth.uid()'),
  'Must not use auth.uid() — Clerk uses JWT sub'
);

// 5. No service_role grants to anon (safety check)
assert.ok(
  !sql.toLowerCase().includes('grant') ||
  sql.toLowerCase().includes('grant') && !sql.toLowerCase().includes('to anon'),
  'Must not grant broad permissions to anon role'
);

// 6. Sectors are seeded with 3 approved sectors
assert.ok(sql.includes("'automotive'"), 'Must seed automotive sector');
assert.ok(sql.includes("'materials'"), 'Must seed materials sector');
assert.ok(sql.includes("'real_estate'"), 'Must seed real_estate sector');

// 7. Listing status values include full state machine
const requiredStatuses = ['draft', 'pending_review', 'published', 'rejected', 'paused', 'expired', 'archived'];
for (const status of requiredStatuses) {
  assert.ok(
    sql.includes(`'${status}'`),
    `Listing state machine must include status: ${status}`
  );
}

// 8. Listing has full-text search index
assert.ok(
  sql.includes('vvip_listings_fts_idx'),
  'Listings must have full-text search index'
);
assert.ok(
  sql.includes("using gin(to_tsvector("),
  'Full-text search must use GIN index with tsvector'
);

// 9. Message blocking: cannot send to blocked conversation
assert.ok(
  sql.includes('is_blocked = false'),
  'Messages insert policy must check conversation is not blocked'
);

// 10. Self-block prevention
assert.ok(
  sql.includes("reporter_id = (auth.jwt() ->> 'sub') and reported_id <> (auth.jwt() ->> 'sub')"),
  'Report policy must prevent self-reporting'
);
assert.ok(
  sql.includes("check (blocker_id <> blocked_id)"),
  'User blocks must prevent self-blocking'
);

// 11. File ends with migration end marker
assert.ok(
  sql.includes('202607240001_global_v1_core_schema.sql'),
  'Migration must reference its own filename'
);

// 12. Idempotent policy creation (DROP POLICY IF EXISTS before CREATE)
assert.ok(
  sql.includes('drop policy if exists'),
  'Must use DROP POLICY IF EXISTS for idempotent migrations'
);

console.log('PASS: Global V1 core schema migration validation — all checks passed');
