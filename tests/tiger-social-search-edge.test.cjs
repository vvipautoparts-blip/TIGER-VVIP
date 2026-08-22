"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const controllerApi = require("../scripts/social/search-controller.js");

function fakeView() {
  const snapshots = [];
  return {
    snapshots,
    setState(state) { snapshots.push({ type: "state", state }); },
    renderPeople(items) { snapshots.push({ type: "people", items }); },
    renderPosts(items) { snapshots.push({ type: "posts", items }); },
    setQuery(query) { snapshots.push({ type: "query", query }); },
  };
}

function deferred() {
  let resolve;
  return {
    promise: new Promise((done) => { resolve = done; }),
    resolve,
  };
}

test("P0-D Search turns rejected RPCs into deterministic partial/error state", async () => {
  const view = fakeView();
  const controller = controllerApi.createTigerSocialSearchController({
    search: {
      people: async () => { throw new Error("network down"); },
      posts: async () => ({ ok: false, code: "SOCIAL_SEARCH_RETRYABLE" }),
    },
    view,
  });

  const result = await controller.search("tiger");
  assert.equal(result.state, "error");
  assert.equal(result.code, "SOCIAL_SEARCH_RETRYABLE");
  assert.doesNotMatch(JSON.stringify(view.snapshots), /network down/);
});

test("P0-D identical in-flight queries dedupe and retry reissues one read", async () => {
  const view = fakeView();
  const firstPeople = deferred();
  const firstPosts = deferred();
  let peopleCalls = 0;
  let postCalls = 0;
  const controller = controllerApi.createTigerSocialSearchController({
    search: {
      people: () => {
        peopleCalls += 1;
        return peopleCalls === 1
          ? firstPeople.promise
          : Promise.resolve({ ok: true, value: { items: [{ profile_id: "p1" }], next_cursor: null } });
      },
      posts: () => {
        postCalls += 1;
        return postCalls === 1
          ? firstPosts.promise
          : Promise.resolve({ ok: true, value: { items: [{ post_id: "post-1" }], next_cursor: null } });
      },
    },
    view,
  });

  const first = controller.search(" tiger ");
  const duplicate = controller.search(" tiger ");
  assert.strictEqual(first, duplicate);
  assert.equal(peopleCalls, 1);
  assert.equal(postCalls, 1);

  firstPeople.resolve({ ok: false, code: "SOCIAL_SEARCH_RETRYABLE" });
  firstPosts.resolve({ ok: false, code: "SOCIAL_SEARCH_RETRYABLE" });
  assert.equal((await first).state, "error");

  const retried = await controller.retry();
  assert.equal(retried.state, "content");
  assert.equal(peopleCalls, 2);
  assert.equal(postCalls, 2);
});

test("P0-D offline search fails closed without RPC and reconnect retry is explicit", async () => {
  const view = fakeView();
  let online = false;
  let calls = 0;
  const controller = controllerApi.createTigerSocialSearchController({
    search: {
      people: async () => {
        calls += 1;
        return { ok: true, value: { items: [], next_cursor: null } };
      },
      posts: async () => {
        calls += 1;
        return { ok: true, value: { items: [], next_cursor: null } };
      },
    },
    view,
    isOnline: () => online,
  });

  const offline = await controller.search("tiger");
  assert.equal(offline.state, "offline");
  assert.equal(offline.code, "SOCIAL_SEARCH_OFFLINE");
  assert.equal(calls, 0);

  online = true;
  const reconnected = await controller.retry();
  assert.equal(reconnected.state, "empty");
  assert.equal(calls, 2);
});

test("P0-D Search edge surfaces keep retry keyboard-safe and reduced-motion aware", () => {
  const shell = fs.readFileSync(path.join(root, "scripts/social/core-shell.js"), "utf8");
  const controller = fs.readFileSync(path.join(root, "scripts/social/search-controller.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "styles/tiger-social/search.css"), "utf8");

  assert.match(shell, /data-social-search-retry/);
  assert.match(shell, /type = 'button'|type = "button"/);
  assert.match(controller, /data-social-search-retry/);
  assert.match(controller, /addEventListener\(["']online["']/);
  assert.match(controller, /event\.key !== ["']Enter["']/);
  assert.match(css, /prefers-reduced-motion/);
});
