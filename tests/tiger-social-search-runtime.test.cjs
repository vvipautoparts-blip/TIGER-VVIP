"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

function recorder(result = { data: { ok: true, items: [], next_cursor: null }, error: null }) {
  const calls = [];
  return {
    calls,
    client: {
      rpc(name, params) {
        calls.push({ type: "rpc", name, params });
        return Promise.resolve(typeof result === "function" ? result({ name, params }) : result);
      },
      from(table) {
        calls.push({ type: "from", table });
        throw new Error("Social search must never read durable tables directly");
      },
    },
  };
}

test("P0-C exposes RPC-only People and Post search adapters", async () => {
  const rec = recorder();
  const social = createSocialRuntimeAdapters({ client: rec.client });

  assert.ok(social.search, "P0-C search adapter must exist");
  assert.equal(typeof social.search.people, "function");
  assert.equal(typeof social.search.posts, "function");

  assert.equal((await social.search.people("  نَمِر  ", { limit: 20 })).ok, true);
  assert.equal((await social.search.posts(" TIGER   Social ", { limit: 10 })).ok, true);

  assert.deepEqual(rec.calls, [
    {
      type: "rpc",
      name: "vvip_social_search_people",
      params: { p_query: "نمر", p_cursor: null, p_limit: 20 },
    },
    {
      type: "rpc",
      name: "vvip_social_search_posts",
      params: { p_query: "tiger social", p_cursor: null, p_limit: 10 },
    },
  ]);
  for (const call of rec.calls) {
    assert.equal(call.type, "rpc");
    assert.equal(Object.keys(call.params).some((key) => /subject/i.test(key)), false);
  }
});

test("P0-C rejects invalid search query, limit, and cursor before persistence", async () => {
  const rec = recorder();
  const social = createSocialRuntimeAdapters({ client: rec.client });
  assert.ok(social.search, "P0-C search adapter must exist");

  const invalid = [
    social.search.people("x"),
    social.search.people("x".repeat(161)),
    social.search.posts("ok", { limit: 0 }),
    social.search.posts("ok", { limit: 51 }),
    social.search.people("ok", { cursor: "bad!" }),
  ];

  for (const result of await Promise.all(invalid)) {
    assert.equal(result.ok, false);
    assert.match(result.code, /^SOCIAL_INVALID_SEARCH_/);
  }
  assert.equal(rec.calls.length, 0);
});

test("P0-C forwards only opaque actor/query-bound cursors", async () => {
  const rec = recorder();
  const social = createSocialRuntimeAdapters({ client: rec.client });
  assert.ok(social.search, "P0-C search adapter must exist");
  const cursor = "Abcdefgh_12345678";

  assert.equal((await social.search.people("member", { cursor, limit: 5 })).ok, true);
  assert.deepEqual(rec.calls[0], {
    type: "rpc",
    name: "vvip_social_search_people",
    params: { p_query: "member", p_cursor: cursor, p_limit: 5 },
  });
});

test("P0-C maps rate-limit and stale-cursor failures to opaque search codes", async () => {
  const rate = recorder({ data: null, error: { message: "SOCIAL_SEARCH_RATE_LIMITED" }, status: 429 });
  const rateSearch = createSocialRuntimeAdapters({ client: rate.client });
  assert.ok(rateSearch.search, "P0-C search adapter must exist");
  assert.deepEqual(await rateSearch.search.people("member"), {
    ok: false,
    code: "SOCIAL_RATE_LIMITED",
    retryAfterMs: 30000,
  });

  const stale = recorder({ data: null, error: { message: "GATE5_CURSOR_CONTEXT_MISMATCH" } });
  const staleSearch = createSocialRuntimeAdapters({ client: stale.client });
  assert.deepEqual(await staleSearch.search.posts("member"), {
    ok: false,
    code: "SOCIAL_SEARCH_STALE_CURSOR",
  });
});
