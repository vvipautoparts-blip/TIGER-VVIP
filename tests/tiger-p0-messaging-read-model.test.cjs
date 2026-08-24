"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const modulePath = path.join(root, "scripts/social/messaging-read-model.js");

function loadModel() {
  if (!fs.existsSync(modulePath)) return null;
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

const activeRow = Object.freeze({
  message_id: "11111111-1111-4111-8111-111111111111",
  conversation_id: "22222222-2222-4222-8222-222222222222",
  sequence: 7,
  sender_profile_id: "33333333-3333-4333-8333-333333333333",
  sender_display_name: "Tiger Member",
  sender_avatar_url: "https://cdn.example.test/avatar.webp",
  sender_available: true,
  viewer_is_sender: false,
  body: "مرحباً",
  created_at: "2026-08-21T11:40:00.000Z",
});

const activeConversationRow = Object.freeze({
  conversation_id: "22222222-2222-4222-8222-222222222222",
  peer_profile_id: "33333333-3333-4333-8333-333333333333",
  peer_display_name: "Tiger Member",
  peer_avatar_url: "https://cdn.example.test/avatar.webp",
  peer_available: true,
  can_message: true,
  last_message_sequence: 7,
  last_read_sequence: 5,
  unread_count: 2,
  last_message_body: "آخر رسالة",
  last_message_viewer_is_sender: false,
  last_message_at: "2026-08-21T11:40:00.000Z",
  activity_at: "2026-08-21T11:40:00.000Z",
});

const activeContactRow = Object.freeze({
  peer_profile_id: "33333333-3333-4333-8333-333333333333",
  peer_display_name: "Tiger Member",
  peer_avatar_url: "https://cdn.example.test/avatar.webp",
});

test("messaging read model exists and exports a bounded normalization surface", () => {
  assert.equal(
    fs.existsSync(modulePath),
    true,
    "subject-blind messaging read model must exist"
  );

  const model = loadModel();
  assert.equal(typeof model.normalizeMessageRow, "function");
  assert.equal(typeof model.normalizeMessageRows, "function");
});

test("active sender rows normalize to presentation-safe message fields only", () => {
  const model = loadModel();
  assert.ok(model, "messaging read model must exist");

  const result = model.normalizeMessageRow({
    ...activeRow,
    harmless_transport_hint: "ignored",
  });

  assert.deepEqual(result, activeRow);
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(Object.keys(result), [
    "message_id",
    "conversation_id",
    "sequence",
    "sender_profile_id",
    "sender_display_name",
    "sender_avatar_url",
    "sender_available",
    "viewer_is_sender",
    "body",
    "created_at",
  ]);
});

test("unavailable sender rows become the exact neutral tombstone", () => {
  const model = loadModel();
  assert.ok(model, "messaging read model must exist");

  const result = model.normalizeMessageRow({
    ...activeRow,
    sender_profile_id: null,
    sender_display_name: "stale private name",
    sender_avatar_url: "https://stale.example.test/avatar.webp",
    sender_available: false,
  });

  assert.deepEqual(result, {
    ...activeRow,
    sender_profile_id: null,
    sender_display_name: "عضو غير متاح",
    sender_avatar_url: null,
    sender_available: false,
  });
});

test("rows carrying internal identity fields fail closed instead of being silently stripped", () => {
  const model = loadModel();
  assert.ok(model, "messaging read model must exist");

  assert.equal(
    model.normalizeMessageRow({ ...activeRow, sender_subject: "user_alice01" }),
    null
  );
  assert.equal(
    model.normalizeMessageRow({ ...activeRow, member_subject: "user_alice01" }),
    null
  );
});

test("message collections fail closed when any row is malformed or identity-bearing", () => {
  const model = loadModel();
  assert.ok(model, "messaging read model must exist");

  const valid = model.normalizeMessageRows([activeRow]);
  assert.deepEqual(valid, [activeRow]);
  assert.equal(Object.isFrozen(valid), true);

  assert.equal(model.normalizeMessageRows("not-an-array"), null);
  assert.equal(model.normalizeMessageRows([
    activeRow,
    { ...activeRow, sequence: 0 },
  ]), null);
  assert.equal(model.normalizeMessageRows([
    activeRow,
    { ...activeRow, sender_subject: "user_alice01" },
  ]), null);
});

test("read-model implementation has no Clerk user identifier convention", () => {
  assert.equal(fs.existsSync(modulePath), true, "messaging read model must exist");
  const source = fs.readFileSync(modulePath, "utf8");
  assert.doesNotMatch(source, /\buser_/i);
  assert.doesNotMatch(source, /clerk/i);
});

test("conversation discovery normalizes unread state and safe peer presentation", () => {
  const model = loadModel();

  assert.equal(typeof model.normalizeConversationRow, "function");
  assert.equal(typeof model.normalizeConversationRows, "function");
  assert.deepEqual(model.normalizeConversationRow(activeConversationRow), activeConversationRow);
  assert.deepEqual(model.normalizeConversationRows([activeConversationRow]), [activeConversationRow]);
});

test("unavailable conversation peers become a non-messageable neutral tombstone", () => {
  const model = loadModel();
  const result = model.normalizeConversationRow({
    ...activeConversationRow,
    peer_profile_id: null,
    peer_display_name: "stale private name",
    peer_avatar_url: "https://stale.example.test/avatar.webp",
    peer_available: false,
    can_message: false,
  });

  assert.deepEqual(result, {
    ...activeConversationRow,
    peer_profile_id: null,
    peer_display_name: "عضو غير متاح",
    peer_avatar_url: null,
    peer_available: false,
    can_message: false,
  });
});

test("conversation discovery rejects malformed counters and internal identities", () => {
  const model = loadModel();

  assert.equal(model.normalizeConversationRow({ ...activeConversationRow, unread_count: -1 }), null);
  assert.equal(model.normalizeConversationRow({ ...activeConversationRow, subject: "private" }), null);
  assert.equal(model.normalizeConversationRows([
    activeConversationRow,
    { ...activeConversationRow, peer_subject: "private" },
  ]), null);
});

test("message contacts normalize active safe profiles and fail closed on identity-bearing rows", () => {
  const model = loadModel();

  assert.equal(typeof model.normalizeContactRows, "function");
  assert.deepEqual(model.normalizeContactRows([activeContactRow]), [activeContactRow]);
  assert.equal(model.normalizeContactRows([{ ...activeContactRow, member_subject: "private" }]), null);
  assert.equal(model.normalizeContactRows([{ ...activeContactRow, peer_profile_id: "bad" }]), null);
});
