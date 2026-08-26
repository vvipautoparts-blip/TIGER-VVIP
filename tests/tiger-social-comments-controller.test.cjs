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

function list(items, options) {
  const settings = options || {};
  return {
    ok: true,
    value: {
      ok: true,
      post_id: POST_ID,
      parent_comment_id: settings.parentCommentId || null,
      page_count: items.length,
      items,
      next_cursor: settings.nextCursor || null,
    },
  };
}

test("comments controller renders bounded parent and reply pages as text-only DOM", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  const comments = {
    list: async (_postId, options) => options && options.parentCommentId
      ? list([
        row({ comment_id: REPLY_ID, parent_comment_id: COMMENT_ID, body: "رد مؤكد", viewer_can_edit: false }),
      ], { parentCommentId: COMMENT_ID })
      : list([row({ body: '<img src=x onerror="steal()">تعليق' })]),
    create: async () => ({ ok: false, code: "unused" }),
    update: async () => ({ ok: false, code: "unused" }),
    remove: async () => ({ ok: false, code: "unused" }),
  };
  const controller = createSocialCommentsController({ host, postId: POST_ID, comments, document: fakeDocument() });

  const result = await controller.load();
  const replyResult = await controller.loadReplies(COMMENT_ID);

  assert.deepEqual(result, { ok: true, count: 1, empty: false, rejectedCount: 0, nextCursor: null });
  assert.deepEqual(replyResult, { ok: true, count: 1, rejectedCount: 0, nextCursor: null });
  assert.equal(host.dataset.socialCommentsCount, "2");
  assert.match(textOf(host), /<img src=x onerror="steal\(\)">تعليق/);
  assert.match(textOf(host), /رد مؤكد/);
  assert.ok(flatten(host).some((node) => node.attributes["data-social-comment-reply"] === COMMENT_ID));
  assert.ok(flatten(host).some((node) => node.attributes["data-social-comment-edit"] === COMMENT_ID));
  assert.ok(flatten(host).some((node) => node.attributes["data-social-comment-remove"] === COMMENT_ID));
  const draft = flatten(host).find((node) => Object.hasOwn(node.attributes, "data-social-comment-draft"));
  assert.equal(Object.hasOwn(draft.attributes, "maxlength"), false);
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
  assert.deepEqual(await first, {
    ok: true,
    count: 2,
    empty: false,
    rejectedCount: 0,
    nextCursor: null,
  });
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

test("a wrapper success without RPC confirmation is not treated as a saved mutation", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  let listCalls = 0;
  const comments = {
    list: async () => { listCalls += 1; return list([row()]); },
    create: async () => ({ ok: true, value: { ok: false } }),
    update: async () => ({ ok: false }),
    remove: async () => ({ ok: false }),
  };
  const controller = createSocialCommentsController({ host, postId: POST_ID, comments, document: fakeDocument() });
  await controller.load();

  assert.deepEqual(await controller.create("غير مؤكد"), {
    ok: false,
    code: "SOCIAL_COMMENTS_FAILED",
  });
  assert.equal(listCalls, 1);
  assert.match(textOf(host), /تعذر حفظ التغيير/);
});

test("confirmed mutation clears the create draft and reports refresh-pending without a duplicate create path", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  let listCalls = 0;
  let createCalls = 0;
  const comments = {
    list: async () => {
      listCalls += 1;
      if (listCalls === 2) return { ok: false, code: "SOCIAL_PERSISTENCE_FAILED" };
      return list(listCalls === 1 ? [row()] : [row(), row({ comment_id: REPLY_ID, body: "محفوظ" })]);
    },
    create: async () => {
      createCalls += 1;
      return { ok: true, value: { ok: true, item: row({ comment_id: REPLY_ID, body: "محفوظ" }) } };
    },
    update: async () => ({ ok: false, code: "unused" }),
    remove: async () => ({ ok: false, code: "unused" }),
  };
  const controller = createSocialCommentsController({ host, postId: POST_ID, comments, document: fakeDocument() });
  await controller.load();
  const draft = flatten(host).find((node) => Object.hasOwn(node.attributes, "data-social-comment-draft"));
  draft.value = "محفوظ";

  const saved = await controller.create("محفوظ");

  assert.deepEqual(saved, { ok: true, code: "SOCIAL_COMMENT_SAVED_REFRESH_PENDING" });
  assert.equal(createCalls, 1);
  assert.equal(draft.value, "");
  assert.match(textOf(host), /تم الحفظ/);
  assert.doesNotMatch(textOf(host), /حاول مرة أخرى.*الحفظ/);

  const refreshed = await controller.retryRefresh();
  assert.equal(refreshed.ok, true);
  assert.equal(createCalls, 1);
  assert.match(textOf(host), /محفوظ/);
});

test("malformed comment rows are isolated and reported within the bounded page", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  const comments = {
    list: async () => list([
      row(),
      row({ comment_id: "bad", body: "malformed" }),
    ]),
    create: async () => ({ ok: false, code: "unused" }),
    update: async () => ({ ok: false, code: "unused" }),
    remove: async () => ({ ok: false, code: "unused" }),
  };
  const controller = createSocialCommentsController({ host, postId: POST_ID, comments, document: fakeDocument() });

  assert.deepEqual(await controller.load(), {
    ok: true,
    count: 1,
    empty: false,
    rejectedCount: 1,
    nextCursor: null,
  });
  assert.equal(host.dataset.socialCommentsMalformed, "1");
  assert.match(textOf(host), /تعذر عرض 1/);
  assert.match(textOf(host), /تعليق مؤكد/);
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

test("destroy cancels a queued comment read before the adapter is invoked", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  let queuedTask;
  let listCalls = 0;
  const controller = createSocialCommentsController({
    host,
    postId: POST_ID,
    document: fakeDocument(),
    scheduleRead(task) {
      queuedTask = task;
      return new Promise((resolve) => {
        queuedTask.resolve = resolve;
      });
    },
    comments: {
      list: async () => { listCalls += 1; return list([]); },
      create: async () => ({ ok: false }),
      update: async () => ({ ok: false }),
      remove: async () => ({ ok: false }),
    },
  });

  const pendingLoad = controller.load();
  controller.destroy();
  queuedTask.resolve(await queuedTask());

  assert.deepEqual(await pendingLoad, { ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
  assert.equal(listCalls, 0);
});

test("destroy during a confirmed mutation refresh does not resurrect controller DOM", async () => {
  const { createSocialCommentsController } = controllerApi();
  const host = fakeElement("section");
  let listCalls = 0;
  let resolveRefresh;
  const comments = {
    list: async () => {
      listCalls += 1;
      if (listCalls === 1) return list([row()]);
      return new Promise((resolve) => { resolveRefresh = resolve; });
    },
    create: async () => ({ ok: true, value: { ok: true } }),
    update: async () => ({ ok: false }),
    remove: async () => ({ ok: false }),
  };
  const controller = createSocialCommentsController({ host, postId: POST_ID, comments, document: fakeDocument() });
  await controller.load();

  const mutation = controller.create("محفوظ");
  await new Promise((resolve) => setImmediate(resolve));
  controller.destroy();
  resolveRefresh(list([row()]));

  assert.deepEqual(await mutation, { ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
  assert.equal(host.children.length, 0);
});

function mountedHost() {
  const host = fakeElement("section");
  host.setAttribute("data-social-post-id", POST_ID);
  const trigger = fakeElement("button");
  const article = {
    querySelector(selector) {
      return selector === "[data-social-comment-trigger]" ? trigger : null;
    },
  };
  host.closest = () => article;
  return { host, trigger };
}

test("mounting visible comment hosts performs no eager RPC and loads only on user action", async () => {
  const { mountCurrentSocialComments } = controllerApi();
  const mounted = mountedHost();
  let listCalls = 0;
  const comments = {
    list: async () => { listCalls += 1; return list([]); },
    create: async () => ({ ok: false }),
    update: async () => ({ ok: false }),
    remove: async () => ({ ok: false }),
  };
  const root = {
    document: {
      createElement: fakeElement,
      querySelectorAll: () => [mounted.host],
    },
    TIGERSocialRuntime: {
      createCurrentSocialRuntime: () => ({ comments }),
    },
  };

  assert.deepEqual(mountCurrentSocialComments(root), { mounted: 1 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(listCalls, 0);

  mounted.trigger.dispatch("click");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(listCalls, 1);
});

test("user-triggered comment loads are globally limited to two concurrent RPCs", async () => {
  const { mountCurrentSocialComments } = controllerApi();
  const mounted = [mountedHost(), mountedHost(), mountedHost()];
  let active = 0;
  let maximum = 0;
  let started = 0;
  const releases = [];
  const comments = {
    list: () => new Promise((resolve) => {
      started += 1;
      active += 1;
      maximum = Math.max(maximum, active);
      releases.push(() => {
        active -= 1;
        resolve(list([]));
      });
    }),
    create: async () => ({ ok: false }),
    update: async () => ({ ok: false }),
    remove: async () => ({ ok: false }),
  };
  const root = {
    document: {
      createElement: fakeElement,
      querySelectorAll: () => mounted.map((entry) => entry.host),
    },
    TIGERSocialRuntime: {
      createCurrentSocialRuntime: () => ({ comments }),
    },
  };

  mountCurrentSocialComments(root);
  for (const entry of mounted) entry.trigger.dispatch("click");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 2);
  assert.equal(maximum, 2);

  releases.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 3);
  assert.equal(maximum, 2);

  while (releases.length) releases.shift()();
  await new Promise((resolve) => setImmediate(resolve));
});

test("the two-read limit remains global across repeated feed mount cycles", async () => {
  const { mountCurrentSocialComments } = controllerApi();
  const firstMount = [mountedHost(), mountedHost()];
  const secondMount = [mountedHost()];
  let active = 0;
  let maximum = 0;
  let started = 0;
  const releases = [];
  const comments = {
    list: () => new Promise((resolve) => {
      started += 1;
      active += 1;
      maximum = Math.max(maximum, active);
      releases.push(() => {
        active -= 1;
        resolve(list([]));
      });
    }),
    create: async () => ({ ok: false }),
    update: async () => ({ ok: false }),
    remove: async () => ({ ok: false }),
  };
  const rootFor = (entries) => ({
    document: {
      createElement: fakeElement,
      querySelectorAll: () => entries.map((entry) => entry.host),
    },
    TIGERSocialRuntime: {
      createCurrentSocialRuntime: () => ({ comments }),
    },
  });

  mountCurrentSocialComments(rootFor(firstMount));
  mountCurrentSocialComments(rootFor(secondMount));
  for (const entry of [...firstMount, ...secondMount]) entry.trigger.dispatch("click");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(started, 2);
  assert.equal(maximum, 2);
  releases.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 3);
  assert.equal(maximum, 2);

  while (releases.length) releases.shift()();
  await new Promise((resolve) => setImmediate(resolve));
});

test("the shared scheduler also bounds user-triggered reply page reads", async () => {
  const { createSocialCommentsController } = controllerApi();
  const queue = [];
  let scheduledActive = 0;
  function pump() {
    while (scheduledActive < 2 && queue.length) {
      const entry = queue.shift();
      scheduledActive += 1;
      Promise.resolve().then(entry.task).then(entry.resolve, entry.reject).finally(() => {
        scheduledActive -= 1;
        pump();
      });
    }
  }
  const scheduleRead = (task) => new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    pump();
  });

  let started = 0;
  const releases = [];
  const comments = {
    list: () => new Promise((resolve) => {
      started += 1;
      releases.push(() => resolve(list([], { parentCommentId: COMMENT_ID })));
    }),
    create: async () => ({ ok: false }),
    update: async () => ({ ok: false }),
    remove: async () => ({ ok: false }),
  };
  const controllers = Array.from({ length: 3 }, () => createSocialCommentsController({
    host: fakeElement("section"),
    postId: POST_ID,
    comments,
    document: fakeDocument(),
    scheduleRead,
  }));

  const loads = controllers.map((controller) => controller.loadReplies(COMMENT_ID));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 2);
  releases.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 3);
  while (releases.length) releases.shift()();
  await Promise.all(loads);
});

test("comments controller source has no raw HTML or inline-handler construction", () => {
  const source = fs.readFileSync(controllerPath, "utf8");
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.doesNotMatch(source, /insertAdjacentHTML/);
  assert.doesNotMatch(source, /setAttribute\(\s*["']on[a-z]+["']/i);
  assert.match(source, /textContent/);
});
