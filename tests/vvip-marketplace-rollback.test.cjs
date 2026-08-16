"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const hardening = require("../scripts/runtime/vvip-marketplace-rollback.js");

test("compatibility hardener preserves the trusted repository without adding a review bypass", () => {
  const repository = Object.freeze({
    createDraftWithMedia() {},
    prepareForPublication() {}
  });
  const hardened = hardening.hardenRepository(repository, {});
  assert.equal(hardened, repository);
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
