"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyFeedPreferences,
  createSocialFeedReadModel,
} = require("../scripts/social/feed-read-model.js");

const PROFILE_ALPHA = "11111111-1111-4111-8111-111111111111";
const PROFILE_MUTED = "22222222-2222-4222-8222-222222222222";
const PROFILE_SNOOZED = "33333333-3333-4333-8333-333333333333";
const PROFILE_VISIBLE = "44444444-4444-4444-8444-444444444444";
const PROFILE_PREFERRED = "55555555-5555-4555-8555-555555555555";
const PROFILE_NORMAL = "66666666-6666-4666-8666-666666666666";
const PROFILE_NORMAL_TWO = "77777777-7777-4777-8777-777777777777";
const PROFILE_DEPRIORITIZED = "88888888-8888-4888-8888-888888888888";

function item(id, profileId, audience = "public") {
  return Object.freeze({
    id,
    authorProfileId: profileId,
    authorDisplayName: `Member ${id}`,
    authorAvatarUrl: null,
    authorAvailable: true,
    body: `post-${id}`,
    audience,
    createdAt: "2026-08-20T18:00:00.000Z",
    updatedAt: "2026-08-20T18:00:00.000Z",
  });
}

function unavailableItem(id) {
  return Object.freeze({
    id,
    authorProfileId: null,
    authorDisplayName: "عضو غير متاح",
    authorAvatarUrl: null,
    authorAvailable: false,
    body: `post-${id}`,
    audience: "public",
    createdAt: "2026-08-20T18:00:00.000Z",
    updatedAt: "2026-08-20T18:00:00.000Z",
  });
}

test("mute and active snooze only suppress already-authorized feed items", () => {
  const authorized = Object.freeze([
    item("p1", PROFILE_ALPHA, "friends"),
    item("p2", PROFILE_MUTED),
    item("p3", PROFILE_SNOOZED, "only_me"),
    item("p4", PROFILE_VISIBLE),
  ]);

  const result = applyFeedPreferences(
    authorized,
    {
      mutedAuthors: [PROFILE_MUTED],
      snoozedUntilByAuthor: { [PROFILE_SNOOZED]: 2_000 },
    },
    1_000
  );

  assert.deepEqual(result.map((entry) => entry.id), ["p1", "p4"]);
  assert.ok(result.every((entry) => authorized.includes(entry)), "presentation policy may only return input items");
  assert.equal(authorized[0].audience, "friends");
  assert.equal(authorized[2].audience, "only_me");
});

test("expired snooze restores the authorized item without changing authorization data", () => {
  const snoozed = item("p1", PROFILE_SNOOZED, "friends");
  const authorized = Object.freeze([snoozed]);

  const result = applyFeedPreferences(
    authorized,
    { snoozedUntilByAuthor: { [PROFILE_SNOOZED]: 2_000 } },
    2_000
  );

  assert.deepEqual(result, [snoozed]);
  assert.strictEqual(result[0], snoozed);
  assert.equal(result[0].audience, "friends");
});

test("prefer and deprioritize reorder stably without introducing new feed items", () => {
  const a1 = item("p1", PROFILE_NORMAL);
  const a2 = item("p2", PROFILE_PREFERRED);
  const a3 = item("p3", PROFILE_NORMAL_TWO);
  const a4 = item("p4", PROFILE_DEPRIORITIZED);
  const a5 = item("p5", PROFILE_PREFERRED);
  const authorized = Object.freeze([a1, a2, a3, a4, a5]);

  const result = applyFeedPreferences(
    authorized,
    {
      preferredAuthors: [PROFILE_PREFERRED],
      deprioritizedAuthors: [PROFILE_DEPRIORITIZED],
    },
    1_000
  );

  assert.deepEqual(result, [a2, a5, a1, a3, a4]);
  assert.ok(result.every((entry) => authorized.includes(entry)));
  assert.equal(new Set(result).size, result.length, "presentation ordering cannot duplicate durable feed items");
});

test("unavailable historical authors survive presentation preferences", () => {
  const orphan = unavailableItem("p_orphan");
  const authorized = Object.freeze([orphan, item("p_live", PROFILE_VISIBLE)]);

  const result = applyFeedPreferences(
    authorized,
    {
      mutedAuthors: [PROFILE_VISIBLE],
      preferredAuthors: [PROFILE_VISIBLE],
      snoozedUntilByAuthor: { [PROFILE_VISIBLE]: 9_999 },
    },
    1_000
  );

  assert.deepEqual(result, [orphan]);
  assert.strictEqual(result[0], orphan);
});

test("malformed or unknown preferences cannot widen the authorized feed", () => {
  const authorized = Object.freeze([item("p1", PROFILE_ALPHA)]);

  const result = applyFeedPreferences(
    authorized,
    {
      mutedAuthors: [null, "user_secret", "not-a-profile-id"],
      snoozedUntilByAuthor: { user_secret: Number.POSITIVE_INFINITY },
      preferredAuthors: ["user_secret"],
      deprioritizedAuthors: { [PROFILE_ALPHA]: true },
      injectedItems: [item("evil", PROFILE_MUTED)],
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
      author_profile_id: PROFILE_VISIBLE,
      author_display_name: "Visible Member",
      author_avatar_url: null,
      author_available: true,
      body: "visible",
      audience: "public",
      created_at: "2026-08-20T18:00:00.000Z",
      updated_at: "2026-08-20T18:00:00.000Z",
    },
    {
      post_id: "p2",
      author_profile_id: PROFILE_MUTED,
      author_display_name: "Muted Member",
      author_avatar_url: null,
      author_available: true,
      body: "muted",
      audience: "friends",
      created_at: "2026-08-20T18:00:01.000Z",
      updated_at: "2026-08-20T18:00:01.000Z",
    },
  ];

  const runtime = {
    posts: {
      readFeed: async () => ({
        ok: true,
        value: { items: runtimeRows, next_cursor: null },
      }),
    },
  };

  const model = createSocialFeedReadModel({
    runtime,
    preferences: { mutedAuthors: [PROFILE_MUTED] },
    now: () => 1_000,
  });

  const snapshot = await model.load({ limit: 20 });
  assert.equal(snapshot.ok, true);
  assert.deepEqual(snapshot.items.map((entry) => entry.id), ["p1"]);
  assert.equal(snapshot.items[0].audience, "public");
  assert.equal(snapshot.nextCursor, null);
  assert.equal(Object.hasOwn(snapshot.items[0], "authorSubject"), false);
});
