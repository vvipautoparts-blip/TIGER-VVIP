"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const POST_ID = "22222222-2222-4222-8222-222222222222";

function fixture() {
  const calls = [];
  const client = {
    async rpc(name, params) {
      calls.push({ name, params });
      return { data: { ok: true }, error: null };
    },
  };
  return { calls, runtime: createSocialRuntimeAdapters({ client }) };
}

test("safety runtime exposes UUID-only block state, block, unblock, and bounded block list RPCs", async () => {
  const { calls, runtime } = fixture();

  assert.equal((await runtime.safety.blockState(PROFILE_ID)).ok, true);
  assert.equal((await runtime.safety.block(PROFILE_ID)).ok, true);
  assert.equal((await runtime.safety.unblock(PROFILE_ID)).ok, true);
  assert.equal((await runtime.safety.listBlocks({ limit: 40 })).ok, true);

  assert.deepEqual(calls, [
    { name: "vvip_social_block_state", params: { p_peer_profile_id: PROFILE_ID } },
    { name: "vvip_social_block_profile", params: { p_peer_profile_id: PROFILE_ID } },
    { name: "vvip_social_unblock_profile", params: { p_peer_profile_id: PROFILE_ID } },
    { name: "vvip_social_list_my_blocks", params: { p_limit: 40 } },
  ]);
  assert.doesNotMatch(JSON.stringify(calls), /subject|clerk|user_/i);
});

test("safety runtime reports profiles and posts with fixed reasons and bounded optional details", async () => {
  const { calls, runtime } = fixture();

  assert.equal((await runtime.safety.reportProfile(PROFILE_ID, {
    reason: "harassment",
    details: "  repeated unwanted contact  ",
  })).ok, true);
  assert.equal((await runtime.safety.reportPost(POST_ID, {
    reason: "spam",
    details: "   ",
  })).ok, true);

  assert.deepEqual(calls, [
    { name: "vvip_social_submit_report", params: {
      p_target_kind: "profile", p_target_id: PROFILE_ID,
      p_reason: "harassment", p_details: "repeated unwanted contact",
    } },
    { name: "vvip_social_submit_report", params: {
      p_target_kind: "post", p_target_id: POST_ID,
      p_reason: "spam", p_details: null,
    } },
  ]);
});

test("safety runtime fails closed on malformed identifiers, reasons, details, limits, and identity fields", async () => {
  const { calls, runtime } = fixture();

  for (const result of [
    await runtime.safety.blockState("user_private"),
    await runtime.safety.block("not-a-uuid"),
    await runtime.safety.unblock(""),
    await runtime.safety.listBlocks({ limit: 0 }),
    await runtime.safety.listBlocks({ limit: 101 }),
    await runtime.safety.reportProfile(PROFILE_ID, { reason: "admin" }),
    await runtime.safety.reportPost(POST_ID, { reason: "spam", details: "x".repeat(1001) }),
    await runtime.safety.reportProfile(PROFILE_ID, { reason: "spam", subject: "user_secret" }),
  ]) assert.equal(result.ok, false);

  assert.deepEqual(calls, []);
});
