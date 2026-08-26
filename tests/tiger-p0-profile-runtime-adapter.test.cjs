"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

const PROFILE_ID = "11111111-1111-4111-8111-111111111111";

function recorder() {
  const calls = [];
  return {
    calls,
    client: {
      rpc(name, params) {
        calls.push({ name, params });
        return Promise.resolve({ data: { ok: true }, error: null });
      },
    },
  };
}

test("profile runtime exposes subject-blind surface, timeline, and owner-save RPCs", async () => {
  const state = recorder();
  const social = createSocialRuntimeAdapters({ client: state.client });

  assert.ok(social.profiles);
  assert.equal(typeof social.profiles.get, "function");
  assert.equal(typeof social.profiles.listPosts, "function");
  assert.equal(typeof social.profiles.save, "function");

  assert.equal((await social.profiles.get()).ok, true);
  assert.equal((await social.profiles.get(PROFILE_ID)).ok, true);
  assert.equal((await social.profiles.listPosts(PROFILE_ID, { cursor: null, limit: 25 })).ok, true);
  assert.equal((await social.profiles.save({
    displayName: " Tiger Member ",
    avatarUrl: " https://cdn.example.test/member.webp ",
    businessName: " Tiger Motors ",
    location: " Amman ",
    specialization: " Automotive ",
    businessDescription: " Trusted business profile ",
  })).ok, true);

  assert.deepEqual(state.calls, [
    {
      name: "vvip_social_get_profile_surface",
      params: { p_profile_id: null },
    },
    {
      name: "vvip_social_get_profile_surface",
      params: { p_profile_id: PROFILE_ID },
    },
    {
      name: "vvip_social_list_profile_posts",
      params: { p_profile_id: PROFILE_ID, p_cursor: null, p_limit: 25 },
    },
    {
      name: "vvip_upsert_my_social_profile",
      params: {
        p_display_name: "Tiger Member",
        p_avatar_url: "https://cdn.example.test/member.webp",
        p_business_name: "Tiger Motors",
        p_location: "Amman",
        p_specialization: "Automotive",
        p_business_description: "Trusted business profile",
      },
    },
  ]);

  for (const call of state.calls) {
    assert.doesNotMatch(JSON.stringify(call.params), /subject|clerk/i);
  }
});

test("profile runtime rejects malformed ids, cursors, limits, identity fields, and oversized drafts", async () => {
  const state = recorder();
  const social = createSocialRuntimeAdapters({ client: state.client });

  const invalidCalls = [
    social.profiles.get("bad"),
    social.profiles.listPosts("bad", { limit: 20 }),
    social.profiles.listPosts(PROFILE_ID, { cursor: "bad!", limit: 20 }),
    social.profiles.listPosts(PROFILE_ID, { limit: 0 }),
    social.profiles.save({ displayName: "Member", subject: "private" }),
    social.profiles.save({ displayName: "" }),
    social.profiles.save({ displayName: "x".repeat(161) }),
    social.profiles.save({ displayName: "Member", businessDescription: "x".repeat(2001) }),
  ];

  const results = await Promise.all(invalidCalls);
  for (const result of results) {
    assert.equal(result.ok, false);
    assert.match(result.code, /^SOCIAL_INVALID_PROFILE_/);
  }
  assert.equal(state.calls.length, 0);
});

test("profile runtime fails closed without an RPC client", async () => {
  const social = createSocialRuntimeAdapters({ client: null });
  assert.deepEqual(await social.profiles.get(), {
    ok: false,
    code: "SOCIAL_RUNTIME_UNAVAILABLE",
  });
});
