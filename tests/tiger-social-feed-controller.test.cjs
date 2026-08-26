"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  createSocialFeedController,
  mountCurrentSocialFeed,
} = require("../scripts/social/feed-controller.js");

const PROFILE_ALICE = "11111111-1111-4111-8111-111111111111";

function fakeElement(tagName) {
  return {
    tagName: String(tagName || "div").toUpperCase(),
    className: "",
    textContent: "",
    hidden: false,
    disabled: false,
    children: [],
    attributes: {},
    dataset: {},
    listeners: {},
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
    addEventListener(name, listener) {
      this.listeners[name] = listener;
    },
    click() {
      if (!this.disabled && this.listeners.click) {
        this.listeners.click({ currentTarget: this });
      }
    },
    focus() {
      this.focused = true;
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
    authorProfileId: PROFILE_ALICE,
    authorDisplayName: "Alice Tiger",
    authorAvatarUrl: null,
    authorAvailable: true,
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

  resolveLoad({ ok: true, items: [], empty: true, nextCursor: null });
  await promise;
});

test("controller renders an explicit empty state", async () => {
  const host = fakeElement("section");
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: { load: async () => ({ ok: true, items: [], empty: true, nextCursor: null }) },
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

test("controller renders safe displayed author identity and semantic post metadata", async () => {
  const host = fakeElement("section");
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: {
      load: async () => ({
        ok: true,
        empty: false,
        items: [
          post(),
          post({
            id: "post_02",
            authorProfileId: null,
            authorDisplayName: "عضو غير متاح",
            authorAvatarUrl: null,
            authorAvailable: false,
            audience: "public",
            body: "Second post",
          }),
        ],
        nextCursor: "cursor_03",
      }),
    },
  });

  const result = await controller.load({ limit: 10 });
  assert.equal(result.ok, true);
  assert.equal(result.count, 2);
  assert.equal(host.children.length, 3);
  assert.equal(host.children[0].attributes["data-social-post-id"], "post_01");
  assert.equal(host.children[0].attributes["data-social-post-audience"], "friends");
  assert.equal(host.children[0].attributes["aria-labelledby"], "social-post-author-post_01");
  assert.match(JSON.stringify(host.children[0]), /Alice Tiger/);
  assert.doesNotMatch(JSON.stringify(host.children[0]), /user_/);
  assert.match(JSON.stringify(host.children[1]), /عضو غير متاح/);
  assert.match(JSON.stringify(host.children[1]), /Second post/);
  assert.equal(host.children[2].attributes["data-social-feed-load-more"], "");
});

test("controller reports isolated malformed feed rows without hiding safe posts", async () => {
  const host = fakeElement("section");
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: {
      load: async () => ({
        ok: true,
        empty: false,
        rejectedCount: 2,
        items: [post()],
      }),
    },
  });

  const result = await controller.load();
  assert.deepEqual(result, { ok: true, count: 1, empty: false, hasMore: false, rejectedCount: 2 });
  assert.equal(host.dataset.socialFeedMalformed, "2");
  assert.equal(host.children.length, 1);
});

test("keyset retry keeps the same opaque cursor, applies 250/500 backoff, and appends once", async () => {
  const calls = [];
  const delays = [];
  const host = fakeElement("section");
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "opaque_cursor_02" },
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
    { limit: 10, cursor: "opaque_cursor_02" },
    { limit: 10, cursor: "opaque_cursor_02" },
    { limit: 10, cursor: "opaque_cursor_02" },
  ]);
  assert.deepEqual(delays, [250, 500]);
  assert.deepEqual(result, { ok: true, count: 1, hasMore: false, rejectedCount: 0 });
  assert.deepEqual(
    host.children.map((node) => node.attributes["data-social-post-id"]).filter(Boolean),
    ["post_01", "post_02"]
  );
});

test("rate-limited page reads are not automatically retried", async () => {
  const calls = [];
  const delays = [];
  const host = fakeElement("section");
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "opaque_cursor_02" },
    { ok: false, code: "SOCIAL_RATE_LIMITED", retryAfterMs: 5000 },
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

  assert.deepEqual(result, { ok: false, code: "SOCIAL_RATE_LIMITED", retryAfterMs: 5000 });
  assert.equal(calls.length, 2);
  assert.deepEqual(delays, []);
  assert.equal(host.children[0].attributes["data-social-post-id"], "post_01");
});

test("concurrent loadNext calls share one request and one append", async () => {
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
          return { ok: true, empty: false, items: [post()], nextCursor: "opaque_cursor_02" };
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
  assert.deepEqual(
    host.children.map((node) => node.attributes["data-social-post-id"]).filter(Boolean),
    ["post_01", "post_02"]
  );
});

test("rendered post IDs are deduped across keyset pages", async () => {
  const host = fakeElement("section");
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "opaque_cursor_02" },
    {
      ok: true,
      empty: false,
      items: [post(), post({ id: "post_02", body: "new" })],
      nextCursor: null,
    },
  ];
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: { load: async () => responses.shift() },
  });

  await controller.load();
  const result = await controller.loadNext();

  assert.deepEqual(result, { ok: true, count: 1, hasMore: false, rejectedCount: 0 });
  assert.deepEqual(
    host.children.map((node) => node.attributes["data-social-post-id"]).filter(Boolean),
    ["post_01", "post_02"]
  );
});

test("stale cursor preserves rendered posts and reconnect resets from a clean snapshot", async () => {
  const calls = [];
  const host = fakeElement("section");
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "stale_opaque_cursor" },
    { ok: false, code: "SOCIAL_FEED_STALE_CURSOR" },
    { ok: true, empty: false, items: [post({ id: "post_fresh" })], nextCursor: "opaque_cursor_fresh" },
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
    { limit: 15, cursor: "stale_opaque_cursor" },
    { limit: 15 },
  ]);
  assert.deepEqual(
    host.children.map((node) => node.attributes["data-social-post-id"]).filter(Boolean),
    ["post_fresh"]
  );
});

test("keyboard load-more fallback moves focus only when the terminal button disappears", async () => {
  const host = fakeElement("section");
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "opaque_cursor_02" },
    { ok: true, empty: false, items: [post({ id: "post_02" })], nextCursor: "opaque_cursor_03" },
    { ok: true, empty: false, items: [post({ id: "post_03" })], nextCursor: null },
  ];
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: { load: async () => responses.shift() },
  });

  await controller.load();
  const firstButton = host.lastElementChild;
  assert.equal(firstButton.tagName, "BUTTON");
  assert.equal(firstButton.textContent, "تحميل المزيد");
  assert.equal(firstButton.attributes["aria-label"], "تحميل المزيد من آخر الأخبار");

  firstButton.click();
  await new Promise((resolve) => setImmediate(resolve));

  const postTwo = host.children.find((node) => node.attributes["data-social-post-id"] === "post_02");
  assert.equal(postTwo.focused, undefined, "focus must not jump while a load-more fallback remains");
  const secondButton = host.lastElementChild;
  assert.equal(secondButton.attributes["data-social-feed-load-more"], "");

  secondButton.click();
  await new Promise((resolve) => setImmediate(resolve));

  const postThree = host.children.find((node) => node.attributes["data-social-post-id"] === "post_03");
  assert.equal(host.lastElementChild.attributes["data-social-feed-load-more"], undefined);
  assert.equal(postThree.attributes.tabindex, "-1");
  assert.equal(postThree.focused, true);
});

test("failed keyboard request does not leak focus to a later automatic load", async () => {
  const host = fakeElement("section");
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "opaque_cursor_02" },
    { ok: false, code: "SOCIAL_FEED_PAGE_FAILED" },
    { ok: true, empty: false, items: [post({ id: "post_02" })], nextCursor: null },
  ];
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: { load: async () => responses.shift() },
  });

  await controller.load();
  host.lastElementChild.click();
  await new Promise((resolve) => setImmediate(resolve));

  const automaticRetry = await controller.loadNext();
  assert.equal(automaticRetry.ok, true);
  const appended = host.children.find((node) => node.attributes["data-social-post-id"] === "post_02");
  assert.equal(appended.focused, undefined);
});

test("direct appended pages invoke the safe mounting callback with only new post nodes", async () => {
  const host = fakeElement("section");
  const appendedBatches = [];
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "opaque_cursor_02" },
    { ok: true, empty: false, items: [post({ id: "post_02" })], nextCursor: null },
  ];
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    onItemsAppended(nodes) {
      appendedBatches.push(nodes);
    },
    readModel: { load: async () => responses.shift() },
  });

  await controller.load();
  await controller.loadNext();

  assert.equal(appendedBatches.length, 1);
  assert.deepEqual(
    appendedBatches[0].map((node) => node.attributes["data-social-post-id"]),
    ["post_02"]
  );
});

test("mounted feed observes each page tail and remounts reactions/comments after append", async () => {
  const host = fakeElement("section");
  const observed = [];
  const unobserved = [];
  let observerCallback;
  let observerOptions;
  let reactionMounts = 0;
  let commentMounts = 0;
  const responses = [
    { ok: true, empty: false, items: [post()], nextCursor: "opaque_cursor_02" },
    { ok: true, empty: false, items: [post({ id: "post_02" })], nextCursor: "opaque_cursor_03" },
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
    TIGERSocialReactions: {
      mountCurrentSocialReactions() { reactionMounts += 1; },
    },
    TIGERSocialComments: {
      mountCurrentSocialComments() { commentMounts += 1; },
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
  assert.equal(observed[0].attributes["data-social-feed-load-more"], "");
  assert.equal(reactionMounts, 1);
  assert.equal(commentMounts, 1);

  observerCallback([{ isIntersecting: true, target: observed[0] }]);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(unobserved[0].attributes["data-social-feed-load-more"], "");
  assert.equal(observed[1].attributes["data-social-feed-load-more"], "");
  assert.equal(reactionMounts, 2);
  assert.equal(commentMounts, 2);
  assert.deepEqual(
    host.children.map((node) => node.attributes["data-social-post-id"]).filter(Boolean),
    ["post_01", "post_02"]
  );
});

test("social feed motion respects the operating-system reduced-motion preference", () => {
  const css = fs.readFileSync("styles/tiger-social/core-shell.css", "utf8");
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /prefers-reduced-motion:[\s\S]*?\.social-feed-post[\s\S]*?transition:\s*none/);
});

test("feed controller source never uses innerHTML or Clerk subjects for user content", () => {
  const source = fs.readFileSync("scripts/social/feed-controller.js", "utf8");
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.doesNotMatch(source, /authorSubject|author_subject/);
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
