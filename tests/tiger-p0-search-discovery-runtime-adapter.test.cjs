"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

test("search runtime uses bounded query and discovery RPCs without identity input", async () => {
  const calls = [];
  const runtime = createSocialRuntimeAdapters({ client: { async rpc(name, params) {
    calls.push({ name, params });
    return { data: { ok: true, profiles: [], posts: [] }, error: null };
  } } });

  assert.equal((await runtime.search.query("  brake parts  ", { limit: 12 })).ok, true);
  assert.equal((await runtime.search.discover({ limit: 8 })).ok, true);
  assert.deepEqual(calls, [
    { name: "vvip_social_search_discovery", params: { p_query: "brake parts", p_limit: 12 } },
    { name: "vvip_social_discover_profiles", params: { p_limit: 8 } },
  ]);
  assert.doesNotMatch(JSON.stringify(calls), /subject|clerk|user_/i);
});

test("search runtime rejects short, oversized, widened, and malformed input before RPC", async () => {
  const calls = [];
  const runtime = createSocialRuntimeAdapters({ client: { async rpc(name, params) {
    calls.push({ name, params });
    return { data: {}, error: null };
  } } });

  for (const result of [
    await runtime.search.query("a", { limit: 10 }),
    await runtime.search.query("x".repeat(101), { limit: 10 }),
    await runtime.search.query("cars", { limit: 0 }),
    await runtime.search.query("cars", { limit: 26 }),
    await runtime.search.query("cars", { limit: 10, subject: "user_secret" }),
    await runtime.search.discover({ limit: 0 }),
    await runtime.search.discover({ limit: 26 }),
  ]) assert.equal(result.ok, false);
  assert.deepEqual(calls, []);
});
