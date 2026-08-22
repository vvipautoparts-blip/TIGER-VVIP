"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const auth = require("../auth-clerk-index.js");

const {
  normalizeRelationship,
  createFriendsController,
} = require("../scripts/social/friends-controller.js");

function element(tagName) {
  return {
    tagName: String(tagName || "div").toUpperCase(),
    className: "",
    textContent: "",
    hidden: false,
    children: [],
    attrs: {},
    dataset: {},
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    addEventListener() {},
  };
}

function documentFixture() {
  return { createElement: (tagName) => element(tagName) };
}

function row(overrides) {
  return Object.assign({
    relationship_id: "11111111-1111-4111-8111-111111111111",
    requester_subject: "user_alice",
    addressee_subject: "user_bob",
    relationship_state: "pending",
    created_at: "2026-08-18T10:00:00.000Z",
    updated_at: "2026-08-18T10:00:00.000Z",
  }, overrides || {});
}

test("relationship normalization derives incoming, outgoing, and friend states from current actor", () => {
  assert.equal(normalizeRelationship(row(), "user_alice").value.state, "request_sent");
  assert.equal(normalizeRelationship(row(), "user_bob").value.state, "request_received");
  assert.equal(normalizeRelationship(row({ relationship_state: "friends" }), "user_alice").value.state, "friends");
  assert.equal(normalizeRelationship(row({ relationship_state: "friends" }), "user_bob").value.state, "friends");
});

test("relationship normalization fails closed for unrelated actor or malformed rows", () => {
  assert.equal(normalizeRelationship(row(), "user_charlie").ok, false);
  assert.equal(normalizeRelationship(row({ requester_subject: "alice" }), "user_bob").ok, false);
  assert.equal(normalizeRelationship(row({ relationship_state: "blocked" }), "user_bob").ok, false);
  assert.equal(normalizeRelationship(row({ relationship_id: "../r1" }), "user_bob").ok, false);
});

test("friends load renders familiar relationship states without exposing raw subject ids", async () => {
  const host = element("section");
  const controller = createFriendsController({
    host,
    document: documentFixture(),
    actorSubject: "user_alice",
    auth: { requireAuth: async (_descriptor, resume) => { await resume(); return true; } },
    runtime: {
      relationships: {
        readMine: async () => ({
          ok: true,
          value: [
            row(),
            row({
              relationship_id: "22222222-2222-4222-8222-222222222222",
              requester_subject: "user_charlie",
              addressee_subject: "user_alice",
            }),
            row({
              relationship_id: "33333333-3333-4333-8333-333333333333",
              requester_subject: "user_alice",
              addressee_subject: "user_dana",
              relationship_state: "friends",
            }),
          ],
        }),
        send: async () => ({ ok: true, value: {} }),
        accept: async () => ({ ok: true, value: {} }),
        remove: async () => ({ ok: true, value: {} }),
      },
    },
  });

  const result = await controller.load();
  assert.deepEqual(result, { ok: true, count: 3, empty: false });
  const serialized = JSON.stringify(host);
  assert.match(serialized, /طلب صداقة مُرسل/);
  assert.match(serialized, /طلب صداقة وارد/);
  assert.match(serialized, /صديق/);
  assert.doesNotMatch(serialized, /user_alice|user_bob|user_charlie|user_dana/);
});

test("friend actions map to accept or remove only after bounded auth", async () => {
  const calls = [];
  const controller = createFriendsController({
    host: element("section"),
    document: documentFixture(),
    actorSubject: "user_alice",
    auth: {
      async requireAuth(descriptor, resume) {
        calls.push(["auth", descriptor]);
        await resume();
        return true;
      },
    },
    runtime: {
      relationships: {
        readMine: async () => ({ ok: true, value: [] }),
        send: async (subject) => { calls.push(["send", subject]); return { ok: true, value: {} }; },
        accept: async (id) => { calls.push(["accept", id]); return { ok: true, value: {} }; },
        remove: async (id) => { calls.push(["remove", id]); return { ok: true, value: {} }; },
      },
    },
  });

  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal((await controller.act("accept_request", id)).ok, true);
  assert.equal((await controller.act("decline_request", id)).ok, true);
  assert.equal((await controller.act("cancel_request", id)).ok, true);
  assert.equal((await controller.act("unfriend", id)).ok, true);

  assert.deepEqual(calls.filter((entry) => entry[0] === "accept"), [["accept", id]]);
  assert.equal(calls.filter((entry) => entry[0] === "remove").length, 3);
  assert.ok(calls.filter((entry) => entry[0] === "auth").every((entry) => entry[1].name === "SOCIAL_FRIEND_ACTION"));
});

test("send request keeps target out of persisted auth descriptor and delegates target to trusted runtime", async () => {
  const calls = [];
  const controller = createFriendsController({
    host: element("section"),
    document: documentFixture(),
    actorSubject: "user_alice",
    auth: {
      async requireAuth(descriptor, resume) {
        calls.push(["auth", descriptor]);
        await resume();
        return true;
      },
    },
    runtime: {
      relationships: {
        readMine: async () => ({ ok: true, value: [] }),
        send: async (subject) => { calls.push(["send", subject]); return { ok: true, value: {} }; },
        accept: async () => ({ ok: true, value: {} }),
        remove: async () => ({ ok: true, value: {} }),
      },
    },
  });

  assert.equal((await controller.send("user_bob")).ok, true);
  assert.deepEqual(calls[0], ["auth", { name: "SOCIAL_FRIEND_ACTION" }]);
  assert.deepEqual(calls[1], ["send", "user_bob"]);
});

test("auth allowlist accepts only bounded Friends descriptors", () => {
  assert.deepEqual(auth.normalizeIntentDescriptor({ name: "OPEN_SOCIAL_FRIENDS" }), { name: "OPEN_SOCIAL_FRIENDS" });
  assert.deepEqual(auth.normalizeIntentDescriptor({ name: "SOCIAL_FRIEND_ACTION" }), { name: "SOCIAL_FRIEND_ACTION" });
  assert.throws(
    () => auth.normalizeIntentDescriptor({ name: "SOCIAL_FRIEND_ACTION", addresseeSubject: "user_bob" }),
    { code: "AUTH_INTENT_INVALID" }
  );
});

test("authoritative Friends surface and public release include controller", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const builder = fs.readFileSync("tools/vvip_public_release.py", "utf8");

  assert.match(html, /data-social-friends-items/);
  assert.match(html, /scripts\/social\/friends-controller\.js/);
  assert.match(builder, /scripts\/social\/friends-controller\.js/);
});
