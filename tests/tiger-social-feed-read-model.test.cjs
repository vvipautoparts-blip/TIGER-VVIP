"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createSocialFeedReadModel,
  normalizeFeedPost,
} = require("../scripts/social/feed-read-model.js");

const PROFILE_ALICE = "11111111-1111-4111-8111-111111111111";
const PROFILE_BOB = "22222222-2222-4222-8222-222222222222";

function frozenPost(overrides) {
  return Object.assign({
    post_id: "post_01",
    author_profile_id: PROFILE_ALICE,
    author_display_name: "Alice Tiger",
    author_avatar_url: "https://example.invalid/alice.png",
    author_available: true,
    body: "Hello TIGER",
    audience: "friends",
    created_at: "2026-08-18T09:00:00.000Z",
    updated_at: "2026-08-18T09:00:00.000Z",
  }, overrides || {});
}

test("normalizes a trusted social post into a minimal immutable safe-presentation feed item", () => {
  const result = normalizeFeedPost(frozenPost());

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    id: "post_01",
    authorProfileId: PROFILE_ALICE,
    authorDisplayName: "Alice Tiger",
    authorAvatarUrl: "https://example.invalid/alice.png",
    authorAvailable: true,
    body: "Hello TIGER",
    audience: "friends",
    createdAt: "2026-08-18T09:00:00.000Z",
    updatedAt: "2026-08-18T09:00:00.000Z",
  });
  assert.equal(Object.hasOwn(result.value, "authorSubject"), false);
  assert.equal(Object.isFrozen(result.value), true);
});

test("normalizes unavailable historical authors only through the neutral tombstone", () => {
  const result = normalizeFeedPost(frozenPost({
    author_profile_id: null,
    author_display_name: "عضو غير متاح",
    author_avatar_url: null,
    author_available: false,
  }));

  assert.equal(result.ok, true);
  assert.equal(result.value.authorProfileId, null);
  assert.equal(result.value.authorDisplayName, "عضو غير متاح");
  assert.equal(result.value.authorAvatarUrl, null);
  assert.equal(result.value.authorAvailable, false);
});

test("rejects malformed or authority-expanding post rows fail closed", () => {
  const invalidRows = [
    null,
    frozenPost({ post_id: "../post" }),
    frozenPost({ author_profile_id: "user_alice" }),
    frozenPost({ author_display_name: "" }),
    frozenPost({ author_avatar_url: 42 }),
    frozenPost({ author_available: "true" }),
    frozenPost({ author_available: false }),
    frozenPost({ author_available: false, author_profile_id: null, author_display_name: "Deleted member", author_avatar_url: null }),
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

test("feed row normalization mirrors Unicode code-point text bounds", () => {
  assert.equal(normalizeFeedPost(frozenPost({ body: "\n\t 　" })).ok, false);
  assert.equal(normalizeFeedPost(frozenPost({ body: " padded " })).ok, false);
  assert.equal(normalizeFeedPost(frozenPost({ body: "😀".repeat(5000) })).ok, true);
  assert.equal(normalizeFeedPost(frozenPost({ body: "😀".repeat(5001) })).ok, false);
});

test("feed load delegates visibility to trusted persistence and preserves newest-first order", async () => {
  const calls = [];
  const runtime = {
    posts: {
      async readFeed(options) {
        calls.push(options);
        return {
          ok: true,
          value: {
            items: [
              frozenPost({ post_id: "post_new", author_profile_id: PROFILE_ALICE, created_at: "2026-08-18T11:00:00.000Z", updated_at: "2026-08-18T11:00:00.000Z" }),
              frozenPost({ post_id: "post_old", author_profile_id: PROFILE_BOB, author_display_name: "Bob Tiger", created_at: "2026-08-18T10:00:00.000Z", updated_at: "2026-08-18T10:00:00.000Z" }),
            ],
            next_cursor: null,
          },
        };
      },
    },
  };

  const feed = createSocialFeedReadModel({ runtime });
  const result = await feed.load({ limit: 25 });

  assert.deepEqual(calls, [{ limit: 25, cursor: null }]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.items.map((item) => item.id), ["post_new", "post_old"]);
  assert.equal(result.empty, false);
  assert.equal(result.nextCursor, null);
  assert.equal(Object.isFrozen(result.items), true);
  assert.ok(result.items.every((item) => !Object.hasOwn(item, "authorSubject")));
});

test("feed load preserves unavailable historical posts rather than dropping them", async () => {
  const feed = createSocialFeedReadModel({
    runtime: {
      posts: {
        readFeed: async () => ({
          ok: true,
          value: {
            items: [frozenPost({
              post_id: "post_orphan",
              author_profile_id: null,
              author_display_name: "عضو غير متاح",
              author_avatar_url: null,
              author_available: false,
            })],
            next_cursor: null,
          },
        }),
      },
    },
  });

  const result = await feed.load();
  assert.equal(result.ok, true);
  assert.deepEqual(result.items.map((item) => item.id), ["post_orphan"]);
  assert.equal(result.items[0].authorAvailable, false);
  assert.equal(result.nextCursor, null);
});

test("feed load returns an explicit empty snapshot", async () => {
  const feed = createSocialFeedReadModel({
    runtime: { posts: { readFeed: async () => ({ ok: true, value: { items: [], next_cursor: null } }) } },
  });

  assert.deepEqual(await feed.load(), {
    ok: true,
    items: [],
    empty: true,
    rejectedCount: 0,
    nextCursor: null,
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

test("malformed feed rows are isolated and reported without exceeding the requested bound", async () => {
  const feed = createSocialFeedReadModel({
    runtime: {
      posts: {
        readFeed: async () => ({
          ok: true,
          value: {
            items: [
              frozenPost({ post_id: "post_good_1" }),
              frozenPost({ post_id: "post_bad", author_profile_id: "user_legacy" }),
              frozenPost({ post_id: "post_good_2" }),
              frozenPost({ post_id: "post_overflow" }),
            ],
            next_cursor: null,
          },
        }),
      },
    },
  });

  assert.deepEqual(await feed.load({ limit: 3 }), {
    ok: true,
    items: [
      {
        id: "post_good_1",
        authorProfileId: PROFILE_ALICE,
        authorDisplayName: "Alice Tiger",
        authorAvatarUrl: "https://example.invalid/alice.png",
        authorAvailable: true,
        body: "Hello TIGER",
        audience: "friends",
        createdAt: "2026-08-18T09:00:00.000Z",
        updatedAt: "2026-08-18T09:00:00.000Z",
      },
      {
        id: "post_good_2",
        authorProfileId: PROFILE_ALICE,
        authorDisplayName: "Alice Tiger",
        authorAvatarUrl: "https://example.invalid/alice.png",
        authorAvailable: true,
        body: "Hello TIGER",
        audience: "friends",
        createdAt: "2026-08-18T09:00:00.000Z",
        updatedAt: "2026-08-18T09:00:00.000Z",
      },
    ],
    empty: false,
    nextCursor: null,
    rejectedCount: 2,
  });
});
