"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  createSocialFeedController,
  mountCurrentSocialFeed,
} = require("../scripts/social/feed-controller.js");

const PROFILE_ID = "11111111-1111-4111-8111-111111111111";

function element(tagName) {
  const listeners = {};
  return {
    tagName: String(tagName || "div").toUpperCase(),
    className: "", textContent: "", hidden: false, disabled: false,
    children: [], attributes: {}, dataset: {}, listeners,
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); return node; },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    addEventListener(name, listener) { listeners[name] = listener; },
    focus() { this.focused = true; },
    get lastElementChild() { return this.children[this.children.length - 1] || null; },
  };
}

function documentFixture(host) {
  return {
    createElement: element,
    querySelector(selector) {
      return selector === "[data-social-feed-items]" ? host : null;
    },
  };
}

function post(id) {
  return Object.freeze({
    id,
    authorProfileId: PROFILE_ID,
    authorDisplayName: "Resilience Tiger",
    authorAvatarUrl: null,
    authorAvailable: true,
    body: "Operational resilience proof",
    audience: "public",
    createdAt: "2026-08-24T13:00:00.000Z",
    updatedAt: "2026-08-24T13:00:00.000Z",
  });
}

test("initial offline state fails closed before transport and reconnects cleanly", async () => {
  let online = false;
  let reads = 0;
  const host = element("section");
  const controller = createSocialFeedController({
    host,
    document: documentFixture(host),
    isOnline: () => online,
    readModel: { load: async () => {
      reads += 1;
      return { ok: true, items: [post("post_online")], nextCursor: null };
    } },
  });

  assert.deepEqual(await controller.load({ limit: 20 }), {
    ok: false, code: "SOCIAL_FEED_OFFLINE", reconnectRequired: true,
  });
  assert.equal(reads, 0);
  assert.equal(host.children[0].attributes["data-social-feed-state"], "offline");
  assert.equal(host.children[0].attributes["aria-live"], "polite");

  online = true;
  assert.equal((await controller.reconnect()).ok, true);
  assert.equal(reads, 1);
  assert.equal(host.children[0].attributes["data-social-post-id"], "post_online");
});

test("initial transient read uses bounded retry without changing request", async () => {
  const calls = [];
  const delays = [];
  const responses = [
    { ok: false, code: "SOCIAL_FEED_RETRYABLE" },
    { ok: false, code: "SOCIAL_FEED_RETRYABLE" },
    { ok: true, items: [post("post_retry")], nextCursor: null },
  ];
  const host = element("section");
  const controller = createSocialFeedController({
    host,
    document: documentFixture(host),
    sleep: async (delay) => { delays.push(delay); },
    isOnline: () => true,
    readModel: { load: async (options) => {
      calls.push(options);
      return responses.shift();
    } },
  });

  const result = await controller.load({ limit: 15 });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ limit: 15 }, { limit: 15 }, { limit: 15 }]);
  assert.deepEqual(delays, [250, 500]);
});

test("offline next page preserves posts and exposes accessible retry fallback", async () => {
  let online = true;
  let reads = 0;
  const host = element("section");
  const controller = createSocialFeedController({
    host,
    document: documentFixture(host),
    isOnline: () => online,
    readModel: { load: async () => {
      reads += 1;
      return { ok: true, items: [post("post_first")], nextCursor: "opaque_cursor_02" };
    } },
  });

  await controller.load();
  online = false;
  assert.deepEqual(await controller.loadNext(), {
    ok: false, code: "SOCIAL_FEED_OFFLINE", reconnectRequired: true,
  });
  assert.equal(reads, 1);
  assert.equal(host.children[0].attributes["data-social-post-id"], "post_first");
  assert.equal(host.lastElementChild.textContent, "إعادة المحاولة");
  assert.equal(host.lastElementChild.attributes["aria-label"], "إعادة محاولة تحميل المزيد من آخر الأخبار");
});

test("mounted feed handles offline and online as one bounded reconnect flow", async () => {
  const host = element("section");
  const listeners = {};
  let reads = 0;
  const root = {
    navigator: { onLine: true },
    document: documentFixture(host),
    addEventListener(name, listener) { listeners[name] = listener; },
    TIGERSocialRuntime: { createCurrentSocialRuntime() { return {}; } },
    TIGERSocialFeed: { createSocialFeedReadModel() { return { load: async () => {
      reads += 1;
      return { ok: true, items: [post(`post_mount_${reads}`)], nextCursor: null };
    } }; } },
  };

  assert.equal((await mountCurrentSocialFeed(root)).ok, true);
  assert.equal(root.TIGERSocialFeedCurrent !== undefined, true);
  assert.equal(typeof listeners.offline, "function");
  assert.equal(typeof listeners.online, "function");

  root.navigator.onLine = false;
  listeners.offline();
  assert.equal(reads, 1);

  root.navigator.onLine = true;
  listeners.online();
  listeners.online();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reads, 2, "duplicate online events must share one reconnect");
  assert.equal(host.children[0].attributes["data-social-post-id"], "post_mount_2");
});

test("resilience stays read-only and keeps explicit accessibility and pagination fallbacks", () => {
  const source = fs.readFileSync("scripts/social/feed-controller.js", "utf8");
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /data-social-feed-load-more/);
  assert.match(source, /aria-live/);
  assert.doesNotMatch(source, /localStorage|indexedDB|serviceWorker/i);
});
