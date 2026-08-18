"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createSocialFeedReadModel,
  normalizeFeedPost,
} = require("../scripts/social/feed-read-model.js");

function frozenPost(overrides) {
  return Object.assign({
    post_id: "post_01",
    author_subject: "user_alice",
    body: "Hello TIGER",
    audience: "friends",
    created_at: "2026-08-18T09:00:00.000Z",
    updated_at: "2026-08-18T09:00:00.000Z",
  }, overrides || {});
}

test("normalizes a trusted social post into a minimal immutable feed item", () => {
  const result = normalizeFeedPost(frozenPost());

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    id: "post_01",
    authorSubject: "user_alice",
    body: "Hello TIGER",
    audience: "friends",
    createdAt: "2026-08-18T09:00:00.000Z",
    updatedAt: "2026-08-18T09:00:00.000Z",
  });
  assert.equal(Object.isFrozen(result.value), true);
});

test("rejects malformed or authority-expanding post rows fail closed", () => {
  const invalidRows = [
    null,
    frozenPost({ post_id: "../post" }),
    frozenPost({ author_subject: "alice" }),
    frozenPost({ body: "" }),
    frozenPost({ body: "x".repeat(5001) }),
    frozenPost({ audience: "everyone" }),
    frozenPost({ created_at: "not-a-date" }),
    frozenPost({ updated_at: "not-a-date" }),
  ];

  for (const row of invalidRows) {
    const result = normalizeFeedPost(row);
    assert.equal(result.ok, false);
    assert.match(result.code, /^SOCIAL_FEED_INVALID_/);
  }
});

test("feed load delegates visibility to trusted persistence and preserves newest-first order", async () => {
  const calls = [];
  const runtime = {
    posts: {
      async readFeed(options) {
        calls.push(options);
        return {
          ok: true,
          value: [
            frozenPost({ post_id: "post_new", created_at: "2026-08-18T11:00:00.000Z", updated_at: "2026-08-18T11:00:00.000Z" }),
            frozenPost({ post_id: "post_old", created_at: "2026-08-18T10:00:00.000Z", updated_at: "2026-08-18T10:00:00.000Z" }),
          ],
        };
      },
    },
  };

  const feed = createSocialFeedReadModel({ runtime });
  const result = await feed.load({ limit: 25 });

  assert.deepEqual(calls, [{ limit: 25 }]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.items.map((item) => item.id), ["post_new", "post_old"]);
  assert.equal(result.empty, false);
  assert.equal(Object.isFrozen(result.items), true);
});

test("feed load returns an explicit empty snapshot", async () => {
  const feed = createSocialFeedReadModel({
    runtime: { posts: { readFeed: async () => ({ ok: true, value: [] }) } },
  });

  assert.deepEqual(await feed.load(), {
    ok: true,
    items: [],
    empty: true,
  });
});

test("feed read fails closed when runtime is missing, persistence fails, or payload is malformed", async () => {
  const unavailable = createSocialFeedReadModel({ runtime: null });
  assert.deepEqual(await unavailable.load(), {
    ok: false,
    code: "SOCIAL_FEED_RUNTIME_UNAVAILABLE",
  });

  const failed = createSocialFeedReadModel({
    runtime: { posts: { readFeed: async () => ({ ok: false, code: "SOCIAL_PERSISTENCE_FAILED" }) } },
  });
  assert.deepEqual(await failed.load(), {
    ok: false,
    code: "SOCIAL_FEED_READ_FAILED",
  });

  const malformed = createSocialFeedReadModel({
    runtime: { posts: { readFeed: async () => ({ ok: true, value: { post_id: "p1" } }) } },
  });
  assert.deepEqual(await malformed.load(), {
    ok: false,
    code: "SOCIAL_FEED_INVALID_PAYLOAD",
  });
});

test("one malformed row blocks the whole snapshot instead of silently widening trust", async () => {
  const feed = createSocialFeedReadModel({
    runtime: {
      posts: {
        readFeed: async () => ({
          ok: true,
          value: [frozenPost(), frozenPost({ author_subject: "legacy-user" })],
        }),
      },
    },
  });

  assert.deepEqual(await feed.load(), {
    ok: false,
    code: "SOCIAL_FEED_INVALID_ROW",
  });
});
