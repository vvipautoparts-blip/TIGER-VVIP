"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const authModule = require("../auth-clerk-index.js");

const root = path.resolve(__dirname, "..");
const safetyPath = path.join(root, "scripts/social/safety-controller.js");
const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const POST_ID = "22222222-2222-4222-8222-222222222222";

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

function loadSafety() {
  assert.equal(fs.existsSync(safetyPath), true, "P0 safety controller must exist");
  delete require.cache[require.resolve(safetyPath)];
  return require(safetyPath);
}

test("report sheet submits a bounded profile report behind a safe auth intent", async () => {
  const { createSafetyController } = loadSafety();
  const calls = [];
  const authCalls = [];
  const nodes = {
    layer: element("div"), form: element("form"), reason: element("select"),
    details: element("textarea"), submitButton: element("button"), status: element("p"),
  };
  const controller = createSafetyController({
    document: { createElement: element }, ...nodes,
    runtime: { safety: {
      reportProfile: async (id, input) => { calls.push(["profile", id, input]); return { ok: true, value: { ok: true } }; },
      reportPost: async (id, input) => { calls.push(["post", id, input]); return { ok: true, value: { ok: true } }; },
    } },
    auth: { async requireAuth(intent, resume) { authCalls.push(intent); return resume(); } },
  });

  assert.equal(controller.openReport("profile", PROFILE_ID), true);
  nodes.reason.value = "harassment";
  nodes.details.value = "  repeated contact  ";
  assert.equal((await controller.submitReport()).ok, true);

  assert.deepEqual(authCalls, [{ name: "SOCIAL_REPORT_SUBMIT" }]);
  assert.deepEqual(calls, [["profile", PROFILE_ID, { reason: "harassment", details: "repeated contact" }]]);
  assert.equal(nodes.layer.hidden, true);
  assert.match(nodes.status.textContent, /استلام|تم/);
});

test("report sheet rejects malformed targets and never widens a post report", async () => {
  const { createSafetyController } = loadSafety();
  const calls = [];
  const nodes = {
    layer: element("div"), form: element("form"), reason: element("select"),
    details: element("textarea"), submitButton: element("button"), status: element("p"),
  };
  const controller = createSafetyController({
    document: { createElement: element }, ...nodes,
    runtime: { safety: {
      reportProfile: async () => { calls.push("profile"); return { ok: true }; },
      reportPost: async (id, input) => { calls.push([id, input]); return { ok: true, value: { ok: true } }; },
    } },
    auth: { async requireAuth(_intent, resume) { return resume(); } },
  });

  assert.equal(controller.openReport("profile", "user_secret"), false);
  assert.equal(controller.openReport("post", POST_ID), true);
  nodes.reason.value = "unknown";
  assert.equal((await controller.submitReport()).ok, false);
  assert.deepEqual(calls, []);
});

test("public Profile blocks, collapses, lifecycle-safely unblocks, and opens its report sheet", async () => {
  const { createProfileController } = require("../scripts/social/profile-controller.js");
  let blocked = false;
  const calls = [];
  const authCalls = [];
  const nodes = {
    shell: element("section"), heading: element("h1"), avatar: element("div"),
    details: element("div"), counts: element("div"), timeline: element("div"),
    unavailable: element("p"), status: element("p"), editButton: element("button"),
    editForm: element("form"), displayName: element("input"), avatarUrl: element("input"),
    businessName: element("input"), location: element("input"), specialization: element("input"),
    businessDescription: element("textarea"), saveButton: element("button"),
    messageButton: element("button"), blockButton: element("button"),
    unblockButton: element("button"), reportButton: element("button"),
  };
  const profile = {
    profile_id: PROFILE_ID, display_name: "Safety Peer", avatar_url: null,
    business_name: null, location: "Amman", specialization: null,
    business_description: null, viewer_is_owner: false, friends_count: 0,
    followers_count: 0, following_count: 0, posts_count: 0,
    is_friend: false, can_message: false,
  };
  const runtime = {
    profiles: {
      get: async () => ({ ok: true, value: blocked
        ? { ok: true, status: "profile_unavailable", profile: null }
        : { ok: true, status: "profile_loaded", profile } }),
      listPosts: async () => ({ ok: true, value: { ok: true, items: [], next_cursor: null } }),
      save: async () => ({ ok: false }),
    },
    safety: {
      blockState: async (id) => ({ ok: true, value: { ok: true, peer_profile_id: id, blocked_by_viewer: blocked } }),
      block: async (id) => { calls.push(["block", id]); blocked = true; return { ok: true, value: { ok: true } }; },
      unblock: async (id) => { calls.push(["unblock", id]); blocked = false; return { ok: true, value: { ok: true } }; },
    },
  };
  const controller = createProfileController({
    ...nodes, document: { createElement: element }, runtime,
    readModel: { normalizeProfileSurface: (value) => value },
    renderPost: () => element("article"),
    auth: { async requireAuth(intent, resume) { authCalls.push(intent); return resume(); } },
    confirmBlock: () => true,
    onReport: (kind, id) => { calls.push(["report", kind, id]); return true; },
  });

  await controller.load(PROFILE_ID);
  assert.equal(nodes.blockButton.hidden, false);
  assert.equal(nodes.reportButton.hidden, false);

  assert.equal((await controller.block()).ok, true);
  assert.equal(nodes.shell.dataset.socialProfileView, "unavailable");
  assert.equal(nodes.unblockButton.hidden, false);

  assert.equal((await controller.unblock()).ok, true);
  assert.equal(nodes.shell.dataset.socialProfileView, "public");
  assert.equal(controller.report(), true);

  assert.deepEqual(authCalls, [{ name: "SOCIAL_PROFILE_BLOCK" }, { name: "SOCIAL_PROFILE_UNBLOCK" }]);
  assert.deepEqual(calls, [["block", PROFILE_ID], ["unblock", PROFILE_ID], ["report", "profile", PROFILE_ID]]);
});

test("authoritative surface publishes report affordances, safe auth intents, and release wiring", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const feed = fs.readFileSync(path.join(root, "scripts/social/feed-controller.js"), "utf8");
  const profile = fs.readFileSync(path.join(root, "scripts/social/profile-controller.js"), "utf8");
  const release = fs.readFileSync(path.join(root, "tools/vvip_public_release.py"), "utf8");
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/tiger-social-db-rehearsal.yml"), "utf8");

  assert.match(html, /data-social-report-sheet/);
  assert.match(html, /data-social-profile-block/);
  assert.match(html, /data-social-profile-unblock/);
  assert.match(html, /data-social-profile-report/);
  assert.match(html, /scripts\/social\/safety-controller\.js/);
  assert.match(feed, /data-social-report-post/);
  assert.match(profile, /SOCIAL_PROFILE_BLOCK/);
  assert.match(profile, /SOCIAL_PROFILE_UNBLOCK/);
  assert.match(release, /scripts\/social\/safety-controller\.js/);
  assert.match(workflow, /tests\/sql\/tiger-p0-safety-surface\.sql/);

  for (const name of ["SOCIAL_PROFILE_BLOCK", "SOCIAL_PROFILE_UNBLOCK", "SOCIAL_REPORT_SUBMIT"]) {
    assert.deepEqual(authModule.normalizeIntentDescriptor({ name }), { name });
    assert.throws(() => authModule.normalizeIntentDescriptor({ name, subject: "private" }), /AUTH_INTENT_INVALID/);
  }
});
