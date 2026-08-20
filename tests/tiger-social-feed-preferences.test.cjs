"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyFeedPreferences,
  createSocialFeedReadModel,
} = require("../scripts/social/feed-read-model.js");

function item(id, authorSubject, audience = "public") {
  return Object.freeze({
    id,
    authorSubject,
    body: `post-${id}`,
    audience,
    createdAt: "2026-08-20T18:00:00.000Z",
    updatedAt: "2026-08-20T18:00:00.000Z",
  });
}

test("mute and active snooze only suppress already-authorized feed items", () => {
  const authorized = Object.freeze([
    item("p1", "user_alpha", "friends"),
    item("p2", "user_muted"),
    item("p3", "user_snoozed", "only_me"),
    item("p4", "user_visible"),
  ]);

  const result = applyFeedPreferences(
    authorized,
    {
      mutedAuthors: ["user_muted"],
      snoozedUntilByAuthor: { user_snoozed: 2_000 },
    },
    1_000
  );

  assert.deepEqual(result.map((entry) => entry.id), ["p1", "p4"]);
  assert.ok(result.every((entry) => authorized.includes(entry)), "presentation policy may only return input items");
  assert.equal(authorized[0].audience, "friends");
  assert.equal(authorized[2].audience, "only_me");
});

test("expired snooze restores the authorized item without changing authorization data", () => {
  const snoozed = item("p1", "user_snoozed", "friends");
  const authorized = Object.freeze([snoozed]);

  const result = applyFeedPreferences(
    authorized,
    { snoozedUntilByAuthor: { user_snoozed: 2_000 } },
    2_000
  );

  assert.deepEqual(result, [snoozed]);
  assert.strictEqual(result[0], snoozed);
  assert.equal(result[0].audience, "friends");
});

test("prefer and deprioritize reorder stably without introducing new feed items", () => {
  const a1 = item("p1", "user_normal");
  const a2 = item("p2", "user_preferred");
  const a3 = item("p3", "user_normal_two");
  const a4 = item("p4", "user_deprioritized");
  const a5 = item("p5", "user_preferred");
  const authorized = Object.freeze([a1, a2, a3, a4, a5]);

  const result = applyFeedPreferences(
    authorized,
    {
      preferredAuthors: ["user_preferred"],
      deprioritizedAuthors: ["user_deprioritized"],
    },
    1_000
  );

  assert.deepEqual(result, [a2, a5, a1, a3, a4]);
  assert.ok(result.every((entry) => authorized.includes(entry)));
  assert.equal(new Set(result).size, result.length, "presentation ordering cannot duplicate durable feed items");
});

test("malformed or unknown preferences cannot widen the authorized feed", () => {
  const authorized = Object.freeze([item("p1", "user_alpha")]);

  const result = applyFeedPreferences(
    authorized,
    {
      mutedAuthors: [null, "not-a-user", "user_missing"],
      snoozedUntilByAuthor: { "not-a-user": Number.POSITIVE_INFINITY, user_missing: 9_999 },
      preferredAuthors: ["user_missing"],
      deprioritizedAuthors: { user_alpha: true },
      injectedItems: [item("evil", "user_evil")],
    },
    1_000
  );

  assert.deepEqual(result, authorized);
  assert.ok(result.every((entry) => authorized.includes(entry)));
});

test("feed read model applies presentation preferences only after runtime authorization", async () => {
  const runtimeRows = [
    {
      post_id: "p1",
      author_subject: "user_visible",
      body: "visible",
      audience: "public",
      created_at: "2026-08-20T18:00:00.000Z",
      updated_at: "2026-08-20T18:00:00.000Z",
    },
    {
      post_id: "p2",
      author_subject: "user_muted",
      body: "muted",
      audience: "friends",
      created_at: "2026-08-20T18:00:01.000Z",
      updated_at: "2026-08-20T18:00:01.000Z",
    },
  ];

  const runtime = {
    posts: {
      readFeed: async () => ({ ok: true, value: runtimeRows }),
    },
  };

  const model = createSocialFeedReadModel({
    runtime,
    preferences: { mutedAuthors: ["user_muted"] },
    now: () => 1_000,
  });

  const snapshot = await model.load({ limit: 20 });
  assert.equal(snapshot.ok, true);
  assert.deepEqual(snapshot.items.map((entry) => entry.id), ["p1"]);
  assert.equal(snapshot.items[0].audience, "public");
});
