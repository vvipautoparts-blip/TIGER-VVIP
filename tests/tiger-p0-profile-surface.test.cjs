"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const authModule = require("../auth-clerk-index.js");

const root = path.resolve(__dirname, "..");
const controllerPath = path.join(root, "scripts/social/profile-controller.js");
const ownProfileId = "11111111-1111-4111-8111-111111111111";
const publicProfileId = "22222222-2222-4222-8222-222222222222";

function loadController() {
  assert.equal(fs.existsSync(controllerPath), true, "Profile destination controller must exist");
  delete require.cache[require.resolve(controllerPath)];
  return require(controllerPath);
}

function element(tagName) {
  const listeners = {};
  return {
    tagName: String(tagName || "div").toUpperCase(), textContent: "", value: "", hidden: false,
    disabled: false, children: [], dataset: {}, attrs: {}, className: "",
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    setAttribute(name, value) {
      this.attrs[name] = String(value);
      if (name.startsWith("data-")) {
        this.dataset[name.slice(5).replace(/-([a-z])/g, (_, x) => x.toUpperCase())] = String(value);
      }
    },
    getAttribute(name) { return Object.hasOwn(this.attrs, name) ? this.attrs[name] : null; },
    addEventListener(name, handler) { listeners[name] = handler; },
    focus() { this.focused = true; }, _listeners: listeners,
  };
}

function profile(overrides) {
  return Object.assign({
    profile_id: ownProfileId, display_name: "Tiger Owner", avatar_url: null,
    business_name: "Tiger Motors", location: "Amman", specialization: "Automotive",
    business_description: "Trusted profile", viewer_is_owner: true,
    friends_count: 4, followers_count: 8, following_count: 3, posts_count: 2,
    is_friend: false, can_message: false,
  }, overrides || {});
}

function safePost(overrides) {
  return Object.assign({
    post_id: "profile_post_01", author_profile_id: publicProfileId,
    author_display_name: "Tiger Public", author_avatar_url: null, author_available: true,
    body: "Profile timeline post", audience: "public",
    created_at: "2026-08-24T08:00:00.000Z", updated_at: "2026-08-24T08:00:00.000Z",
  }, overrides || {});
}

function fixture(overrides) {
  const calls = [];
  const renderedPosts = [];
  const nodes = {
    shell: element("section"), heading: element("h1"), details: element("div"), counts: element("div"),
    timeline: element("div"), unavailable: element("p"), status: element("p"), editButton: element("button"),
    editForm: element("form"), displayName: element("input"), avatarUrl: element("input"),
    businessName: element("input"), location: element("input"), specialization: element("input"),
    businessDescription: element("textarea"), saveButton: element("button"),
  };
  const runtime = {
    profiles: {
      get: async (id) => { calls.push(["get", id === undefined ? null : id]); return { ok: true, value: { ok: true, status: "profile_loaded", profile: profile() } }; },
      listPosts: async (id, options) => { calls.push(["listPosts", id, options]); return { ok: true, value: { ok: true, items: [safePost()], next_cursor: null } }; },
      save: async (draft) => { calls.push(["save", draft]); return { ok: true, value: { ok: true } }; },
    },
    ...(overrides && overrides.runtime),
  };
  const authCalls = [];
  return {
    nodes, calls, authCalls, runtime,
    controllerOptions: {
      ...nodes, document: { createElement: element }, runtime,
      readModel: { normalizeProfileSurface: (value) => value },
      renderPost: (row, onAuthorNavigate) => {
        renderedPosts.push(row);
        const post = element("article");
        post._listeners.author = () => onAuthorNavigate(row.author_profile_id);
        return post;
      },
      auth: { async requireAuth(intent, resume) { authCalls.push(intent); return resume(); } },
      onProfileNavigate: (id) => calls.push(["navigate", id]),
    }, renderedPosts,
  };
}

test("own Profile load renders safe identity, counts, owner edit affordance, and timeline", async () => {
  const { createProfileController } = loadController();
  const setup = fixture();
  const controller = createProfileController(setup.controllerOptions);

  await controller.load();

  assert.equal(setup.nodes.shell.dataset.socialProfileView, "own");
  assert.match(setup.nodes.heading.textContent, /Tiger Owner/);
  assert.match(JSON.stringify(setup.nodes.counts), /8/);
  assert.equal(setup.nodes.editButton.hidden, false);
  assert.equal(setup.renderedPosts.length, 1, "timeline must reuse the safe shared post renderer");
  assert.deepEqual(setup.calls.slice(0, 2), [["get", null], ["listPosts", ownProfileId, { cursor: null, limit: 20 }]]);
});

test("public Profile uses target UUID, hides owner editing, and opens a timeline author by profile UUID", async () => {
  const { createProfileController } = loadController();
  const setup = fixture({ runtime: { profiles: {
    get: async (id) => { setup.calls.push(["get", id]); return { ok: true, value: { ok: true, status: "profile_loaded", profile: profile({ profile_id: publicProfileId, display_name: "Tiger Public", viewer_is_owner: false, is_friend: true, can_message: true }) } }; },
    listPosts: async (id, options) => { setup.calls.push(["listPosts", id, options]); return { ok: true, value: { ok: true, items: [safePost()], next_cursor: null } }; },
    save: async () => ({ ok: true, value: { ok: true } }),
  } } });
  const controller = createProfileController(setup.controllerOptions);

  await controller.load(publicProfileId);
  setup.nodes.timeline.children[0]._listeners.author();

  assert.equal(setup.nodes.shell.dataset.socialProfileView, "public");
  assert.equal(setup.nodes.editButton.hidden, true);
  assert.deepEqual(setup.calls.slice(0, 3), [
    ["get", publicProfileId], ["listPosts", publicProfileId, { cursor: null, limit: 20 }], ["navigate", publicProfileId],
  ]);
  assert.doesNotMatch(JSON.stringify(setup.calls), /subject|clerk|user_/i);
});

test("Profile rejects non-UUID browser navigation without querying a member", async () => {
  const { createProfileController } = loadController();
  const setup = fixture();
  const controller = createProfileController(setup.controllerOptions);

  assert.deepEqual(await controller.load("user_private-owner"), { ok: false, code: "SOCIAL_INVALID_PROFILE_ID" });
  assert.deepEqual(setup.calls, []);
});

test("unavailable and failed Profile loads clear stale details and timeline without exposing a reason", async () => {
  const { createProfileController } = loadController();
  const unavailable = fixture({ runtime: { profiles: {
    get: async () => ({ ok: true, value: { ok: true, status: "profile_unavailable", profile: null } }),
    listPosts: async () => { throw new Error("must not list unavailable profile"); }, save: async () => ({ ok: true }),
  } } });
  const controller = createProfileController(unavailable.controllerOptions);
  unavailable.nodes.heading.textContent = "stale private profile";
  unavailable.nodes.timeline.append(element("article"));
  await controller.load(publicProfileId);
  assert.equal(unavailable.nodes.shell.dataset.socialProfileView, "unavailable");
  assert.equal(unavailable.nodes.heading.textContent, "");
  assert.equal(unavailable.nodes.timeline.children.length, 0);
  assert.doesNotMatch(unavailable.nodes.status.textContent, /block|deactiv|deleted|subject/i);

  const failed = fixture({ runtime: { profiles: { get: async () => ({ ok: false, code: "SOCIAL_PERSISTENCE_FAILED" }), listPosts: async () => ({ ok: true }), save: async () => ({ ok: true }) } } });
  await createProfileController(failed.controllerOptions).load(publicProfileId);
  assert.equal(failed.nodes.shell.dataset.socialProfileView, "error");
  assert.doesNotMatch(failed.nodes.status.textContent, /SOCIAL_|subject|clerk/i);
});

test("owner profile edits require bounded auth, save safe fields, and reload durable presentation", async () => {
  const { createProfileController } = loadController();
  const setup = fixture();
  const controller = createProfileController(setup.controllerOptions);
  await controller.load();
  setup.nodes.displayName.value = " Tiger Owner Updated ";
  setup.nodes.location.value = " Amman ";

  await controller.save();

  assert.deepEqual(setup.authCalls, [{ name: "SOCIAL_PROFILE_EDIT" }]);
  assert.deepEqual(setup.calls[2], ["save", {
    displayName: "Tiger Owner Updated", avatarUrl: null, businessName: "Tiger Motors", location: "Amman", specialization: "Automotive", businessDescription: "Trusted profile",
  }]);
  assert.deepEqual(setup.calls.slice(3, 5), [["get", null], ["listPosts", ownProfileId, { cursor: null, limit: 20 }]]);
});

test("authoritative social page and release/rehearsal contracts publish Profile as a separate social destination", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const coreShell = fs.readFileSync(path.join(root, "scripts/social/core-shell.js"), "utf8");
  const release = fs.readFileSync(path.join(root, "tools/vvip_public_release.py"), "utf8");
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/tiger-social-db-rehearsal.yml"), "utf8");

  assert.match(html, /data-social-profile/);
  assert.match(html, /data-social-profile-timeline/);
  assert.match(html, /scripts\/social\/profile-read-model\.js/);
  assert.match(html, /scripts\/social\/profile-controller\.js/);
  assert.match(coreShell, /TIGERSocialProfileCurrent|TIGERSocialProfileReady/);
  assert.match(release, /scripts\/social\/profile-read-model\.js/);
  assert.match(release, /scripts\/social\/profile-controller\.js/);
  assert.match(workflow, /tests\/tiger-p0-profile-surface\.test\.cjs/);
  assert.match(workflow, /tests\/sql\/tiger-p0-profile-surface\.sql/);
  assert.deepEqual(
    authModule.normalizeIntentDescriptor({ name: "SOCIAL_PROFILE_EDIT" }),
    { name: "SOCIAL_PROFILE_EDIT" }
  );
  assert.throws(
    () => authModule.normalizeIntentDescriptor({ name: "SOCIAL_PROFILE_EDIT", subject: "private" }),
    /AUTH_INTENT_INVALID/
  );
  assert.doesNotMatch(html, /account security|password|reset password/i);
});
