"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createSocialRuntimeAdapters } = require("../scripts/social/runtime-adapters.js");

function rateLimitedClient() {
  return {
    rpc() {
      return Promise.resolve({
        data: null,
        error: { message: "SOCIAL_SEARCH_RATE_LIMITED" },
        status: 429,
      });
    },
  };
}

test("Adaptive 30 Shield is isolated to Search and does not lengthen Feed cooldown", async () => {
  const social = createSocialRuntimeAdapters({ client: rateLimitedClient() });

  assert.deepEqual(await social.search.people("member"), {
    ok: false,
    code: "SOCIAL_RATE_LIMITED",
    retryAfterMs: 30000,
  });

  assert.deepEqual(await social.posts.readFeed(), {
    ok: false,
    code: "SOCIAL_RATE_LIMITED",
    retryAfterMs: 5000,
  });
});
