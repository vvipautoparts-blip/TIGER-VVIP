"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.resolve(__dirname, "..");
const COMPOSER_PATH = path.join(ROOT, "scripts", "social", "post-composer.js");

test("real Social composer routes publication through the ONE FIELD dual-lane boundary when configured", async () => {
  delete require.cache[require.resolve(COMPOSER_PATH)];
  const { createSocialPostComposer } = require(COMPOSER_PATH);

  const draftInput = { value: "  أريد كورن فليكس للأطفال بدون سكر.  " };
  const audienceInput = { value: "friends" };
  const submitButton = { disabled: false };
  const statusHost = { textContent: "", setAttribute() {} };
  const sheet = { hidden: false, setAttribute() {} };
  let directRuntimeCalls = 0;
  let dualLaneCalls = 0;

  const composer = createSocialPostComposer({
    draftInput,
    audienceInput,
    submitButton,
    statusHost,
    sheet,
    runtime: {
      posts: {
        async create() {
          directRuntimeCalls += 1;
          return { ok: true, value: { post_id: "bypass" } };
        },
      },
    },
    auth: {
      async requireAuth(_capability, callback) {
        await callback();
        return true;
      },
    },
    dualLaneCommit: {
      async commit({ draft }) {
        dualLaneCalls += 1;
        assert.deepEqual(draft, {
          body: "أريد كورن فليكس للأطفال بدون سكر.",
          audience: "friends",
        });
        return {
          ok: true,
          code: "ONE_FIELD_SOCIAL_POST_PUBLISHED",
          publication: { post_id: "post_task4wired" },
          semantic: { status: "ready", code: null, capsule: { capsuleId: "capsule_task4wired" } },
        };
      },
    },
    authorityProvider: async () => ({ actor: { id: "user_task4owner" } }),
  });

  const result = await composer.submit();

  assert.equal(result.ok, true);
  assert.equal(dualLaneCalls, 1);
  assert.equal(directRuntimeCalls, 0, "composer must not bypass the configured dual-lane boundary");
});
