"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

function createRecorder(rows) {
  const calls = [];
  return {
    client: {
      rpc(name, params) {
        calls.push({ type: "rpc", name, params });
        return Promise.resolve({ data: rows, error: null });
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
  {
    post_id: "88888888-8888-4888-8888-888888888888",
    created_at: "2026-08-20T11:59:00.000Z",
  },
];

test("Gate 5 feed page uses server-side stable keyset ordering and limit+1 evidence", async () => {
  const recorder = createRecorder(rows);
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const result = await social.posts.readFeed({ limit: 2 });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, rows.slice(0, 2));
  assert.deepEqual(result.page, {
    hasMore: true,
    nextCursor: {
      createdAt: rows[1].created_at,
      postId: rows[1].post_id,
    },
  });
  assert.deepEqual(recorder.calls, [{
    type: "rpc",
    name: "vvip_social_feed_page",
    params: {
      p_limit: 2,
      p_before_created_at: null,
      p_before_post_id: null,
    },
  }]);
});

test("Gate 5 next page passes the strict keyset cursor to the safe feed RPC", async () => {
  const recorder = createRecorder(rows.slice(2));
  const social = createSocialRuntimeAdapters({ client: recorder.client });
  const cursor = {
    createdAt: rows[1].created_at,
    postId: rows[1].post_id,
  };

  const result = await social.posts.readFeed({ limit: 2, cursor });

  assert.equal(result.ok, true);
  assert.deepEqual(result.page, { hasMore: false, nextCursor: null });
  assert.deepEqual(recorder.calls, [{
    type: "rpc",
    name: "vvip_social_feed_page",
    params: {
      p_limit: 2,
      p_before_created_at: cursor.createdAt,
      p_before_post_id: cursor.postId,
    },
  }]);
});

test("Gate 5 rejects malformed feed cursors before any database call", async () => {
  const recorder = createRecorder(rows);
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
