"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

function createRecorder(payload) {
  const calls = [];
  return {
    client: {
      rpc(name, params) {
        calls.push({ type: "rpc", name, params });
        return Promise.resolve({ data: payload, error: null });
      },
    },
    calls,
  };
}

const rows = [
  {
    post_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    created_at: "2026-08-20T12:00:00.000Z",
  },
  {
    post_id: "99999999-9999-4999-8999-999999999999",
    created_at: "2026-08-20T12:00:00.000Z",
  },
];

const NEXT_CURSOR = "eyJ2IjoyLCJraW5kIjoic29jaWFsX2ZlZWQifQ";

test("Gate 5 feed page delegates stable keyset ordering and limit+1 evidence to the server authority", async () => {
  const payload = { ok: true, items: rows, next_cursor: NEXT_CURSOR };
  const recorder = createRecorder(payload);
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const result = await social.posts.readFeed({ limit: 2 });

  assert.deepEqual(result, { ok: true, value: payload });
  assert.deepEqual(recorder.calls, [{
    type: "rpc",
    name: "vvip_social_feed_read_keyset",
    params: {
      p_cursor: null,
      p_limit: 2,
    },
  }]);
});

test("Gate 5 next page passes only the opaque actor-bound cursor to the safe feed RPC", async () => {
  const payload = { ok: true, items: [], next_cursor: null };
  const recorder = createRecorder(payload);
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const result = await social.posts.readFeed({ limit: 2, cursor: NEXT_CURSOR });

  assert.deepEqual(result, { ok: true, value: payload });
  assert.deepEqual(recorder.calls, [{
    type: "rpc",
    name: "vvip_social_feed_read_keyset",
    params: {
      p_cursor: NEXT_CURSOR,
      p_limit: 2,
    },
  }]);
});

test("Gate 5 rejects malformed feed cursors before any database call", async () => {
  const recorder = createRecorder({ ok: true, items: rows, next_cursor: null });
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const result = await social.posts.readFeed({
    limit: 2,
    cursor: {
      createdAt: "not-a-date",
      postId: "../../bad",
    },
  });

  assert.deepEqual(result, {
    ok: false,
    code: "SOCIAL_INVALID_FEED_CURSOR",
  });
  assert.equal(recorder.calls.length, 0);
});
