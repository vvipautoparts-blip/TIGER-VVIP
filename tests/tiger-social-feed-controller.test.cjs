"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  createSocialFeedController,
  mountCurrentSocialFeed,
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
    get lastElementChild() {
      return this.children[this.children.length - 1] || null;
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

test("keyset retry keeps the same cursor, applies bounded backoff, and appends once", async () => {
  const calls = [];
  const delays = [];
  const host = fakeElement("section");
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "cursor_02" },
    { ok: false, code: "SOCIAL_FEED_RETRYABLE" },
    { ok: false, code: "SOCIAL_FEED_RETRYABLE" },
    { ok: true, empty: false, items: [post({ id: "post_02" })], nextCursor: null },
  ];
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    sleep: async (delayMs) => { delays.push(delayMs); },
    readModel: {
      load: async (options) => {
        calls.push(options || {});
        return responses.shift();
      },
    },
  });

  await controller.load({ limit: 10 });
  const result = await controller.loadNext();

  assert.deepEqual(calls, [
    { limit: 10 },
    { limit: 10, cursor: "cursor_02" },
    { limit: 10, cursor: "cursor_02" },
    { limit: 10, cursor: "cursor_02" },
  ]);
  assert.deepEqual(delays, [250, 500]);
  assert.deepEqual(result, { ok: true, count: 1, hasMore: false });
  assert.deepEqual(
    host.children.map((node) => node.attributes["data-social-post-id"]),
    ["post_01", "post_02"]
  );
});

test("concurrent infinite-scroll signals share one read and one append", async () => {
  let resolveNext;
  let calls = 0;
  const host = fakeElement("section");
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: {
      load: async (options) => {
        calls += 1;
        if (!options || !options.cursor) {
          return { ok: true, empty: false, items: [post()], nextCursor: "cursor_02" };
        }
        return new Promise((resolve) => { resolveNext = resolve; });
      },
    },
  });

  await controller.load();
  const first = controller.loadNext();
  const duplicate = controller.loadNext();
  assert.equal(calls, 2, "duplicate observer events must not start another request");

  resolveNext({ ok: true, empty: false, items: [post({ id: "post_02" })], nextCursor: null });
  const [firstResult, duplicateResult] = await Promise.all([first, duplicate]);

  assert.deepEqual(firstResult, duplicateResult);
  assert.equal(host.children.length, 2, "the successful page must be appended exactly once");
});

test("stale cursor preserves rendered data and reconnect restarts from a clean snapshot", async () => {
  const calls = [];
  const host = fakeElement("section");
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "stale_cursor" },
    { ok: false, code: "SOCIAL_FEED_STALE_CURSOR" },
    { ok: true, empty: false, items: [post({ id: "post_fresh" })], nextCursor: "cursor_fresh" },
  ];
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: {
      load: async (options) => {
        calls.push(options || {});
        return responses.shift();
      },
    },
  });

  await controller.load({ limit: 15 });
  const stale = await controller.loadNext();
  assert.deepEqual(stale, { ok: false, code: "SOCIAL_FEED_STALE_CURSOR", reconnectRequired: true });
  assert.equal(host.children[0].attributes["data-social-post-id"], "post_01");

  const reconnected = await controller.reconnect();
  assert.equal(reconnected.ok, true);
  assert.deepEqual(calls, [
    { limit: 15 },
    { limit: 15, cursor: "stale_cursor" },
    { limit: 15 },
  ]);
  assert.deepEqual(
    host.children.map((node) => node.attributes["data-social-post-id"]),
    ["post_fresh"]
  );
});

test("mounted feed observes each page tail and advances keyset pagination", async () => {
  const host = fakeElement("section");
  const observed = [];
  const unobserved = [];
  let observerCallback;
  let observerOptions;
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "cursor_02" },
    { ok: true, empty: false, items: [post({ id: "post_02" })], nextCursor: "cursor_03" },
  ];
  const root = {
    document: Object.assign(fakeDocument(), {
      querySelector(selector) {
        return selector === "[data-social-feed-items]" ? host : null;
      },
    }),
    TIGERSocialRuntime: {
      createCurrentSocialRuntime() { return {}; },
    },
    TIGERSocialFeed: {
      createSocialFeedReadModel() {
        return { load: async () => responses.shift() };
      },
    },
    IntersectionObserver: function (callback, options) {
      observerCallback = callback;
      observerOptions = options;
      return {
        observe(node) { observed.push(node); },
        unobserve(node) { unobserved.push(node); },
      };
    },
  };

  const mounted = await mountCurrentSocialFeed(root);
  assert.equal(mounted.ok, true);
  assert.deepEqual(observerOptions, { rootMargin: "320px 0px" });
  assert.equal(observed[0].attributes["data-social-post-id"], "post_01");

  observerCallback([{ isIntersecting: true, target: observed[0] }]);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(unobserved[0].attributes["data-social-post-id"], "post_01");
  assert.equal(observed[1].attributes["data-social-post-id"], "post_02");
  assert.deepEqual(
    host.children.map((node) => node.attributes["data-social-post-id"]),
    ["post_01", "post_02"]
  );
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
