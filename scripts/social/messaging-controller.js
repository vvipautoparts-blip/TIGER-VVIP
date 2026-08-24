(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialMessaging = api;
    if (root.document && typeof root.addEventListener === "function") {
      api.installCurrentMessagingController(root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MESSAGE_ACTION = Object.freeze({ name: "SOCIAL_MESSAGE_ACTION" });

  function frozen(value) {
    return Object.freeze(value);
  }

  function failure(code) {
    return frozen({ ok: false, code });
  }

  function stateNode(documentObject, state, message, retryAction) {
    const wrapper = documentObject.createElement("div");
    wrapper.className = "social-messaging-state";
    wrapper.setAttribute("data-social-messaging-state", state);
    wrapper.setAttribute("role", state === "error" ? "alert" : "status");

    const text = documentObject.createElement("p");
    text.textContent = message;
    wrapper.append(text);

    if (retryAction) {
      const retry = documentObject.createElement("button");
      retry.setAttribute("type", "button");
      retry.setAttribute("data-social-message-retry", retryAction);
      retry.textContent = "إعادة المحاولة";
      wrapper.append(retry);
    }

    return wrapper;
  }

  function avatarNode(documentObject, displayName, avatarUrl) {
    const avatar = documentObject.createElement("span");
    avatar.className = "social-messaging-avatar";
    avatar.setAttribute("aria-hidden", "true");
    if (avatarUrl) {
      const image = documentObject.createElement("img");
      image.setAttribute("src", avatarUrl);
      image.setAttribute("alt", "");
      image.setAttribute("loading", "lazy");
      avatar.append(image);
    } else {
      avatar.textContent = displayName.trim().slice(0, 1) || "V";
    }
    return avatar;
  }

  function conversationNode(documentObject, item, selected) {
    const button = documentObject.createElement("button");
    button.className = "social-conversation-row";
    button.setAttribute("type", "button");
    button.setAttribute("data-social-conversation-id", item.conversation_id);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    button.append(avatarNode(documentObject, item.peer_display_name, item.peer_avatar_url));

    const copy = documentObject.createElement("span");
    copy.className = "social-conversation-row__copy";
    const name = documentObject.createElement("strong");
    name.textContent = item.peer_display_name;
    const preview = documentObject.createElement("span");
    preview.textContent = item.last_message_body
      ? (item.last_message_viewer_is_sender ? "أنت: " : "") + item.last_message_body
      : "ابدأ المحادثة";
    copy.append(name, preview);
    button.append(copy);

    if (item.unread_count > 0) {
      const unread = documentObject.createElement("span");
      unread.className = "social-conversation-row__unread";
      unread.setAttribute("aria-label", `${item.unread_count} رسائل غير مقروءة`);
      unread.textContent = String(item.unread_count);
      button.append(unread);
    }

    return button;
  }

  function contactNode(documentObject, item) {
    const button = documentObject.createElement("button");
    button.className = "social-message-contact";
    button.setAttribute("type", "button");
    button.setAttribute("data-social-message-contact", item.peer_profile_id);
    button.append(avatarNode(documentObject, item.peer_display_name, item.peer_avatar_url));
    const name = documentObject.createElement("span");
    name.textContent = item.peer_display_name;
    button.append(name);
    return button;
  }

  function messageNode(documentObject, item) {
    const article = documentObject.createElement("article");
    article.className = item.viewer_is_sender
      ? "social-message social-message--mine"
      : "social-message";
    article.setAttribute("data-social-message-sequence", String(item.sequence));

    const sender = documentObject.createElement("strong");
    sender.textContent = item.viewer_is_sender ? "أنت" : item.sender_display_name;
    const body = documentObject.createElement("p");
    body.textContent = item.body;
    const state = documentObject.createElement("span");
    state.className = "social-message__state";
    state.textContent = item.viewer_is_sender ? "تم الإرسال" : "مقروءة";
    article.append(sender, body, state);
    return article;
  }

  function createMessagingController(options) {
    const documentObject = options && options.document;
    const shell = options && options.shell;
    const conversationHost = options && options.conversationHost;
    const contactHost = options && options.contactHost;
    const threadHost = options && options.threadHost;
    const threadHeading = options && options.threadHeading;
    const composer = options && options.composer;
    const input = options && options.input;
    const sendButton = options && options.sendButton;
    const status = options && options.status;
    const runtime = options && options.runtime;
    const auth = options && options.auth;
    const readModel = options && options.readModel;
    const idFactory = options && options.idFactory;

    for (const [value, code] of [
      [documentObject && documentObject.createElement, "SOCIAL_MESSAGES_DOCUMENT_REQUIRED"],
      [shell && shell.setAttribute, "SOCIAL_MESSAGES_SHELL_REQUIRED"],
      [conversationHost && conversationHost.replaceChildren, "SOCIAL_MESSAGES_LIST_REQUIRED"],
      [contactHost && contactHost.replaceChildren, "SOCIAL_MESSAGES_CONTACTS_REQUIRED"],
      [threadHost && threadHost.replaceChildren, "SOCIAL_MESSAGES_THREAD_REQUIRED"],
      [composer && composer.addEventListener, "SOCIAL_MESSAGES_COMPOSER_REQUIRED"],
    ]) {
      if (typeof value !== "function") throw new TypeError(code);
    }
    if (!threadHeading || !input || !sendButton || !status) {
      throw new TypeError("SOCIAL_MESSAGES_CONTROLS_REQUIRED");
    }
    if (!runtime || !runtime.messaging) throw new TypeError("SOCIAL_MESSAGES_RUNTIME_REQUIRED");
    if (!auth || typeof auth.requireAuth !== "function") throw new TypeError("SOCIAL_MESSAGES_AUTH_REQUIRED");
    if (!readModel
        || typeof readModel.normalizeConversationRows !== "function"
        || typeof readModel.normalizeContactRows !== "function"
        || typeof readModel.normalizeMessageRows !== "function") {
      throw new TypeError("SOCIAL_MESSAGES_READ_MODEL_REQUIRED");
    }
    if (typeof idFactory !== "function") throw new TypeError("SOCIAL_MESSAGES_ID_FACTORY_REQUIRED");

    const current = {
      conversations: frozen([]),
      contacts: frozen([]),
      selectedConversationId: null,
      pending: false,
    };

    function selectedConversation() {
      return current.conversations.find(
        (item) => item.conversation_id === current.selectedConversationId
      ) || null;
    }

    function setComposerEnabled(enabled) {
      input.disabled = !enabled;
      sendButton.disabled = !enabled || current.pending;
    }

    function renderConversations() {
      if (current.conversations.length === 0) {
        conversationHost.replaceChildren(stateNode(
          documentObject,
          "empty",
          "لا توجد محادثات حتى الآن. اختر صديقًا لبدء محادثة."
        ));
        return;
      }
      conversationHost.replaceChildren(...current.conversations.map((item) => (
        conversationNode(documentObject, item, item.conversation_id === current.selectedConversationId)
      )));
    }

    function renderContacts() {
      if (current.contacts.length === 0) {
        contactHost.replaceChildren(stateNode(
          documentObject,
          "empty",
          "لا يوجد أصدقاء متاحون لبدء محادثة جديدة."
        ));
        return;
      }
      contactHost.replaceChildren(...current.contacts.map((item) => contactNode(documentObject, item)));
    }

    function renderThreadFailure(message) {
      threadHost.replaceChildren(stateNode(documentObject, "error", message, "thread"));
      status.textContent = "";
      setComposerEnabled(false);
      return failure("SOCIAL_MESSAGES_THREAD_FAILED");
    }

    async function refreshMessages(conversation) {
      threadHost.replaceChildren(stateNode(documentObject, "loading", "جارٍ تحميل الرسائل…"));
      threadHost.setAttribute("aria-busy", "true");
      const afterSequence = Math.max(0, conversation.last_message_sequence - 50);

      let response;
      try {
        response = await runtime.messaging.list(conversation.conversation_id, {
          afterSequence,
          limit: 50,
        });
      } catch (_) {
        return renderThreadFailure("تعذر تحميل الرسائل. تحقق من الاتصال ثم أعد المحاولة.");
      }
      const messages = response && response.ok === true
        ? readModel.normalizeMessageRows(response.value)
        : null;
      if (!messages) return renderThreadFailure("تعذر تحميل الرسائل. تحقق من الاتصال ثم أعد المحاولة.");

      threadHost.setAttribute("aria-busy", "false");
      if (messages.length === 0) {
        threadHost.replaceChildren(stateNode(documentObject, "empty", "ابدأ المحادثة برسالتك الأولى."));
      } else {
        threadHost.replaceChildren(...messages.map((item) => messageNode(documentObject, item)));
      }

      const tail = messages.length > 0 ? messages[messages.length - 1].sequence : 0;
      if (tail > conversation.last_read_sequence) {
        try {
          await runtime.messaging.markRead(conversation.conversation_id, tail);
        } catch (_) {
          // The durable message history remains usable; list refresh will reconcile unread state.
        }
      }
      return frozen({ ok: true, count: messages.length, tail });
    }

    async function selectConversation(conversationId) {
      const conversation = current.conversations.find((item) => item.conversation_id === conversationId);
      if (!conversation) return failure("SOCIAL_MESSAGES_CONVERSATION_UNKNOWN");

      current.selectedConversationId = conversation.conversation_id;
      shell.setAttribute("data-social-messaging-view", "thread");
      threadHeading.textContent = conversation.peer_display_name;
      renderConversations();
      setComposerEnabled(conversation.can_message);
      status.textContent = conversation.can_message
        ? ""
        : "هذه المحادثة متاحة للقراءة فقط حاليًا.";
      return refreshMessages(conversation);
    }

    async function load() {
      conversationHost.replaceChildren(stateNode(documentObject, "loading", "جارٍ تحميل المحادثات…"));
      contactHost.replaceChildren(stateNode(documentObject, "loading", "جارٍ تحميل الأصدقاء المتاحين…"));
      conversationHost.setAttribute("aria-busy", "true");
      contactHost.setAttribute("aria-busy", "true");

      let conversationResponse;
      let contactResponse;
      try {
        [conversationResponse, contactResponse] = await Promise.all([
          runtime.messaging.listConversations({ limit: 50 }),
          runtime.messaging.listContacts({ limit: 50 }),
        ]);
      } catch (_) {
        conversationResponse = null;
        contactResponse = null;
      }

      const conversations = conversationResponse && conversationResponse.ok === true
        ? readModel.normalizeConversationRows(conversationResponse.value)
        : null;
      const contacts = contactResponse && contactResponse.ok === true
        ? readModel.normalizeContactRows(contactResponse.value)
        : null;
      if (!conversations || !contacts) {
        conversationHost.setAttribute("aria-busy", "false");
        contactHost.setAttribute("aria-busy", "false");
        conversationHost.replaceChildren(stateNode(
          documentObject,
          "error",
          "تعذر تحميل المحادثات. تحقق من الاتصال ثم أعد المحاولة.",
          "all"
        ));
        contactHost.replaceChildren();
        return failure("SOCIAL_MESSAGES_LOAD_FAILED");
      }

      current.conversations = conversations;
      current.contacts = contacts;
      conversationHost.setAttribute("aria-busy", "false");
      contactHost.setAttribute("aria-busy", "false");
      renderConversations();
      renderContacts();

      if (conversations.length > 0) {
        await selectConversation(conversations[0].conversation_id);
      } else {
        current.selectedConversationId = null;
        shell.setAttribute("data-social-messaging-view", "list");
        threadHeading.textContent = "اختر محادثة";
        threadHost.replaceChildren(stateNode(documentObject, "empty", "اختر محادثة أو ابدأ واحدة جديدة."));
        setComposerEnabled(false);
      }

      return frozen({ ok: true, conversations: conversations.length, contacts: contacts.length });
    }

    async function withAuth(operation) {
      let operationResult = null;
      let granted = false;
      try {
        granted = await auth.requireAuth(MESSAGE_ACTION, async function () {
          operationResult = await operation();
        });
      } catch (_) {
        return failure("SOCIAL_MESSAGE_ACTION_FAILED");
      }
      if (!granted) return failure("SOCIAL_MESSAGE_AUTH_REQUIRED");
      return operationResult && operationResult.ok === true
        ? operationResult
        : failure("SOCIAL_MESSAGE_ACTION_FAILED");
    }

    async function startConversation(peerProfileId) {
      const opened = await withAuth(function () {
        return runtime.messaging.open(peerProfileId);
      });
      if (!opened.ok) {
        status.textContent = "تعذر بدء المحادثة الآن.";
        return opened;
      }

      const conversationId = opened.value && opened.value.conversation_id;
      const loaded = await load();
      if (!loaded.ok) return loaded;
      if (conversationId) await selectConversation(conversationId);
      return frozen({ ok: true, code: "SOCIAL_CONVERSATION_OPENED" });
    }

    async function send() {
      const conversation = selectedConversation();
      const body = typeof input.value === "string" ? input.value.trim() : "";
      if (!conversation || !conversation.can_message || !body || body.length > 4000 || current.pending) {
        return failure("SOCIAL_MESSAGE_SEND_INVALID");
      }

      const clientMessageId = idFactory();
      current.pending = true;
      setComposerEnabled(true);
      status.textContent = "جارٍ الإرسال…";

      const sent = await withAuth(function () {
        return runtime.messaging.send(conversation.conversation_id, {
          clientMessageId,
          body,
        });
      });

      current.pending = false;
      if (!sent.ok) {
        setComposerEnabled(true);
        status.textContent = "تعذر إرسال الرسالة. بقيت المسودة ويمكنك إعادة المحاولة.";
        return sent;
      }

      input.value = "";
      status.textContent = "تم الإرسال.";
      await refreshMessages(conversation);
      setComposerEnabled(true);
      return frozen({ ok: true, code: "SOCIAL_MESSAGE_SENT" });
    }

    conversationHost.addEventListener("click", function (event) {
      const button = event && event.target && typeof event.target.closest === "function"
        ? event.target.closest("[data-social-conversation-id]")
        : null;
      if (!button) return;
      void selectConversation(button.getAttribute("data-social-conversation-id"));
    });

    contactHost.addEventListener("click", function (event) {
      const button = event && event.target && typeof event.target.closest === "function"
        ? event.target.closest("[data-social-message-contact]")
        : null;
      if (!button) return;
      void startConversation(button.getAttribute("data-social-message-contact"));
    });

    composer.addEventListener("submit", function (event) {
      if (event && typeof event.preventDefault === "function") event.preventDefault();
      void send();
    });

    shell.addEventListener("click", function (event) {
      const target = event && event.target;
      if (target && typeof target.closest === "function" && target.closest("[data-social-message-back]")) {
        shell.setAttribute("data-social-messaging-view", "list");
        return;
      }
      const retry = target && typeof target.closest === "function"
        ? target.closest("[data-social-message-retry]")
        : null;
      if (!retry) return;
      if (retry.getAttribute("data-social-message-retry") === "thread") {
        const conversation = selectedConversation();
        if (conversation) void refreshMessages(conversation);
        return;
      }
      void load();
    });

    return frozen({ load, selectConversation, startConversation, send });
  }

  function renderBootFailure(rootObject, message) {
    const documentObject = rootObject && rootObject.document;
    const host = documentObject && documentObject.querySelector("[data-social-conversation-list]");
    if (host) host.replaceChildren(stateNode(documentObject, "error", message, "all"));
    return failure("SOCIAL_MESSAGES_BOOT_FAILED");
  }

  async function mountCurrentMessagingController(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    if (!documentObject || typeof documentObject.querySelector !== "function") {
      return failure("SOCIAL_MESSAGES_DOCUMENT_UNAVAILABLE");
    }

    const runtimeApi = runtimeRoot.TIGERSocialRuntime;
    const readModel = runtimeRoot.TIGERMessagingReadModel;
    const auth = runtimeRoot.VVIP_AUTH;
    if (!runtimeApi || typeof runtimeApi.createCurrentSocialRuntime !== "function" || !readModel || !auth) {
      return renderBootFailure(runtimeRoot, "تعذر تجهيز الرسائل الآن.");
    }

    const nodes = {
      shell: documentObject.querySelector("[data-social-messages]"),
      conversationHost: documentObject.querySelector("[data-social-conversation-list]"),
      contactHost: documentObject.querySelector("[data-social-message-contacts]"),
      threadHost: documentObject.querySelector("[data-social-message-thread]"),
      threadHeading: documentObject.querySelector("[data-social-message-peer]"),
      composer: documentObject.querySelector("[data-social-message-composer]"),
      input: documentObject.querySelector("[data-social-message-draft]"),
      sendButton: documentObject.querySelector("[data-social-message-send]"),
      status: documentObject.querySelector("[data-social-message-status]"),
    };

    try {
      const controller = createMessagingController({
        document: documentObject,
        ...nodes,
        runtime: runtimeApi.createCurrentSocialRuntime(runtimeRoot),
        auth,
        readModel,
        idFactory: function () {
          const cryptoApi = runtimeRoot.crypto;
          if (!cryptoApi || typeof cryptoApi.randomUUID !== "function") {
            throw new Error("SOCIAL_MESSAGES_UUID_UNAVAILABLE");
          }
          return cryptoApi.randomUUID();
        },
      });
      runtimeRoot.TIGERSocialMessagingCurrent = controller;
      return controller.load();
    } catch (_) {
      return renderBootFailure(runtimeRoot, "تعذر تجهيز الرسائل الآن.");
    }
  }

  function installCurrentMessagingController(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    if (!documentObject || typeof runtimeRoot.addEventListener !== "function") {
      return frozen({ installed: false });
    }

    let started = false;
    const start = function () {
      if (started) return;
      started = true;
      const ready = runtimeRoot.VVIPRuntimeReady;
      if (ready && typeof ready.then === "function") {
        ready.then(function () {
          return mountCurrentMessagingController(runtimeRoot);
        }).catch(function () {
          return renderBootFailure(runtimeRoot, "سجّل الدخول للوصول إلى الرسائل.");
        });
        return;
      }
      if (runtimeRoot.VVIP_RUNTIME) {
        void mountCurrentMessagingController(runtimeRoot);
        return;
      }
      runtimeRoot.addEventListener("vvip:runtime-ready", function () {
        void mountCurrentMessagingController(runtimeRoot);
      }, { once: true });
      runtimeRoot.addEventListener("vvip:runtime-error", function () {
        renderBootFailure(runtimeRoot, "سجّل الدخول للوصول إلى الرسائل.");
      }, { once: true });
    };

    if (documentObject.readyState === "loading") {
      runtimeRoot.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
    return frozen({ installed: true, start });
  }

  return frozen({
    createMessagingController,
    mountCurrentMessagingController,
    installCurrentMessagingController,
  });
});
