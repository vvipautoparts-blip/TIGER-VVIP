"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const controllerPath = "scripts/social/comments-controller.js";
const POST_ID = "11111111-1111-4111-8111-111111111111";
const COMMENT_ID = "22222222-2222-4222-8222-222222222222";
const REPLY_ID = "33333333-3333-4333-8333-333333333333";

function controllerApi() {
  assert.equal(fs.existsSync(controllerPath), true, "comments controller must exist before behavior tests can pass");
  return require("../scripts/social/comments-controller.js");
}

function fakeElement(tagName) {
  const element = {
    tagName: String(tagName || "div").toUpperCase(),
    className: "",
    textContent: "",
    hidden: false,
    disabled: false,
    value: "",
    children: [],
    attributes: {},
    dataset: {},
    listeners: {},
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); return node; },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name]; },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener(name, handler) {
      if (!this.listeners[name]) this.listeners[name] = [];
      this.listeners[name].push(handler);
    },
    removeEventListener(name, handler) {
      this.listeners[name] = (this.listeners[name] || []).filter((item) => item !== handler);
    },
    dispatch(name, event) {
      for (const handler of this.listeners[name] || []) handler(event || { preventDefault() {} });
    },
    focus() { this.focused = true; },
  };
  Object.defineProperty(element, "innerHTML", {
    set() { throw new Error("TEST_DENIES_INNER_HTML"); },
  });
  return element;
}

function fakeDocument() {
  return { createElement: fakeElement };
}

function flatten(node) {
  return [node, ...(node.children || []).flatMap(flatten)];
}

function textOf(node) {
  return flatten(node).map((item) => item.textContent || "").join(" ");
}

function row(overrides) {
  return Object.assign({
    comment_id: COMMENT_ID,
    post_id: POST_ID,
    parent_comment_id: null,
    body: "تعليق مؤكد",
    created_at: "2026-08-18T12:00:00.000Z",
    updated_at: "2026-08-18T12:00:00.000Z",
    viewer_can_edit: true,
  }, overrides || {});
}

function list(items) {
  return {
    ok: true,
    value: {
      ok: true,
      post_id: POST_ID,
      total: items.length,
      items,
    },
  };
}

test("comments controller renders confirmed top-level comments and replies as text-only DOM", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  const comments = {
    list: async () => list([
      row({ body: '<img src=x onerror="steal()">تعليق' }),
      row({ comment_id: REPLY_ID, parent_comment_id: COMMENT_ID, body: "رد مؤكد", viewer_can_edit: false }),
    ]),
    create: async () => ({ ok: false, code: "unused" }),
    update: async () => ({ ok: false, code: "unused" }),
    remove: async () => ({ ok: false, code: "unused" }),
  };
  const controller = createSocialCommentsController({ host, postId: POST_ID, comments, document: fakeDocument() });

  const result = await controller.load();

  assert.deepEqual(result, { ok: true, count: 2, empty: false });
  assert.equal(host.dataset.socialCommentsCount, "2");
  assert.match(textOf(host), /<img src=x onerror="steal\(\)">تعليق/);
  assert.match(textOf(host), /رد مؤكد/);
  assert.ok(flatten(host).some((node) => node.attributes["data-social-comment-reply"] === COMMENT_ID));
  assert.ok(flatten(host).some((node) => node.attributes["data-social-comment-edit"] === COMMENT_ID));
  assert.ok(flatten(host).some((node) => node.attributes["data-social-comment-remove"] === COMMENT_ID));
});

test("comment creation is single-flight and does not render optimistic success", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  let createCalls = 0;
  let listCalls = 0;
  let resolveCreate;
  const comments = {
    list: async () => {
      listCalls += 1;
      return list(listCalls === 1 ? [row()] : [row(), row({ comment_id: REPLY_ID, body: "تعليق جديد" })]);
    },
    create: () => {
      createCalls += 1;
      return new Promise((resolve) => { resolveCreate = resolve; });
    },
    update: async () => ({ ok: false, code: "unused" }),
    remove: async () => ({ ok: false, code: "unused" }),
  };
  const controller = createSocialCommentsController({ host, postId: POST_ID, comments, document: fakeDocument() });
  await controller.load();

  const first = controller.create("تعليق جديد");
  const duplicate = await controller.create("تعليق جديد");

  assert.deepEqual(duplicate, { ok: false, code: "SOCIAL_COMMENT_PENDING" });
  assert.equal(createCalls, 1);
  assert.doesNotMatch(textOf(host), /تعليق جديد/);

  resolveCreate({ ok: true, value: { ok: true, item: row({ comment_id: REPLY_ID, body: "تعليق جديد" }) } });
  assert.deepEqual(await first, { ok: true, count: 2, empty: false });
  assert.match(textOf(host), /تعليق جديد/);
});

test("failed comment mutation preserves confirmed content and hides provider details", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  const comments = {
    list: async () => list([row()]),
    create: async () => ({ ok: false, code: "SOCIAL_PERSISTENCE_FAILED:secret-provider-detail" }),
    update: async () => ({ ok: false, code: "unused" }),
    remove: async () => ({ ok: false, code: "unused" }),
  };
  const controller = createSocialCommentsController({ host, postId: POST_ID, comments, document: fakeDocument() });
  await controller.load();

  const result = await controller.create("لن ينشر");

  assert.deepEqual(result, { ok: false, code: "SOCIAL_COMMENTS_FAILED" });
  assert.match(textOf(host), /تعليق مؤكد/);
  assert.doesNotMatch(JSON.stringify(host), /secret|provider|persistence/i);
});

test("rate-limited comment mutation enters a deterministic cooldown without duplicate writes", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  let now = 1_000;
  let createCalls = 0;
  const comments = {
    list: async () => list([row()]),
    create: async () => {
      createCalls += 1;
      if (createCalls === 1) {
        return {
          ok: false,
          code: "SOCIAL_RATE_LIMITED",
          retryAfterMs: 5_000,
          providerDetail: "secret-provider-bucket",
        };
      }
      return { ok: true, value: { ok: true } };
    },
    update: async () => ({ ok: false, code: "unused" }),
    remove: async () => ({ ok: false, code: "unused" }),
  };
  const controller = createSocialCommentsController({
    host,
    postId: POST_ID,
    comments,
    document: fakeDocument(),
    now: () => now,
  });
  await controller.load();

  assert.deepEqual(await controller.create("تعليق محدود"), {
    ok: false,
    code: "SOCIAL_COMMENTS_RATE_LIMITED",
    retryAfterMs: 5_000,
  });
  assert.deepEqual(await controller.create("تعليق محدود"), {
    ok: false,
    code: "SOCIAL_COMMENTS_RATE_LIMITED",
    retryAfterMs: 5_000,
  });
  assert.equal(createCalls, 1, "cooldown must not repeat the durable mutation");
  assert.match(textOf(host), /تعليق مؤكد/);
  assert.doesNotMatch(JSON.stringify(host), /secret|provider|bucket/i);

  now = 6_000;
  assert.equal((await controller.create("تعليق محدود")).ok, true);
  assert.equal(createCalls, 2, "only an explicit retry after cooldown may write again");
});

test("reply update and remove methods call only the bounded adapter and refresh trusted state", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  const calls = [];
  const comments = {
    list: async () => list([row()]),
    create: async (postId, input) => {
      calls.push(["create", postId, input]);
      return { ok: true, value: { ok: true } };
    },
    update: async (commentId, body) => {
      calls.push(["update", commentId, body]);
      return { ok: true, value: { ok: true } };
    },
    remove: async (commentId) => {
      calls.push(["remove", commentId]);
      return { ok: true, value: { ok: true } };
    },
  };
  const controller = createSocialCommentsController({ host, postId: POST_ID, comments, document: fakeDocument() });

  await controller.reply(COMMENT_ID, "رد");
  await controller.update(COMMENT_ID, "تعديل");
  await controller.remove(COMMENT_ID);

  assert.deepEqual(calls, [
    ["create", POST_ID, { body: "رد", parentCommentId: COMMENT_ID }],
    ["update", COMMENT_ID, "تعديل"],
    ["remove", COMMENT_ID],
  ]);
});

test("destroy clears owned DOM and prevents later adapter work", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  let listCalls = 0;
  const comments = {
    list: async () => {
      listCalls += 1;
      return list([row()]);
    },
    create: async () => ({ ok: true, value: { ok: true } }),
    update: async () => ({ ok: true, value: { ok: true } }),
    remove: async () => ({ ok: true, value: { ok: true } }),
  };
  const controller = createSocialCommentsController({ host, postId: POST_ID, comments, document: fakeDocument() });

  await controller.load();
  assert.deepEqual(controller.destroy(), { destroyed: true });
  assert.equal(host.children.length, 0);
  assert.deepEqual(await controller.load(), { ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
  assert.equal(listCalls, 1);
});

test("comments controller source has no raw HTML or inline-handler construction", () => {
  const source = fs.readFileSync(controllerPath, "utf8");
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.doesNotMatch(source, /insertAdjacentHTML/);
  assert.doesNotMatch(source, /setAttribute\(\s*["']on[a-z]+["']/i);
  assert.match(source, /textContent/);
});
