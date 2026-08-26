"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const controllerPath = path.join(root, "scripts/social/search-controller.js");
const PROFILE_ID = "11111111-1111-4111-8111-111111111111";

function element(tagName) {
  const listeners = {};
  return {
    tagName: String(tagName || "div").toUpperCase(), hidden: false, disabled: false,
    textContent: "", value: "", children: [], attrs: {}, dataset: {}, className: "",
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; this.textContent = ""; },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return Object.hasOwn(this.attrs, name) ? this.attrs[name] : null; },
    addEventListener(name, handler) { listeners[name] = handler; },
    focus() { this.focused = true; },
    _listeners: listeners,
  };
}

test("search controller renders safe discovery, people, and authorized post results", async () => {
  assert.equal(fs.existsSync(controllerPath), true, "Social search controller must exist");
  const { createSearchController } = require(controllerPath);
  const nodes = {
    form: element("form"), input: element("input"), status: element("p"),
    peopleHost: element("div"), postsHost: element("div"),
  };
  const calls = [];
  const controller = createSearchController({
    document: { createElement: element }, ...nodes,
    runtime: { search: {
      discover: async () => ({ ok: true, value: { ok: true, profiles: [{
        profile_id: PROFILE_ID, display_name: "Safe Member", avatar_url: null,
        business_name: null, location: "Amman", specialization: null,
        viewer_is_following: false,
      }] } }),
      query: async (query) => { calls.push(query); return { ok: true, value: {
        ok: true,
        query,
        profiles: [{ profile_id: PROFILE_ID, display_name: "Safe Member", avatar_url: null, business_name: null, location: "Amman", specialization: null, viewer_is_following: false }],
        posts: [{ post_id: "22222222-2222-4222-8222-222222222222", author_profile_id: PROFILE_ID, author_display_name: "Safe Member", author_avatar_url: null, author_available: true, body: "brake parts", audience: "public", created_at: "2026-08-24T10:00:00Z", updated_at: "2026-08-24T10:00:00Z" }],
      } }; },
    } },
    normalizePost: (row) => ({ ok: true, value: row }),
    renderPost: () => element("article"),
  });

  assert.equal((await controller.discover()).ok, true);
  assert.equal(nodes.peopleHost.children.length, 1);
  nodes.input.value = "  brake parts  ";
  assert.equal((await controller.search()).ok, true);
  assert.deepEqual(calls, ["brake parts"]);
  assert.equal(nodes.peopleHost.children.length, 1);
  assert.equal(nodes.postsHost.children.length, 1);
  assert.doesNotMatch(JSON.stringify(nodes), /user_secret|author_subject/);
});

test("search controller fails closed on invalid or identity-bearing payloads", async () => {
  const { createSearchController } = require(controllerPath);
  const nodes = { form: element("form"), input: element("input"), status: element("p"), peopleHost: element("div"), postsHost: element("div") };
  let calls = 0;
  const controller = createSearchController({
    document: { createElement: element }, ...nodes,
    runtime: { search: {
      discover: async () => ({ ok: false }),
      query: async () => { calls += 1; return { ok: true, value: { ok: true, query: "ab", profiles: [{ profile_id: PROFILE_ID, display_name: "Leak", avatar_url: null, business_name: null, location: null, specialization: null, viewer_is_following: false, subject: "user_secret" }], posts: [] } }; },
    } },
    normalizePost: () => null,
    renderPost: () => null,
  });

  nodes.input.value = "a";
  assert.equal((await controller.search()).ok, false);
  assert.equal(calls, 0);
  nodes.input.value = "ab";
  assert.equal((await controller.search()).ok, false);
  assert.equal(nodes.peopleHost.children.length, 0);
});

test("authoritative shell publishes Social search as a separate destination", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const shell = fs.readFileSync(path.join(root, "scripts/social/core-shell.js"), "utf8");
  const release = fs.readFileSync(path.join(root, "tools/vvip_public_release.py"), "utf8");
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/tiger-social-db-rehearsal.yml"), "utf8");
  assert.match(html, /data-social-nav="search"/);
  assert.match(html, /data-social-module-placeholder="search"/);
  assert.match(html, /data-social-search-form/);
  assert.match(html, /scripts\/social\/search-controller\.js/);
  assert.match(shell, /'search'/);
  assert.match(release, /scripts\/social\/search-controller\.js/);
  assert.match(workflow, /tests\/sql\/tiger-p0-search-discovery-surface\.sql/);
});
