"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20260821120000_orphan_safe_author_presentation.sql"
);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readMigration() {
  return fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
}

test("P0-B orphan-safe DB boundary exposes presentation identity only", () => {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    "forward migration for orphan-safe author presentation must exist"
  );

  const sql = readMigration();
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.vvip_social_feed_page\s*\(/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.vvip_social_post_create\s*\(/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.vvip_social_comment_list\s*\(/i);
  assert.match(sql, /author_profile_id/i);
  assert.match(sql, /author_display_name/i);
  assert.match(sql, /author_avatar_url/i);
  assert.match(sql, /author_available/i);
  assert.match(
    sql,
    /REVOKE\s+SELECT\s+ON\s+TABLE\s+public\.vvip_social_posts\s+FROM\s+authenticated/i,
    "raw post SELECT must be removed from browser roles"
  );
  assert.doesNotMatch(
    sql,
    /'author_subject'\s*,/i,
    "safe RPC payloads must not serialize Clerk subjects"
  );
});

test("deactivated or deleted actors fail closed at every integrated social mutation table", () => {
  const sql = readMigration();
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.vvip_social_actor_active\s*\(\s*\)/i);
  assert.match(sql, /profile_state\s*=\s*'active'/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.vvip_social_guard_active_actor_mutation\s*\(\s*\)/i);
  assert.match(sql, /SOCIAL_PROFILE_INACTIVE/i);

  const mutationTables = [
    "vvip_social_posts",
    "vvip_social_comments",
    "vvip_social_reactions",
    "vvip_social_bookmarks",
    "vvip_social_follows",
    "vvip_social_relationships",
  ];

  for (const tableName of mutationTables) {
    const trigger = new RegExp(
      `CREATE\\s+TRIGGER\\s+vvip_social_active_actor_[A-Za-z0-9_]+[\\s\\S]*?ON\\s+public\\.${tableName}[\\s\\S]*?vvip_social_guard_active_actor_mutation\\s*\\(\\s*\\)`,
      "i"
    );
    assert.match(sql, trigger, `${tableName} must be protected by the active-actor mutation guard`);
  }

  assert.doesNotMatch(
    sql,
    /vvip_social_actor_active\s*\([^)]/i,
    "lifecycle helper must never accept an arbitrary subject from the browser"
  );
});

test("social runtime reads and creates posts through safe RPCs rather than raw subject-bearing SELECT", () => {
  const runtime = read("scripts/social/runtime-adapters.js");
  assert.match(runtime, /client\.rpc\(\s*["']vvip_social_feed_page["']/);
  assert.match(runtime, /client\.rpc\(\s*["']vvip_social_post_create["']/);
  assert.doesNotMatch(
    runtime,
    /const\s+POST_SELECT\s*=\s*["'][^"']*author_subject/i,
    "browser post projection must not request author_subject"
  );
});

test("feed read-model consumes only safe presentation fields", () => {
  const model = read("scripts/social/feed-read-model.js");
  assert.doesNotMatch(model, /author_subject/);
  assert.match(model, /author_profile_id/);
  assert.match(model, /author_display_name/);
  assert.match(model, /author_avatar_url/);
  assert.match(model, /author_available/);
});

test("feed and comment renderers distinguish active authors from privacy-safe tombstones", () => {
  const feed = read("scripts/social/feed-controller.js");
  const comments = read("scripts/social/comments-controller.js");

  assert.match(feed, /item\.authorDisplayName/);
  assert.match(feed, /item\.authorAvailable/);
  assert.match(comments, /item\.authorDisplayName/);
  assert.match(comments, /item\.authorAvailable/);

  assert.doesNotMatch(feed, /authorSubject/);
  assert.doesNotMatch(comments, /authorSubject/);
});
