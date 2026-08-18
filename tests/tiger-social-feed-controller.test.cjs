"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  createSocialFeedController,
} = require("../scripts/social/feed-controller.js");

function fakeElement(tagName) {
  return {
    tagName: String(tagName || "div").toUpperCase(),
    className: "",
    textContent: "",
    hidden: false,
    children: [],
    attributes: {},
    dataset: {},
    append(...nodes) {
      this.children.push(...nodes);
    },
    appendChild(node) {
      this.children.push(node);
      return node;
    },
    replaceChildren(...nodes) {
      this.children = [...nodes];
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
  };
}

function fakeDocument() {
  return {
    createElement(tagName) {
      return fakeElement(tagName);
    },
  };
}

function post(overrides) {
  return Object.freeze(Object.assign({
    id: "post_01",
    authorSubject: "user_alice",
    body: "Hello TIGER",
    audience: "friends",
    createdAt: "2026-08-18T11:00:00.000Z",
    updatedAt: "2026-08-18T11:00:00.000Z",
  }, overrides || {}));
}

test("controller renders a loading state before the trusted read resolves", async () => {
  let resolveLoad;
  const readModel = {
    load() {
      return new Promise((resolve) => { resolveLoad = resolve; });
    },
  };
  const host = fakeElement("section");
  const controller = createSocialFeedController({ host, readModel, document: fakeDocument() });

  const promise = controller.load();
  assert.equal(host.attributes["aria-busy"], "true");
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0].attributes["data-social-feed-state"], "loading");

  resolveLoad({ ok: true, items: [], empty: true });
  await promise;
});

test("controller renders an explicit empty state", async () => {
  const host = fakeElement("section");
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: { load: async () => ({ ok: true, items: [], empty: true }) },
  });

  const result = await controller.load();
  assert.equal(result.ok, true);
  assert.equal(host.attributes["aria-busy"], "false");
  assert.equal(host.children[0].attributes["data-social-feed-state"], "empty");
});

test("controller renders a bounded error state without exposing persistence details", async () => {
  const host = fakeElement("section");
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: { load: async () => ({ ok: false, code: "SOCIAL_PERSISTENCE_FAILED:secret-detail" }) },
  });

  const result = await controller.load();
  assert.deepEqual(result, { ok: false, code: "SOCIAL_FEED_RENDER_FAILED" });
  assert.equal(host.children[0].attributes["data-social-feed-state"], "error");
  assert.doesNotMatch(host.children[0].textContent, /secret|persistence/i);
});

test("controller renders trusted posts using text nodes and semantic post metadata", async () => {
  const host = fakeElement("section");
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: {
      load: async () => ({
        ok: true,
        empty: false,
        items: [post(), post({ id: "post_02", audience: "public", body: "Second post" })],
      }),
    },
  });

  const result = await controller.load({ limit: 10 });
  assert.equal(result.ok, true);
  assert.equal(result.count, 2);
  assert.equal(host.children.length, 2);
  assert.equal(host.children[0].attributes["data-social-post-id"], "post_01");
  assert.equal(host.children[0].attributes["data-social-post-audience"], "friends");
  assert.match(JSON.stringify(host.children[0]), /Hello TIGER/);
  assert.match(JSON.stringify(host.children[1]), /Second post/);
});

test("feed controller source never uses innerHTML for user content", () => {
  const source = fs.readFileSync("scripts/social/feed-controller.js", "utf8");
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.match(source, /textContent/);
});

test("authoritative entrypoint and public release include the trusted feed modules", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const builder = fs.readFileSync("tools/vvip_public_release.py", "utf8");

  assert.match(html, /data-social-feed-items/);
  assert.match(html, /scripts\/social\/feed-read-model\.js/);
  assert.match(html, /scripts\/social\/feed-controller\.js/);
  assert.match(builder, /scripts\/social\/feed-read-model\.js/);
  assert.match(builder, /scripts\/social\/feed-controller\.js/);
});
