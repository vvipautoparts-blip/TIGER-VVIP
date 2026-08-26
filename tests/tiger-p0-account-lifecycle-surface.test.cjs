"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const controllerPath = path.join(root, "scripts/social/account-lifecycle-controller.js");
const PROFILE_ID = "11111111-1111-4111-8111-111111111111";

function element(tagName) {
  const listeners = {};
  return {
    tagName: String(tagName || "div").toUpperCase(), hidden: false, disabled: false,
    textContent: "", children: [], attrs: {}, dataset: {}, className: "", type: "",
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; this.textContent = ""; },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    addEventListener(name, handler) { listeners[name] = handler; },
    _listeners: listeners,
  };
}

test("account lifecycle controller renders active, deactivated, and deleted states", async () => {
  assert.equal(fs.existsSync(controllerPath), true, "account lifecycle controller must exist");
  const { createAccountLifecycleController } = require(controllerPath);
  const status = element("p");
  const actions = element("div");
  let current = "active";
  let signOutCalls = 0;
  const runtime = { accountLifecycle: {
    state: async () => ({ ok: true, value: { ok: true, state: current, profile_id: PROFILE_ID } }),
    deactivate: async () => { current = "deactivated"; return { ok: true, value: { ok: true, status: "profile_deactivated", profile: { profile_id: PROFILE_ID, profile_state: "deactivated" } } }; },
    reactivate: async () => { current = "active"; return { ok: true, value: { ok: true, status: "profile_active", profile: { profile_id: PROFILE_ID, profile_state: "active" } } }; },
  } };
  const controller = createAccountLifecycleController({
    document: { createElement: element }, status, actions, runtime,
    clerk: { signOut: async () => { signOutCalls += 1; } },
    confirmDeactivate: () => true,
  });

  assert.equal((await controller.load()).ok, true);
  assert.match(status.textContent, /نشط/);
  assert.equal(actions.children.length, 1);
  assert.equal((await controller.deactivate()).ok, true);
  assert.equal(signOutCalls, 1);

  assert.equal((await controller.load()).ok, true);
  assert.match(status.textContent, /معطّل مؤقتًا/);
  assert.equal((await controller.reactivate()).ok, true);

  current = "deleted";
  assert.equal((await controller.load()).ok, true);
  assert.match(status.textContent, /محذوف/);
  assert.equal(actions.children.length, 0);
});

test("account lifecycle controller rejects malformed and identity-bearing state", async () => {
  const { createAccountLifecycleController } = require(controllerPath);
  const status = element("p");
  const actions = element("div");
  const controller = createAccountLifecycleController({
    document: { createElement: element }, status, actions,
    runtime: { accountLifecycle: {
      state: async () => ({ ok: true, value: { ok: true, state: "active", profile_id: PROFILE_ID, subject: "user_secret" } }),
      deactivate: async () => ({ ok: false }), reactivate: async () => ({ ok: false }),
    } },
    clerk: { signOut: async () => {} }, confirmDeactivate: () => true,
  });
  assert.equal((await controller.load()).ok, false);
  assert.equal(actions.children.length, 0);
});

test("canonical account sheet publishes lifecycle controls", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const release = fs.readFileSync(path.join(root, "tools/vvip_public_release.py"), "utf8");
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/tiger-social-db-rehearsal.yml"), "utf8");
  assert.match(html, /data-social-account-lifecycle/);
  assert.match(html, /scripts\/social\/account-lifecycle-controller\.js/);
  assert.match(release, /scripts\/social\/account-lifecycle-controller\.js/);
  assert.match(workflow, /tests\/sql\/tiger-p0-account-lifecycle-surface\.sql/);
});
