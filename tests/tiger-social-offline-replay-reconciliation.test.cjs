"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { reconcileSocialReplay } = require("../scripts/social/post-domain.js");

function baseState(overrides = {}) {
  return Object.freeze({
    bookmarked: false,
    following: false,
    repostCount: 0,
    ...overrides,
  });
}

function mutation(mutationId, sequence, kind, value, applied = true) {
  return Object.freeze({ mutationId, sequence, kind, value, applied });
}

test("duplicate replay receipt with the same mutation id is applied exactly once", () => {
  const repost = mutation("mut_repost_1", 1, "repost_commit", true);
  const result = reconcileSocialReplay(baseState({ repostCount: 4 }), [repost, repost]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.state, {
    bookmarked: false,
    following: false,
    repostCount: 5,
  });
  assert.deepEqual(result.appliedMutationIds, ["mut_repost_1"]);
});

test("terminal state is deterministic by journal sequence rather than network arrival order", () => {
  const follow = mutation("mut_follow_1", 10, "follow_set", true);
  const unfollow = mutation("mut_follow_2", 11, "follow_set", false);

  const forward = reconcileSocialReplay(baseState(), [follow, unfollow]);
  const reversed = reconcileSocialReplay(baseState(), [unfollow, follow]);

  assert.equal(forward.ok, true);
  assert.equal(reversed.ok, true);
  assert.deepEqual(forward.state, reversed.state);
  assert.equal(forward.state.following, false);
});

test("failed replay outcomes do not change server-authoritative state", () => {
  const result = reconcileSocialReplay(
    baseState({ bookmarked: true, following: true, repostCount: 7 }),
    [
      mutation("mut_bookmark_failed", 1, "bookmark_set", false, false),
      mutation("mut_follow_failed", 2, "follow_set", false, false),
      mutation("mut_repost_failed", 3, "repost_commit", true, false),
    ]
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.state, {
    bookmarked: true,
    following: true,
    repostCount: 7,
  });
  assert.deepEqual(result.appliedMutationIds, []);
});

test("same mutation id with conflicting payload fails closed", () => {
  const result = reconcileSocialReplay(baseState(), [
    mutation("mut_conflict", 1, "follow_set", true),
    mutation("mut_conflict", 1, "follow_set", false),
  ]);

  assert.deepEqual(result, {
    ok: false,
    error: "social_replay_idempotency_conflict",
  });
});

test("bookmark and follow reconciliation never manufactures repost counters", () => {
  const result = reconcileSocialReplay(baseState({ repostCount: 9 }), [
    mutation("mut_bookmark_1", 1, "bookmark_set", true),
    mutation("mut_follow_1", 2, "follow_set", true),
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.state, {
    bookmarked: true,
    following: true,
    repostCount: 9,
  });
});
