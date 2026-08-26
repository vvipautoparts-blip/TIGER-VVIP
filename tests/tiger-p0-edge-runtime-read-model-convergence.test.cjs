"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");
const { createSocialFeedReadModel } = require("../scripts/social/feed-read-model.js");

const PROFILE_ALICE = "11111111-1111-4111-8111-111111111111";

function safePost(overrides) {
  return Object.assign({
    post_id: "post_edge_01",
    author_profile_id: PROFILE_ALICE,
    author_display_name: "Alice Tiger",
    author_avatar_url: null,
    author_available: true,
    body: "Edge runtime proof",
    audience: "public",
    created_at: "2026-08-21T13:00:00.000Z",
    updated_at: "2026-08-21T13:00:00.000Z",
  }, overrides || {});
}

function rpcClient(resolver) {
  const calls = [];
  return {
    calls,
    client: {
      rpc(name, args) {
        calls.push({ name, args });
        return resolver(name, args);
      },
    },
  };
}

test("P0-D runtime reads feed through the actor-bound keyset RPC with an opaque cursor", async () => {
  const recorder = rpcClient(() => Promise.resolve({
    data: { ok: true, items: [safePost()], next_cursor: "next_opaque_cursor" },
    error: null,
  }));
  const runtime = createSocialRuntimeAdapters({ client: recorder.client });

  const result = await runtime.posts.readFeed({ limit: 20, cursor: "opaque_cursor" });

  assert.deepEqual(recorder.calls, [{
    name: "vvip_social_feed_read_keyset",
    args: { p_cursor: "opaque_cursor", p_limit: 20 },
  }]);
  assert.deepEqual(result, {
    ok: true,
    value: { ok: true, items: [safePost()], next_cursor: "next_opaque_cursor" },
  });
});

test("P0-D runtime maps feed failures to the fixed opaque allowlist", async () => {
  const rateLimited = createSocialRuntimeAdapters({
    client: rpcClient(() => Promise.resolve({
      data: null,
      error: { status: 429, message: "provider secret rate detail" },
      status: 429,
    })).client,
  });
  assert.deepEqual(await rateLimited.posts.readFeed(), {
    ok: false,
    code: "SOCIAL_RATE_LIMITED",
    retryAfterMs: 5000,
  });

  const cursorMismatch = createSocialRuntimeAdapters({
    client: rpcClient(() => Promise.resolve({
      data: null,
      error: { message: "GATE5_CURSOR_CONTEXT_MISMATCH", details: "private detail" },
    })).client,
  });
  assert.deepEqual(await cursorMismatch.posts.readFeed(), {
    ok: false,
    code: "SOCIAL_FEED_STALE_CURSOR",
  });

  const inactive = createSocialRuntimeAdapters({
    client: rpcClient(() => Promise.resolve({
      data: null,
      error: { message: "SOCIAL_PROFILE_INACTIVE" },
    })).client,
  });
  assert.deepEqual(await inactive.posts.readFeed(), {
    ok: false,
    code: "SOCIAL_FEED_SESSION_STALE",
  });

  const transient = createSocialRuntimeAdapters({
    client: {
      rpc() {
        throw new Error("secret transport failure");
      },
    },
  });
  assert.deepEqual(await transient.posts.readFeed(), {
    ok: false,
    code: "SOCIAL_FEED_RETRYABLE",
  });
});

test("P0-D feed read model forwards opaque cursor and preserves safe next cursor", async () => {
  const calls = [];
  const feed = createSocialFeedReadModel({
    runtime: {
      posts: {
        async readFeed(options) {
          calls.push(options);
          return {
            ok: true,
            value: {
              ok: true,
              items: [safePost()],
              next_cursor: "next_opaque_cursor",
            },
          };
        },
      },
    },
  });

  const result = await feed.load({ limit: 20, cursor: "opaque_cursor" });

  assert.deepEqual(calls, [{ limit: 20, cursor: "opaque_cursor" }]);
  assert.equal(result.ok, true);
  assert.equal(result.nextCursor, "next_opaque_cursor");
  assert.equal(result.empty, false);
  assert.ok(result.items.every((item) => !Object.hasOwn(item, "authorSubject")));
});

test("P0-D preference-filtered page remains non-terminal when server has a next cursor", async () => {
  const feed = createSocialFeedReadModel({
    runtime: {
      posts: {
        async readFeed() {
          return {
            ok: true,
            value: {
              ok: true,
              items: [safePost()],
              next_cursor: "next_after_muted_page",
            },
          };
        },
      },
    },
    preferences: { mutedAuthors: [PROFILE_ALICE] },
    now: () => Date.parse("2026-08-21T13:00:00.000Z"),
  });

  const result = await feed.load({ limit: 20 });
  assert.deepEqual(result.items, []);
  assert.equal(result.nextCursor, "next_after_muted_page");
  assert.equal(result.empty, false);
});

test("P0-D feed read model passes only bounded controller failure codes", async () => {
  for (const expected of [
    { ok: false, code: "SOCIAL_FEED_STALE_CURSOR" },
    { ok: false, code: "SOCIAL_FEED_SESSION_STALE" },
    { ok: false, code: "SOCIAL_FEED_RETRYABLE" },
    { ok: false, code: "SOCIAL_RATE_LIMITED", retryAfterMs: 5000 },
  ]) {
    const feed = createSocialFeedReadModel({
      runtime: { posts: { readFeed: async () => expected } },
    });
    assert.deepEqual(await feed.load(), expected);
  }
});
