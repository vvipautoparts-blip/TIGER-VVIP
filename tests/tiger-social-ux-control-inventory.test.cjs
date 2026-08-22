"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createSocialFeedController } = require("../scripts/social/feed-controller.js");

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
    addEventListener(name, listener) { this.listeners[name] = listener; },
    focus() { this.focused = true; },
    get lastElementChild() { return this.children[this.children.length - 1] || null; },
  };
}

function fakeDocument() {
  return {
    createElement(tagName) {
      return fakeElement(tagName);
    },
  };
}

test("unimplemented post actions are omitted until a real capability exists", async () => {
  const host = fakeElement("section");
  const controller = createSocialFeedController({
    host,
    document: fakeDocument(),
    readModel: {
      load: async () => ({
        ok: true,
        items: [{
          id: "post_01",
          authorProfileId: "11111111-1111-4111-8111-111111111111",
          authorDisplayName: "Alice Tiger",
          body: "Hello TIGER",
          audience: "friends",
          createdAt: "2026-08-18T11:00:00.000Z",
        }],
        nextCursor: null,
      }),
    },
  });

  const result = await controller.load();
  assert.equal(result.ok, true);

  const renderedPost = host.children[0];
  const header = renderedPost.children[0];
  const actions = renderedPost.children[2];
  const reactions = actions.children[0];
  const secondaryActions = actions.children[1];
  const comment = secondaryActions.children[0];

  assert.equal(header.children.length, 2, "post header must not render a dead options menu");
  assert.equal(actions.children.length, 2, "post actions must contain reactions plus implemented secondary actions only");
  assert.equal(reactions.attributes["data-social-reactions-host"], "");
  assert.equal(secondaryActions.children.length, 1, "Share stays absent until a real distribution capability exists");
  assert.equal(comment.attributes["data-social-comment-trigger"], "");
  assert.equal(comment.disabled, false);
});
