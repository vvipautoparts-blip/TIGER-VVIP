"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const authModule = require("../auth-clerk-index.js");
const { createProfileController } = require("../scripts/social/profile-controller.js");
const { createSocialFeedReadModel } = require("../scripts/social/feed-read-model.js");

const root = path.resolve(__dirname, "..");
const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PROFILE_ID = "22222222-2222-4222-8222-222222222222";

function element(tagName) {
  const listeners = {};
  return {
    tagName: String(tagName || "div").toUpperCase(), hidden: false, disabled: false,
    textContent: "", value: "", children: [], attrs: {}, dataset: {}, className: "",
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; this.textContent = ""; },
    setAttribute(name, value) {
      this.attrs[name] = String(value);
      if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, x) => x.toUpperCase())] = String(value);
    },
    getAttribute(name) { return Object.hasOwn(this.attrs, name) ? this.attrs[name] : null; },
    addEventListener(name, handler) { listeners[name] = handler; },
    focus() { this.focused = true; },
    _listeners: listeners,
  };
}

function profileRow() {
  return {
    profile_id: PROFILE_ID, display_name: "Follow Peer", avatar_url: null,
    business_name: null, location: "Amman", specialization: null,
    business_description: null, viewer_is_owner: false, friends_count: 0,
    followers_count: 0, following_count: 0, posts_count: 0,
    is_friend: false, can_message: false,
  };
}

test("public Profile applies server-confirmed follow, mute, snooze, and rank controls", async () => {
  const calls = [];
  const authCalls = [];
  const state = { following: false, muted: false, snoozed_until: null, rank_mode: "normal" };
  const nodes = {
    shell: element("section"), heading: element("h1"), avatar: element("div"),
    details: element("div"), counts: element("div"), timeline: element("div"),
    unavailable: element("p"), status: element("p"), editButton: element("button"),
    editForm: element("form"), displayName: element("input"), avatarUrl: element("input"),
    businessName: element("input"), location: element("input"), specialization: element("input"),
    businessDescription: element("textarea"), saveButton: element("button"),
    messageButton: element("button"), blockButton: element("button"),
    unblockButton: element("button"), reportButton: element("button"),
    followButton: element("button"), unfollowButton: element("button"),
    muteButton: element("button"), unmuteButton: element("button"),
    snoozeButton: element("button"), unsnoozeButton: element("button"),
    rankSelect: element("select"),
  };
  const runtime = {
    profiles: {
      get: async () => ({ ok: true, value: { ok: true, status: "profile_loaded", profile: profileRow() } }),
      listPosts: async () => ({ ok: true, value: { ok: true, items: [], next_cursor: null } }),
      save: async () => ({ ok: false }),
    },
    follows: {
      controls: async () => ({ ok: true, value: { ok: true, profile_id: PROFILE_ID, ...state } }),
      follow: async (id) => { calls.push(["follow", id]); state.following = true; return { ok: true, value: { ok: true } }; },
      unfollow: async (id) => { calls.push(["unfollow", id]); state.following = false; return { ok: true, value: { ok: true } }; },
    },
    feedPreferences: {
      set: async (id, input) => {
        calls.push(["preference", id, input.action]);
        if (input.action === "mute") state.muted = true;
        if (input.action === "unmute") state.muted = false;
        if (input.action === "snooze_24h") state.snoozed_until = "2026-08-25T12:00:00.000Z";
        if (input.action === "unsnooze") state.snoozed_until = null;
        if (["prefer", "deprioritize", "normal"].includes(input.action)) state.rank_mode = input.action;
        return { ok: true, value: { ok: true } };
      },
    },
  };
  const controller = createProfileController({
    ...nodes, document: { createElement: element }, runtime,
    readModel: { normalizeProfileSurface: (value) => value },
    renderPost: () => element("article"),
    auth: { async requireAuth(intent, resume) { authCalls.push(intent); return resume(); } },
    now: () => Date.parse("2026-08-25T11:00:00.000Z"),
  });

  assert.equal((await controller.load(PROFILE_ID)).ok, true);
  assert.equal(nodes.followButton.hidden, false);
  assert.equal(nodes.unfollowButton.hidden, true);

  assert.equal((await controller.follow()).ok, true);
  assert.equal(nodes.unfollowButton.hidden, false);
  assert.equal((await controller.unfollow()).ok, true);
  assert.equal((await controller.setFeedPreference("mute")).ok, true);
  assert.equal(nodes.unmuteButton.hidden, false);
  assert.equal((await controller.setFeedPreference("snooze_24h")).ok, true);
  assert.equal(nodes.unsnoozeButton.hidden, false);
  assert.equal((await controller.setFeedPreference("prefer")).ok, true);
  assert.equal(nodes.rankSelect.value, "prefer");

  assert.deepEqual(authCalls, [
    { name: "SOCIAL_PROFILE_FOLLOW" },
    { name: "SOCIAL_PROFILE_UNFOLLOW" },
    { name: "SOCIAL_FEED_PREFERENCE" },
    { name: "SOCIAL_FEED_PREFERENCE" },
    { name: "SOCIAL_FEED_PREFERENCE" },
  ]);
  assert.deepEqual(calls, [
    ["follow", PROFILE_ID], ["unfollow", PROFILE_ID],
    ["preference", PROFILE_ID, "mute"],
    ["preference", PROFILE_ID, "snooze_24h"],
    ["preference", PROFILE_ID, "prefer"],
  ]);
});

test("feed loads durable private preferences and only suppresses or reorders authorized rows", async () => {
  const rows = [
    { post_id: "p1", author_profile_id: PROFILE_ID, author_display_name: "Muted", author_avatar_url: null, author_available: true, body: "muted", audience: "public", created_at: "2026-08-24T10:00:00Z", updated_at: "2026-08-24T10:00:00Z" },
    { post_id: "p2", author_profile_id: OTHER_PROFILE_ID, author_display_name: "Preferred", author_avatar_url: null, author_available: true, body: "preferred", audience: "friends", created_at: "2026-08-24T09:00:00Z", updated_at: "2026-08-24T09:00:00Z" },
  ];
  let preferenceReads = 0;
  const runtime = { posts: { readFeed: async () => ({ ok: true, value: { items: rows, next_cursor: null } }) } };
  const model = createSocialFeedReadModel({
    runtime,
    loadPreferences: async () => {
      preferenceReads += 1;
      return { ok: true, value: { ok: true, items: [
        { profile_id: PROFILE_ID, muted: true, snoozed_until: null, rank_mode: "normal" },
        { profile_id: OTHER_PROFILE_ID, muted: false, snoozed_until: null, rank_mode: "prefer" },
      ] } };
    },
    now: () => Date.parse("2026-08-24T12:00:00Z"),
  });

  const snapshot = await model.load({ limit: 20 });
  assert.equal(snapshot.ok, true);
  assert.equal(preferenceReads, 1);
  assert.deepEqual(snapshot.items.map((item) => item.id), ["p2"]);
  assert.ok(snapshot.items.every((item) => rows.some((row) => row.post_id === item.id)));
});

test("feed fails closed when durable preference state is unavailable or identity-bearing", async () => {
  let feedReads = 0;
  const runtime = { posts: { readFeed: async () => { feedReads += 1; return { ok: true, value: { items: [], next_cursor: null } }; } } };

  for (const loadPreferences of [
    async () => ({ ok: false, code: "SOCIAL_UNAVAILABLE" }),
    async () => ({ ok: true, value: { ok: true, items: [{ profile_id: PROFILE_ID, muted: false, snoozed_until: null, rank_mode: "normal", subject: "user_secret" }] } }),
  ]) {
    const result = await createSocialFeedReadModel({ runtime, loadPreferences }).load({ limit: 20 });
    assert.equal(result.ok, false);
  }
  assert.equal(feedReads, 0);
});

test("authoritative surface publishes follow and durable preference controls", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const profile = fs.readFileSync(path.join(root, "scripts/social/profile-controller.js"), "utf8");
  const feed = fs.readFileSync(path.join(root, "scripts/social/feed-controller.js"), "utf8");
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/tiger-social-db-rehearsal.yml"), "utf8");

  for (const marker of [
    "data-social-profile-follow", "data-social-profile-unfollow", "data-social-profile-mute",
    "data-social-profile-unmute", "data-social-profile-snooze", "data-social-profile-unsnooze",
    "data-social-profile-feed-rank",
  ]) assert.match(html, new RegExp(marker));
  assert.match(profile, /SOCIAL_PROFILE_FOLLOW/);
  assert.match(profile, /SOCIAL_PROFILE_UNFOLLOW/);
  assert.match(profile, /SOCIAL_FEED_PREFERENCE/);
  assert.match(feed, /loadPreferences/);
  assert.match(workflow, /tests\/sql\/tiger-p0-follow-preferences-surface\.sql/);

  for (const name of ["SOCIAL_PROFILE_FOLLOW", "SOCIAL_PROFILE_UNFOLLOW", "SOCIAL_FEED_PREFERENCE"]) {
    assert.deepEqual(authModule.normalizeIntentDescriptor({ name }), { name });
    assert.throws(() => authModule.normalizeIntentDescriptor({ name, profileId: PROFILE_ID }), /AUTH_INTENT_INVALID/);
  }
});