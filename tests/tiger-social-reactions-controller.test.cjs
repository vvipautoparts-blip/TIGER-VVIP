"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  REACTION_DEFINITIONS,
  createSocialReactionsController,
} = require("../scripts/social/reactions-controller.js");

const POST_ID = "11111111-1111-4111-8111-111111111111";

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
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); return node; },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener(name, handler) { this.listeners[name] = handler; },
  };
}

function fakeDocument() {
  return { createElement: fakeElement };
}

function flatten(node) {
  return [node, ...(node.children || []).flatMap(flatten)];
}

function summary(overrides) {
  return Object.assign({
    ok: true,
    post_id: POST_ID,
    total: 3,
    counts: { like: 2, love: 1 },
    viewer_reaction: null,
  }, overrides || {});
}

test("reaction definitions provide seven familiar behaviors with independent TIGER icons and semantic color hooks", () => {
  assert.equal(REACTION_DEFINITIONS.length, 7);
  assert.deepEqual(REACTION_DEFINITIONS.map((item) => item.type), [
    "like", "love", "support", "haha", "wow", "sad", "angry",
  ]);
  assert.equal(new Set(REACTION_DEFINITIONS.map((item) => item.icon)).size, 7);
  for (const item of REACTION_DEFINITIONS) {
    assert.match(item.label, /\S/);
    assert.match(item.colorToken, /^--tiger-reaction-/);
  }
});

test("controller renders server-confirmed total, primary Like action, and seven-reaction picker", async () => {
  const host = fakeElement("section");
  const runtime = {
    reactions: {
      summary: async () => ({ ok: true, value: summary() }),
      set: async () => ({ ok: true, value: summary() }),
      remove: async () => ({ ok: true, value: summary({ total: 0, counts: {} }) }),
    },
  };
  const controller = createSocialReactionsController({ host, runtime, document: fakeDocument(), postId: POST_ID });

  const result = await controller.load();
  assert.equal(result.ok, true);
  assert.equal(host.dataset.socialReactionTotal, "3");

  const nodes = flatten(host);
  assert.ok(nodes.some((node) => node.attributes["data-social-reaction-main"] === "like"));
  assert.equal(nodes.filter((node) => node.attributes["data-social-reaction-choice"]).length, 7);
  assert.match(JSON.stringify(host), /👍|♥|🫶|😄|😮|😢|😠/);
});

test("main Like action does not change selected reaction or count before server confirmation", async () => {
  let resolveSet;
  const host = fakeElement("section");
  const runtime = {
    reactions: {
      summary: async () => ({ ok: true, value: summary({ total: 3, viewer_reaction: null }) }),
      set: () => new Promise((resolve) => { resolveSet = resolve; }),
      remove: async () => ({ ok: true, value: summary({ total: 2, viewer_reaction: null }) }),
    },
  };
  const controller = createSocialReactionsController({ host, runtime, document: fakeDocument(), postId: POST_ID });
  await controller.load();

  const pending = controller.toggleLike();
  assert.equal(host.dataset.socialReactionTotal, "3");
  assert.equal(host.dataset.socialViewerReaction || "", "");

  resolveSet({ ok: true, value: summary({ total: 4, counts: { like: 3, love: 1 }, viewer_reaction: "like" }) });
  const result = await pending;
  assert.equal(result.ok, true);
  assert.equal(host.dataset.socialReactionTotal, "4");
  assert.equal(host.dataset.socialViewerReaction, "like");
});

test("choosing a picker reaction waits for server confirmation and active Like toggles remove", async () => {
  const calls = [];
  const host = fakeElement("section");
  const runtime = {
    reactions: {
      summary: async () => ({ ok: true, value: summary({ viewer_reaction: "like" }) }),
      set: async (postId, type) => {
        calls.push(["set", postId, type]);
        return { ok: true, value: summary({ total: 3, counts: { love: 2, like: 1 }, viewer_reaction: type }) };
      },
      remove: async (postId) => {
        calls.push(["remove", postId]);
        return { ok: true, value: summary({ total: 2, counts: { love: 1, like: 1 }, viewer_reaction: null }) };
      },
    },
  };
  const controller = createSocialReactionsController({ host, runtime, document: fakeDocument(), postId: POST_ID });
  await controller.load();

  assert.equal((await controller.choose("love")).ok, true);
  assert.equal(host.dataset.socialViewerReaction, "love");
  assert.equal((await controller.toggleLike()).ok, true);
  assert.equal(host.dataset.socialViewerReaction, "like");
  assert.equal((await controller.toggleLike()).ok, true);
  assert.equal(host.dataset.socialViewerReaction, "");
  assert.deepEqual(calls, [
    ["set", POST_ID, "love"],
    ["set", POST_ID, "like"],
    ["remove", POST_ID],
  ]);
});

test("controller fails closed on invalid reaction and renders opaque failure state", async () => {
  let setCalls = 0;
  const host = fakeElement("section");
  const runtime = {
    reactions: {
      summary: async () => ({ ok: false, code: "SOCIAL_PERSISTENCE_FAILED:secret" }),
      set: async () => { setCalls += 1; return { ok: false, code: "x" }; },
      remove: async () => ({ ok: false, code: "x" }),
    },
  };
  const controller = createSocialReactionsController({ host, runtime, document: fakeDocument(), postId: POST_ID });

  assert.equal((await controller.choose("copy-meta-care")).ok, false);
  assert.equal(setCalls, 0);
  assert.equal((await controller.load()).ok, false);
  assert.doesNotMatch(JSON.stringify(host), /secret|persistence/i);
});

test("reaction controller never renders user/provider content through innerHTML", () => {
  const source = fs.readFileSync("scripts/social/reactions-controller.js", "utf8");
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.match(source, /textContent/);
});

test("feed, authoritative index, public release, and TIGER stylesheet expose the reactions surface", () => {
  const feed = fs.readFileSync("scripts/social/feed-controller.js", "utf8");
  const html = fs.readFileSync("index.html", "utf8");
  const builder = fs.readFileSync("tools/vvip_public_release.py", "utf8");
  const css = fs.readFileSync("styles/tiger-social/core-shell.css", "utf8");

  assert.match(feed, /data-social-reactions-host/);
  assert.match(html, /scripts\/social\/reactions-controller\.js/);
  assert.match(builder, /scripts\/social\/reactions-controller\.js/);
  assert.match(css, /--tiger-reaction-like/);
  assert.match(css, /--tiger-reaction-love/);
  assert.match(css, /--tiger-reaction-support/);
  assert.match(css, /--tiger-reaction-angry/);
});
