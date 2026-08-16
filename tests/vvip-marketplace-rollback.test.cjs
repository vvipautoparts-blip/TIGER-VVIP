"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const hardening = require("../scripts/runtime/vvip-marketplace-rollback.js");

test("compatibility hardener wraps trusted repository without adding a review bypass", () => {
  const repository = Object.freeze({
    createDraftWithMedia() {},
    prepareForPublication() {},
    listPublic() {}
  });
  const hardened = hardening.hardenRepository(repository, {});
  assert.notEqual(hardened, repository);
  assert.equal(typeof hardened.createDraftWithMedia, "function");
  assert.equal(typeof hardened.listPublic, "function");
  assert.equal(hardened.submitForReview, undefined);
  assert.equal(hardened.createAndSubmit, undefined);
});

test("compatibility hardener fails closed if a legacy browser publication bypass reappears", () => {
  const repository = {
    createDraftWithMedia() {},
    prepareForPublication() {},
    submitForReview() {}
  };
  assert.throws(
    () => hardening.hardenRepository(repository, {}),
    { code: "MARKETPLACE_LEGACY_PUBLICATION_BYPASS_PRESENT" }
  );
});

test("media finalizer URL must be configured as HTTPS before any browser finalization call", async () => {
  const client = { rpc: async () => ({ data: [{ media_id: "11111111-1111-4111-8111-111111111111", finalization_token: "a".repeat(64) }], error: null }) };
  await assert.rejects(
    () => hardening.finalizeMediaRow({ client, config: {}, fetch: async () => { throw new Error("must not fetch"); } }, "11111111-1111-4111-8111-111111111111"),
    { code: "MEDIA_FINALIZER_URL_REQUIRED" }
  );
});
