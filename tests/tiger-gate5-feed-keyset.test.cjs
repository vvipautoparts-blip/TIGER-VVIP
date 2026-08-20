"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createSocialFeedReadModel } = require("../scripts/social/feed-read-model.js");

const MIGRATION = path.join(
  __dirname,
  "../supabase/migrations/20260820007000_gate5_feed_keyset.sql"
);

function migration() {
  assert.equal(fs.existsSync(MIGRATION), true, "Gate 5 feed keyset migration must exist");
  return fs.readFileSync(MIGRATION, "utf8");
}

test("Gate 5 feed cursor is versioned, actor-bound, and tuple ordered without OFFSET", () => {
  const sql = migration();

  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.vvip_social_feed_read_keyset/i);
  assert.match(sql, /'v'\s*,\s*1/i);
  assert.match(sql, /'kind'\s*,\s*'social_feed'/i);
  assert.match(sql, /'actor'\s*,\s*v_actor/i);
  assert.match(sql, /v_cursor_actor\s*<>\s*v_actor/i);
  assert.match(sql, /\(post\.created_at,\s*post\.post_id\)\s*<\s*\(v_after_created_at,\s*v_after_post_id\)/i);
  assert.match(sql, /order\s+by\s+post\.created_at\s+desc\s*,\s*post\.post_id\s+desc/i);
  assert.doesNotMatch(sql, /\boffset\b/i);
});

test("Gate 5 feed RPC remains actor-derived, bounded, and browser-table independent", () => {
  const sql = migration();

  assert.match(sql, /vvip_marketplace_actor_id\s*\(\s*\)/i);
  assert.match(sql, /least\s*\(\s*greatest\s*\(\s*coalesce\s*\(\s*p_limit\s*,\s*20\s*\)\s*,\s*1\s*\)\s*,\s*100\s*\)/i);
  assert.match(sql, /security\s+definer\s+set\s+search_path\s*=\s*pg_catalog\s*,\s*public/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.vvip_social_feed_read_keyset/i);
});

test("feed read model forwards an opaque cursor and returns only a validated next cursor", async () => {
  const calls = [];
  const runtime = {
    posts: {
      async readFeed(options) {
        calls.push(options);
        return {
          ok: true,
          value: {
            items: [{
              post_id: "post_01",
              author_subject: "user_alice",
              body: "Gate 5",
              audience: "public",
              created_at: "2026-08-20T12:00:00.000Z",
              updated_at: "2026-08-20T12:00:00.000Z"
            }],
            next_cursor: "opaque-v1-cursor"
          }
        };
      }
    }
  };

  const result = await createSocialFeedReadModel({ runtime }).load({
    limit: 20,
    cursor: "opaque-v1-input"
  });

  assert.deepEqual(calls, [{ limit: 20, cursor: "opaque-v1-input" }]);
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 1);
  assert.equal(result.nextCursor, "opaque-v1-cursor");
});

test("feed read model rejects malformed cursors before persistence", async () => {
  let called = false;
  const runtime = {
    posts: {
      async readFeed() {
        called = true;
        return { ok: true, value: { items: [], next_cursor: null } };
      }
    }
  };

  const result = await createSocialFeedReadModel({ runtime }).load({ cursor: "x".repeat(2049) });
  assert.deepEqual(result, { ok: false, code: "SOCIAL_FEED_INVALID_CURSOR" });
  assert.equal(called, false);
});