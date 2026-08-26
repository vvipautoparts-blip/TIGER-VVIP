"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const authModule = require("../auth-clerk-index.js");
const readModel = require("../scripts/social/messaging-read-model.js");

const modulePath = "../scripts/social/messaging-controller.js";

function loadControllerModule() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function element(tagName) {
  const listeners = {};
  return {
    tagName: String(tagName || "div").toUpperCase(),
    className: "",
    textContent: "",
    value: "",
    hidden: false,
    disabled: false,
    children: [],
    attrs: {},
    dataset: {},
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    setAttribute(name, value) {
      this.attrs[name] = String(value);
      if (name.startsWith("data-")) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        this.dataset[key] = String(value);
      }
    },
    getAttribute(name) { return Object.hasOwn(this.attrs, name) ? this.attrs[name] : null; },
    removeAttribute(name) { delete this.attrs[name]; },
    addEventListener(name, handler) { listeners[name] = handler; },
    focus() { this.focused = true; },
    _listeners: listeners,
  };
}

function documentFixture() {
  return { createElement: (tagName) => element(tagName) };
}

function conversation(overrides) {
  return Object.assign({
    conversation_id: "22222222-2222-4222-8222-222222222222",
    peer_profile_id: "33333333-3333-4333-8333-333333333333",
    peer_display_name: "Tiger Member",
    peer_avatar_url: null,
    peer_available: true,
    can_message: true,
    last_message_sequence: 7,
    last_read_sequence: 5,
    unread_count: 2,
    last_message_body: "آخر رسالة",
    last_message_viewer_is_sender: false,
    last_message_at: "2026-08-24T08:00:00.000Z",
    activity_at: "2026-08-24T08:00:00.000Z",
  }, overrides || {});
}

function contact() {
  return {
    peer_profile_id: "33333333-3333-4333-8333-333333333333",
    peer_display_name: "Tiger Member",
    peer_avatar_url: null,
  };
}

function message(overrides) {
  return Object.assign({
    message_id: "41111111-1111-4111-8111-111111111111",
    conversation_id: "22222222-2222-4222-8222-222222222222",
    sequence: 7,
    sender_profile_id: "33333333-3333-4333-8333-333333333333",
    sender_display_name: "Tiger Member",
    sender_avatar_url: null,
    sender_available: true,
    viewer_is_sender: false,
    body: "رسالة موثقة",
    created_at: "2026-08-24T08:00:00.000Z",
  }, overrides || {});
}

function fixture(runtimeOverrides) {
  const calls = [];
  const state = { messages: [message()] };
  const runtime = {
    messaging: {
      listConversations: async () => ({ ok: true, value: [conversation()] }),
      listContacts: async () => ({ ok: true, value: [contact()] }),
      list: async (conversationId, options) => {
        calls.push(["list", conversationId, options]);
        return { ok: true, value: state.messages };
      },
      markRead: async (conversationId, sequence) => {
        calls.push(["markRead", conversationId, sequence]);
        return { ok: true, value: { conversation_id: conversationId, last_read_sequence: sequence } };
      },
      open: async (profileId) => {
        calls.push(["open", profileId]);
        return { ok: true, value: { conversation_id: conversation().conversation_id } };
      },
      send: async (conversationId, input) => {
        calls.push(["send", conversationId, input]);
        state.messages = [message(), message({
          message_id: input.clientMessageId,
          sequence: 8,
          viewer_is_sender: true,
          body: input.body,
        })];
        return { ok: true, value: { message_id: input.clientMessageId, sequence: 8 } };
      },
      ...(runtimeOverrides || {}),
    },
  };

  const nodes = {
    shell: element("section"),
    conversationHost: element("div"),
    contactHost: element("div"),
    threadHost: element("div"),
    threadHeading: element("strong"),
    composer: element("form"),
    input: element("textarea"),
    sendButton: element("button"),
    status: element("p"),
  };
  const authCalls = [];
  const auth = {
    async requireAuth(descriptor, resume) {
      authCalls.push(descriptor);
      await resume();
      return true;
    },
  };

  return { calls, state, runtime, nodes, auth, authCalls };
}

test("Messages controller loads safe conversations, contacts, recent history, and advances read state", async () => {
  const { createMessagingController } = loadControllerModule();
  const setup = fixture();
  const controller = createMessagingController({
    ...setup.nodes,
    document: documentFixture(),
    runtime: setup.runtime,
    auth: setup.auth,
    readModel,
    idFactory: () => "49999999-9999-4999-8999-999999999999",
  });

  const result = await controller.load();

  assert.deepEqual(result, { ok: true, conversations: 1, contacts: 1 });
  assert.match(JSON.stringify(setup.nodes.conversationHost), /Tiger Member/);
  assert.match(JSON.stringify(setup.nodes.conversationHost), /2/);
  assert.match(JSON.stringify(setup.nodes.contactHost), /Tiger Member/);
  assert.match(JSON.stringify(setup.nodes.threadHost), /رسالة موثقة/);
  assert.equal(setup.nodes.threadHeading.textContent, "Tiger Member");
  assert.equal(setup.nodes.shell.dataset.socialMessagingView, "thread");
  assert.deepEqual(setup.calls, [
    ["list", conversation().conversation_id, { afterSequence: 0, limit: 50 }],
    ["markRead", conversation().conversation_id, 7],
  ]);
});

test("Messages controller shows a sent message only after durable confirmation and refresh", async () => {
  const { createMessagingController } = loadControllerModule();
  const setup = fixture();
  const controller = createMessagingController({
    ...setup.nodes,
    document: documentFixture(),
    runtime: setup.runtime,
    auth: setup.auth,
    readModel,
    idFactory: () => "49999999-9999-4999-8999-999999999999",
  });
  await controller.load();
  setup.calls.length = 0;
  setup.nodes.input.value = "  رسالة جديدة  ";

  const result = await controller.send();

  assert.deepEqual(result, { ok: true, code: "SOCIAL_MESSAGE_SENT" });
  assert.equal(setup.nodes.input.value, "");
  assert.match(JSON.stringify(setup.nodes.threadHost), /رسالة جديدة/);
  assert.deepEqual(setup.authCalls, [{ name: "SOCIAL_MESSAGE_ACTION" }]);
  assert.equal(setup.calls[0][0], "send");
  assert.deepEqual(setup.calls[0][2], {
    clientMessageId: "49999999-9999-4999-8999-999999999999",
    body: "رسالة جديدة",
  });
  assert.equal(setup.calls[1][0], "list");
});

test("Messages controller preserves the draft and exposes retry after a failed send", async () => {
  const setup = fixture({
    send: async () => ({ ok: false, code: "SOCIAL_PERSISTENCE_FAILED" }),
  });
  const { createMessagingController } = loadControllerModule();
  const controller = createMessagingController({
    ...setup.nodes,
    document: documentFixture(),
    runtime: setup.runtime,
    auth: setup.auth,
    readModel,
    idFactory: () => "49999999-9999-4999-8999-999999999999",
  });
  await controller.load();
  setup.nodes.input.value = "مسودة محفوظة";

  const result = await controller.send();

  assert.equal(result.ok, false);
  assert.equal(setup.nodes.input.value, "مسودة محفوظة");
  assert.equal(setup.nodes.sendButton.disabled, false);
  assert.match(setup.nodes.status.textContent, /تعذر إرسال/);
});

test("Messages controller starts a direct conversation from a safe contact profile UUID", async () => {
  const setup = fixture();
  const { createMessagingController } = loadControllerModule();
  const controller = createMessagingController({
    ...setup.nodes,
    document: documentFixture(),
    runtime: setup.runtime,
    auth: setup.auth,
    readModel,
    idFactory: () => "49999999-9999-4999-8999-999999999999",
  });

  const result = await controller.startConversation(contact().peer_profile_id);

  assert.equal(result.ok, true);
  assert.deepEqual(setup.authCalls, [{ name: "SOCIAL_MESSAGE_ACTION" }]);
  assert.deepEqual(setup.calls[0], ["open", contact().peer_profile_id]);
  assert.doesNotMatch(JSON.stringify(setup.calls), /subject/i);
});

test("Messaging auth intent is bounded and carries no message content or participant identity", () => {
  assert.deepEqual(
    authModule.normalizeIntentDescriptor({ name: "SOCIAL_MESSAGE_ACTION" }),
    { name: "SOCIAL_MESSAGE_ACTION" }
  );
  assert.throws(
    () => authModule.normalizeIntentDescriptor({ name: "SOCIAL_MESSAGE_ACTION", body: "private" }),
    { code: "AUTH_INTENT_INVALID" }
  );
});

test("authoritative HTML and release artifact publish the real Messages controller without placeholder copy", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("styles/tiger-social/core-shell.css", "utf8");
  const builder = fs.readFileSync("tools/vvip_public_release.py", "utf8");
  const workflow = fs.readFileSync(".github/workflows/tiger-social-db-rehearsal.yml", "utf8");

  assert.match(html, /data-social-messages/);
  assert.match(html, /data-social-conversation-list/);
  assert.match(html, /data-social-message-thread/);
  assert.match(html, /data-social-message-composer/);
  assert.match(html, /scripts\/social\/messaging-read-model\.js/);
  assert.match(html, /scripts\/social\/messaging-controller\.js/);
  assert.doesNotMatch(html, /المحادثات ستظهر هنا بعد ربط/);
  assert.match(css, /\.social-messaging__layout/);
  assert.match(css, /data-social-messaging-view="thread"/);
  assert.match(builder, /scripts\/social\/messaging-read-model\.js/);
  assert.match(builder, /scripts\/social\/messaging-controller\.js/);
  assert.match(workflow, /scripts\/social\/messaging-controller\.js/);
  assert.match(workflow, /node --test tests\/tiger-p0-messaging-surface\.test\.cjs/);
});
