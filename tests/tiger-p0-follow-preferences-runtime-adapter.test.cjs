"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

const PROFILE_ID = "11111111-1111-4111-8111-111111111111";

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

test("follow runtime uses only profile UUID relationship-control RPCs", async () => {
  const { calls, runtime } = fixture();

  assert.equal((await runtime.follows.controls(PROFILE_ID)).ok, true);
  assert.equal((await runtime.follows.follow(PROFILE_ID)).ok, true);
  assert.equal((await runtime.follows.unfollow(PROFILE_ID)).ok, true);

  assert.deepEqual(calls, [
    { name: "vvip_social_get_relationship_controls", params: { p_profile_id: PROFILE_ID } },
    { name: "vvip_social_follow_profile", params: { p_profile_id: PROFILE_ID } },
    { name: "vvip_social_unfollow_profile", params: { p_profile_id: PROFILE_ID } },
  ]);
  assert.doesNotMatch(JSON.stringify(calls), /subject|clerk|user_/i);
});

test("feed preference runtime lists private state and accepts fixed UUID-bound actions", async () => {
  const { calls, runtime } = fixture();

  assert.equal((await runtime.feedPreferences.list()).ok, true);
  for (const action of [
    "mute", "unmute", "snooze_24h", "snooze_7d", "unsnooze",
    "prefer", "deprioritize", "normal",
  ]) {
    assert.equal((await runtime.feedPreferences.set(PROFILE_ID, { action })).ok, true);
  }

  assert.deepEqual(calls[0], {
    name: "vvip_social_list_feed_preferences",
    params: {},
  });
  assert.deepEqual(calls.slice(1), [
    "mute", "unmute", "snooze_24h", "snooze_7d", "unsnooze",
    "prefer", "deprioritize", "normal",
  ].map((action) => ({
    name: "vvip_social_set_feed_preference",
    params: { p_profile_id: PROFILE_ID, p_action: action },
  })));
});

test("follow and preference runtime rejects identifiers, widened input, and unknown actions before RPC", async () => {
  const { calls, runtime } = fixture();

  for (const result of [
    await runtime.follows.controls("user_private"),
    await runtime.follows.follow("not-a-uuid"),
    await runtime.follows.unfollow(""),
    await runtime.feedPreferences.set(PROFILE_ID, { action: "forever" }),
    await runtime.feedPreferences.set(PROFILE_ID, { action: "mute", subject: "user_secret" }),
    await runtime.feedPreferences.set("user_private", { action: "mute" }),
  ]) assert.equal(result.ok, false);

  assert.deepEqual(calls, []);
});
