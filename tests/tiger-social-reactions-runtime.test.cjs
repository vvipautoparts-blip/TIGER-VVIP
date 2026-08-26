"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  createSocialRuntimeAdapters,
  SOCIAL_REACTION_TYPES,
} = require("../scripts/social/runtime-adapters.js");

const POST_ID = "11111111-1111-4111-8111-111111111111";

function rpcRecorder(resolver) {
  const calls = [];
  return {
    calls,
    client: {
      from(table) {
        calls.push({ type: "from", table });
        throw new Error("reactions must not use direct table access");
      },
      rpc(name, payload) {
        calls.push({ type: "rpc", name, payload });
        return Promise.resolve(resolver(name, payload));
      },
    },
  };
}

test("reaction runtime exposes the seven approved familiar reaction types", () => {
  assert.deepEqual(SOCIAL_REACTION_TYPES, [
    "like", "love", "support", "haha", "wow", "sad", "angry",
  ]);
});

test("reaction runtime uses only bounded RPCs and never direct reactions table access", async () => {
  const recorder = rpcRecorder((name) => ({
    data: { ok: true, post_id: POST_ID, total: name === "vvip_social_remove_reaction" ? 0 : 1, counts: {}, viewer_reaction: null },
    error: null,
  }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  assert.equal((await social.reactions.summary(POST_ID)).ok, true);
  assert.equal((await social.reactions.set(POST_ID, "love")).ok, true);
  assert.equal((await social.reactions.remove(POST_ID)).ok, true);

  assert.deepEqual(recorder.calls, [
    { type: "rpc", name: "vvip_social_reaction_summary", payload: { p_post_id: POST_ID } },
    { type: "rpc", name: "vvip_social_set_reaction", payload: { p_post_id: POST_ID, p_reaction_type: "love" } },
    { type: "rpc", name: "vvip_social_remove_reaction", payload: { p_post_id: POST_ID } },
  ]);
});

test("reaction runtime validates post UUID and reaction before any RPC", async () => {
  const recorder = rpcRecorder(() => ({ data: null, error: null }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });

  const results = await Promise.all([
    social.reactions.summary("post_01"),
    social.reactions.set(POST_ID, "care-copy"),
    social.reactions.remove("../../post"),
  ]);

  for (const result of results) {
    assert.equal(result.ok, false);
    assert.match(result.code, /^SOCIAL_INVALID_/);
  }
  assert.equal(recorder.calls.length, 0);
});

test("reaction runtime fails closed and never exposes provider errors", async () => {
  const unavailable = createSocialRuntimeAdapters({ client: null });
  assert.deepEqual(await unavailable.reactions.summary(POST_ID), {
    ok: false,
    code: "SOCIAL_RUNTIME_UNAVAILABLE",
  });

  const recorder = rpcRecorder(() => ({ data: null, error: { message: "sensitive provider detail" } }));
  const social = createSocialRuntimeAdapters({ client: recorder.client });
  assert.deepEqual(await social.reactions.set(POST_ID, "like"), {
    ok: false,
    code: "SOCIAL_PERSISTENCE_FAILED",
  });
});

test("browser reaction runtime source does not query the reactions table directly", () => {
  const source = fs.readFileSync("scripts/social/runtime-adapters.js", "utf8");
  assert.doesNotMatch(source, /\.from\(\s*["']vvip_social_reactions["']\s*\)/);
  assert.match(source, /vvip_social_reaction_summary/);
  assert.match(source, /vvip_social_set_reaction/);
  assert.match(source, /vvip_social_remove_reaction/);
});
