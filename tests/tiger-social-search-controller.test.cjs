"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const controllerPath = path.join(__dirname, "../scripts/social/search-controller.js");
const controllerApi = fs.existsSync(controllerPath) ? require(controllerPath) : null;

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

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

test("P0-C search controller exists as a focused CommonJS/browser module", () => {
  assert.equal(fs.existsSync(controllerPath), true, "search controller must be implemented after RED");
  assert.ok(controllerApi);
  assert.equal(typeof controllerApi.createTigerSocialSearchController, "function");
});

test("P0-C keeps successful People results when Posts fail and reports partial state", async () => {
  assert.ok(controllerApi);
  const view = fakeView();
  const states = [];
  const controller = controllerApi.createTigerSocialSearchController({
    search: {
      people: async () => ({ ok: true, value: { items: [{ profile_id: "p1", display_name: "Tiger" }], next_cursor: null } }),
      posts: async () => ({ ok: false, code: "SOCIAL_SEARCH_RETRYABLE" }),
    },
    view,
    onStateChange: (state) => states.push(state),
  });

  const result = await controller.search("tiger");
  assert.equal(result.state, "partial");
  assert.equal(result.peopleCount, 1);
  assert.equal(result.postsCount, 0);
  assert.ok(view.snapshots.some((entry) => entry.type === "people" && entry.items.length === 1));
  assert.ok(states.some((state) => state.kind === "partial" && state.code === "SOCIAL_SEARCH_RETRYABLE"));
});

test("P0-C late responses from an older query cannot overwrite the newer query", async () => {
  assert.ok(controllerApi);
  const firstPeople = deferred();
  const firstPosts = deferred();
  const view = fakeView();
  let call = 0;
  const controller = controllerApi.createTigerSocialSearchController({
    search: {
      people(query) {
        if (query === "first") return firstPeople.promise;
        return Promise.resolve({ ok: true, value: { items: [{ profile_id: "new", display_name: "New" }], next_cursor: null } });
      },
      posts(query) {
        if (query === "first") return firstPosts.promise;
        return Promise.resolve({ ok: true, value: { items: [{ post_id: "new-post", body: "new" }], next_cursor: null } });
      },
    },
    view,
    onStateChange() { call += 1; },
  });

  const oldRun = controller.search("first");
  const newRun = controller.search("second");
  const newResult = await newRun;
  assert.equal(newResult.state, "content");

  firstPeople.resolve({ ok: true, value: { items: [{ profile_id: "old", display_name: "Old" }], next_cursor: null } });
  firstPosts.resolve({ ok: true, value: { items: [{ post_id: "old-post", body: "old" }], next_cursor: null } });
  const oldResult = await oldRun;
  assert.equal(oldResult.state, "stale");

  const renderedPeople = view.snapshots.filter((entry) => entry.type === "people");
  assert.equal(renderedPeople.at(-1).items[0].profile_id, "new");
  const renderedPosts = view.snapshots.filter((entry) => entry.type === "posts");
  assert.equal(renderedPosts.at(-1).items[0].post_id, "new-post");
  assert.ok(call >= 2);
});

test("P0-C empty, rate-limited, and retryable outcomes map to explicit states", async () => {
  assert.ok(controllerApi);
  const cases = [
    [{ ok: true, value: { items: [], next_cursor: null } }, { ok: true, value: { items: [], next_cursor: null } }, "empty"],
    [{ ok: false, code: "SOCIAL_RATE_LIMITED", retryAfterMs: 5000 }, { ok: false, code: "SOCIAL_RATE_LIMITED", retryAfterMs: 5000 }, "rate-limited"],
    [{ ok: false, code: "SOCIAL_SEARCH_RETRYABLE" }, { ok: false, code: "SOCIAL_SEARCH_RETRYABLE" }, "error"],
  ];

  for (const [people, posts, expected] of cases) {
    const view = fakeView();
    const controller = controllerApi.createTigerSocialSearchController({
      search: { people: async () => people, posts: async () => posts },
      view,
    });
    const result = await controller.search("tiger");
    assert.equal(result.state, expected);
  }
});

test("P0-C controller source uses text-safe DOM rendering and generation fencing", () => {
  assert.equal(fs.existsSync(controllerPath), true, "controller source must exist");
  const source = fs.readFileSync(controllerPath, "utf8");
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.match(source, /textContent/);
  assert.match(source, /generation/);
  assert.match(source, /keydown/);
  assert.match(source, /250/);
});
