"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

function createRecorder(rows) {
  const calls = [];

  function query(table) {
    const state = {
      table,
      orders: [],
      limit: null,
      or: null,
    };

    const builder = {
      select(selection) {
        calls.push({ type: "select", table, selection });
        return builder;
      },
      order(column, options) {
        state.orders.push([column, options]);
        calls.push({ type: "order", table, column, options });
        return builder;
      },
      or(expression) {
        state.or = expression;
        calls.push({ type: "or", table, expression });
        return builder;
      },
      limit(value) {
        state.limit = value;
        calls.push({ type: "limit", table, value });
        return builder;
      },
      then(resolve, reject) {
        const data = rows.slice(0, state.limit || rows.length);
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };

    return builder;
  }

  return {
    client: { from: query },
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

test("Gate 5 feed page uses stable created_at/post_id keyset ordering and limit+1 evidence", async () => {
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

  const orders = recorder.calls.filter((call) => call.type === "order");
  assert.deepEqual(orders, [
    { type: "order", table: "vvip_social_posts", column: "created_at", options: { ascending: false } },
    { type: "order", table: "vvip_social_posts", column: "post_id", options: { ascending: false } },
  ]);
  assert.ok(recorder.calls.some((call) => call.type === "limit" && call.value === 3));
});

test("Gate 5 next page applies strict keyset cursor before returning rows", async () => {
  const recorder = createRecorder(rows.slice(2));
  const social = createSocialRuntimeAdapters({ client: recorder.client });
  const cursor = {
    createdAt: rows[1].created_at,
    postId: rows[1].post_id,
  };

  const result = await social.posts.readFeed({ limit: 2, cursor });

  assert.equal(result.ok, true);
  assert.deepEqual(result.page, { hasMore: false, nextCursor: null });

  const cursorCall = recorder.calls.find((call) => call.type === "or");
  assert.ok(cursorCall, "expected a keyset cursor filter");
  assert.equal(
    cursorCall.expression,
    `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},post_id.lt.${cursor.postId})`
  );
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
