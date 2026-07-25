#!/usr/bin/env node
// VVIP TIGER — RLS Isolation Test Specification
// These tests verify the DESIGN of RLS policies in migration files.
// For full execution against a live database, apply migrations to Supabase and run as integration tests.
// This test validates that the migration SQL contains the correct policy structure.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/202607240001_global_v1_core_schema.sql');
const sql = fs.readFileSync(MIGRATION, 'utf8');

// ============================================================
// 1. DENY BY DEFAULT: RLS enabled on all tables
// ============================================================
const tables = [
  'vvip_sectors', 'vvip_categories', 'vvip_listings',
  'vvip_listing_status_history', 'vvip_favorites',
  'vvip_conversations', 'vvip_messages',
  'vvip_notification_events', 'vvip_reports',
  'vvip_support_tickets', 'vvip_consents', 'vvip_user_blocks'
];

for (const table of tables) {
  assert.ok(
    sql.includes(`alter table ${table} enable row level security`),
    `DENY BY DEFAULT: RLS must be enabled on ${table}`
  );
}

// ============================================================
// 2. IDOR Prevention: Owner-only access via Clerk JWT sub
// ============================================================

// Listings: owner can only see own listings
assert.ok(
  sql.includes("clerk_user_id = (auth.jwt() ->> 'sub')"),
  'Listings must use clerk_user_id JWT sub check (IDOR prevention)'
);

// Messages: only participants see their messages
assert.ok(
  sql.includes("participant_a = (auth.jwt() ->> 'sub') or participant_b = (auth.jwt() ->> 'sub')"),
  'Conversations must check participant membership (IDOR prevention)'
);

// Notifications: recipient-only access
assert.ok(
  sql.includes("recipient_id = (auth.jwt() ->> 'sub')"),
  'Notifications must be recipient-only (IDOR prevention)'
);

// ============================================================
// 3. No auth.uid() — must use Clerk JWT sub
// ============================================================
assert.ok(
  !sql.includes('auth.uid()'),
  'Must NOT use auth.uid() — project uses Clerk JWT, not Supabase native auth'
);

// ============================================================
// 4. Messaging: Cannot send to blocked conversation
// ============================================================
assert.ok(
  sql.includes('is_blocked = false'),
  'Message insert policy must enforce is_blocked = false'
);

// ============================================================
// 5. Self-report prevention
// ============================================================
assert.ok(
  sql.includes("reported_id <> (auth.jwt() ->> 'sub')"),
  'Report policy must prevent self-reporting'
);

// ============================================================
// 6. Self-block prevention
// ============================================================
assert.ok(
  sql.includes('check (blocker_id <> blocked_id)'),
  'User blocks must prevent self-blocking via DB constraint'
);

// ============================================================
// 7. Listing ownership on insert
// ============================================================
assert.ok(
  sql.includes("Owner inserts own listing"),
  'Listing insert policy must be named for traceability'
);

// ============================================================
// 8. Status history: owner can only read their own history
// ============================================================
assert.ok(
  sql.includes("listing_id in ("),
  'Listing status history policy must use subquery on owner listings'
);

// ============================================================
// 9. Favorites: scoped to owner only (all operations)
// ============================================================
assert.ok(
  sql.includes('vvip_favorites for all'),
  'Favorites must use FOR ALL policy (insert, select, delete scoped to owner)'
);

// ============================================================
// 10. Public listing visibility: published only
// ============================================================
assert.ok(
  sql.includes("Anyone reads published listings"),
  'Published listings must be readable by anyone (without authentication)'
);
assert.ok(
  sql.includes("status = 'published'"),
  'Anonymous access must be restricted to published status only'
);

// ============================================================
// 11. Taxonomy read-only for all users
// ============================================================
assert.ok(
  sql.includes("Anyone reads sectors"),
  'Sectors must be readable by anyone (public taxonomy)'
);
assert.ok(
  sql.includes("Anyone reads categories"),
  'Categories must be readable by anyone (public taxonomy)'
);

console.log('PASS: RLS isolation design validation — all policy structures verified');
