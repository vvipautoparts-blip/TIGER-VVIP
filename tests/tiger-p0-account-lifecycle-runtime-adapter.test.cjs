"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

test("account lifecycle runtime uses only subject-blind self RPCs", async () => {
  const calls = [];
  const runtime = createSocialRuntimeAdapters({ client: { async rpc(name, params) {
    calls.push({ name, params });
    return { data: { ok: true }, error: null };
  } } });

  assert.equal((await runtime.accountLifecycle.state()).ok, true);
  assert.equal((await runtime.accountLifecycle.deactivate()).ok, true);
  assert.equal((await runtime.accountLifecycle.reactivate()).ok, true);
  assert.deepEqual(calls, [
    { name: "vvip_social_get_my_lifecycle_state", params: {} },
    { name: "vvip_deactivate_my_social_profile", params: {} },
    { name: "vvip_reactivate_my_social_profile", params: {} },
  ]);
  assert.doesNotMatch(JSON.stringify(calls), /subject|user_/i);
});

test("account lifecycle runtime fails closed without an RPC client", async () => {
  const runtime = createSocialRuntimeAdapters({ client: null });
  assert.equal((await runtime.accountLifecycle.state()).ok, false);
  assert.equal((await runtime.accountLifecycle.deactivate()).ok, false);
  assert.equal((await runtime.accountLifecycle.reactivate()).ok, false);
});
