(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialFriends = api;
    if (root.document && typeof root.addEventListener === "function") {
      api.installCurrentFriendsController(root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ACTIONS = new Set([
    "accept_request",
    "decline_request",
    "cancel_request",
    "unfriend",
  ]);

  function frozen(value) {
    return Object.freeze(value);
  }

  function failure(code) {
    return frozen({ ok: false, code });
  }

  function validUserSubject(value) {
    return typeof value === "string" && /^user_[A-Za-z0-9._:-]{1,122}$/.test(value);
  }

  function validResourceId(value) {
    return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
  }

  function validTimestamp(value) {
    return typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
  }

  function relationshipLabel(subject) {
    let hash = 2166136261;
    for (let index = 0; index < subject.length; index += 1) {
      hash ^= subject.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return "عضو VVIP TIGER • " + (hash >>> 0).toString(16).slice(-4).toUpperCase().padStart(4, "0");
  }

  function normalizeRelationship(input, actorSubject) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return failure("SOCIAL_FRIENDS_INVALID_ROW");
    }
    if (!validUserSubject(actorSubject)) {
      return failure("SOCIAL_FRIENDS_INVALID_ACTOR");
    }
    if (!validResourceId(input.relationship_id)) {
      return failure("SOCIAL_FRIENDS_INVALID_RELATIONSHIP_ID");
    }
    if (!validUserSubject(input.requester_subject) || !validUserSubject(input.addressee_subject)) {
      return failure("SOCIAL_FRIENDS_INVALID_SUBJECT");
    }
    if (input.requester_subject === input.addressee_subject) {
      return failure("SOCIAL_FRIENDS_INVALID_SUBJECT");
    }
    if (input.relationship_state !== "pending" && input.relationship_state !== "friends") {
      return failure("SOCIAL_FRIENDS_INVALID_STATE");
    }
    if (!validTimestamp(input.created_at) || !validTimestamp(input.updated_at)) {
      return failure("SOCIAL_FRIENDS_INVALID_TIMESTAMP");
    }

    const actorIsRequester = actorSubject === input.requester_subject;
    const actorIsAddressee = actorSubject === input.addressee_subject;
    if (!actorIsRequester && !actorIsAddressee) {
      return failure("SOCIAL_FRIENDS_UNRELATED_ACTOR");
    }

    const counterpartSubject = actorIsRequester ? input.addressee_subject : input.requester_subject;
    let state = "friends";
    if (input.relationship_state === "pending") {
      state = actorIsRequester ? "request_sent" : "request_received";
    }

    return frozen({
      ok: true,
      value: frozen({
        id: input.relationship_id,
        state,
        counterpartLabel: relationshipLabel(counterpartSubject),
        createdAt: input.created_at,
        updatedAt: input.updated_at,
      }),
    });
  }

  function statusNode(documentObject, state, message) {
    const node = documentObject.createElement("p");
    node.className = "social-friends-state";
    node.setAttribute("data-social-friends-state", state);
    node.setAttribute("role", "status");
    node.textContent = message;
    return node;
  }

  function actionButton(documentObject, label, action, relationshipId) {
    const button = documentObject.createElement("button");
    button.className = "social-friend-action";
    button.setAttribute("type", "button");
    button.setAttribute("data-social-friend-action", action);
    button.setAttribute("data-social-relationship-id", relationshipId);
    button.textContent = label;
    return button;
  }

  function relationshipNode(documentObject, item) {
    const article = documentObject.createElement("article");
    article.className = "social-friend-card";
    article.setAttribute("data-social-friendship-state", item.state);

    const identity = documentObject.createElement("div");
    identity.className = "social-friend-card__identity";

    const avatar = documentObject.createElement("span");
    avatar.className = "social-friend-card__avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "V";

    const text = documentObject.createElement("div");
    const name = documentObject.createElement("strong");
    name.textContent = item.counterpartLabel;
    const state = documentObject.createElement("span");
    state.className = "social-friend-card__state";

    if (item.state === "request_received") state.textContent = "طلب صداقة وارد";
    else if (item.state === "request_sent") state.textContent = "طلب صداقة مُرسل";
    else state.textContent = "صديق";

    text.append(name, state);
    identity.append(avatar, text);

    const actions = documentObject.createElement("div");
    actions.className = "social-friend-card__actions";
    if (item.state === "request_received") {
      actions.append(
        actionButton(documentObject, "قبول", "accept_request", item.id),
        actionButton(documentObject, "رفض", "decline_request", item.id)
      );
    } else if (item.state === "request_sent") {
      actions.append(actionButton(documentObject, "إلغاء الطلب", "cancel_request", item.id));
    } else {
      actions.append(actionButton(documentObject, "إلغاء الصداقة", "unfriend", item.id));
    }

    article.append(identity, actions);
    return article;
  }

  function createFriendsController(options) {
    const host = options && options.host;
    const documentObject = options && options.document;
    const actorSubject = options && options.actorSubject;
    const runtime = options && options.runtime;
    const auth = options && options.auth;

    if (!host || typeof host.replaceChildren !== "function") {
      throw new TypeError("SOCIAL_FRIENDS_HOST_REQUIRED");
    }
    if (!documentObject || typeof documentObject.createElement !== "function") {
      throw new TypeError("SOCIAL_FRIENDS_DOCUMENT_REQUIRED");
    }
    if (!validUserSubject(actorSubject)) {
      throw new TypeError("SOCIAL_FRIENDS_ACTOR_REQUIRED");
    }
    if (!runtime || !runtime.relationships) {
      throw new TypeError("SOCIAL_FRIENDS_RUNTIME_REQUIRED");
    }
    if (!auth || typeof auth.requireAuth !== "function") {
      throw new TypeError("SOCIAL_FRIENDS_AUTH_REQUIRED");
    }

    function renderFailure() {
      host.setAttribute("aria-busy", "false");
      host.replaceChildren(statusNode(
        documentObject,
        "error",
        "تعذر تحميل الأصدقاء الآن. حاول مرة أخرى لاحقًا."
      ));
      return failure("SOCIAL_FRIENDS_RENDER_FAILED");
    }

    async function load() {
      host.setAttribute("aria-busy", "true");
      host.replaceChildren(statusNode(documentObject, "loading", "جارٍ تحميل الأصدقاء…"));

      let response;
      try {
        response = await runtime.relationships.readMine();
      } catch (_) {
        return renderFailure();
      }
      const rows = response && response.ok === true
        ? (Array.isArray(response.value) ? response.value : response.value && response.value.items)
        : null;
      if (!Array.isArray(rows)) {
        return renderFailure();
      }

      const normalized = [];
      for (const relationship of rows) {
        const result = normalizeRelationship(relationship, actorSubject);
        if (!result.ok) return renderFailure();
        normalized.push(result.value);
      }

      host.setAttribute("aria-busy", "false");
      if (normalized.length === 0) {
        host.replaceChildren(statusNode(documentObject, "empty", "لا توجد طلبات صداقة أو صداقات حتى الآن."));
        return frozen({ ok: true, count: 0, empty: true });
      }

      const order = Object.freeze({ request_received: 0, friends: 1, request_sent: 2 });
      normalized.sort((left, right) => {
        const stateOrder = order[left.state] - order[right.state];
        if (stateOrder !== 0) return stateOrder;
        return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      });

      host.replaceChildren(...normalized.map((item) => relationshipNode(documentObject, item)));
      const result = {
        ok: true,
        count: normalized.length,
        empty: false,
      };
      if (!Array.isArray(response.value)) result.nextCursor = response.value.next_cursor;
      return frozen(result);
    }

    async function withAuth(operation) {
      let operationResult = null;
      let granted;
      try {
        granted = await auth.requireAuth(
          { name: "SOCIAL_FRIEND_ACTION" },
          async function () {
            operationResult = await operation();
          }
        );
      } catch (_) {
        return failure("SOCIAL_FRIEND_ACTION_FAILED");
      }

      if (!granted) return failure("SOCIAL_FRIEND_AUTH_REQUIRED");
      if (!operationResult || operationResult.ok !== true) {
        return failure("SOCIAL_FRIEND_ACTION_FAILED");
      }

      await load();
      return frozen({ ok: true, code: "SOCIAL_FRIEND_ACTION_APPLIED" });
    }

    async function act(action, relationshipId) {
      if (!ACTIONS.has(action) || !validResourceId(relationshipId)) {
        return failure("SOCIAL_FRIEND_INVALID_ACTION");
      }

      if (action === "accept_request") {
        return withAuth(function () { return runtime.relationships.accept(relationshipId); });
      }
      return withAuth(function () { return runtime.relationships.remove(relationshipId); });
    }

    async function send(addresseeSubject) {
      if (!validUserSubject(addresseeSubject) || addresseeSubject === actorSubject) {
        return failure("SOCIAL_FRIEND_INVALID_ADDRESSEE");
      }
      return withAuth(function () { return runtime.relationships.send(addresseeSubject); });
    }

    if (typeof host.addEventListener === "function") {
      host.addEventListener("click", function (event) {
        const target = event && event.target;
        const button = target && typeof target.closest === "function"
          ? target.closest("[data-social-friend-action]")
          : null;
        if (!button) return;
        if (event && typeof event.preventDefault === "function") event.preventDefault();
        void act(
          button.getAttribute("data-social-friend-action"),
          button.getAttribute("data-social-relationship-id")
        );
      });
    }

    return frozen({ load, act, send });
  }

  function renderAuthRequired(rootObject) {
    const documentObject = rootObject && rootObject.document;
    const host = documentObject && typeof documentObject.querySelector === "function"
      ? documentObject.querySelector("[data-social-friends-items]")
      : null;
    if (!host) return failure("SOCIAL_FRIENDS_HOST_UNAVAILABLE");

    const wrapper = documentObject.createElement("div");
    wrapper.className = "social-friends-auth";
    const message = documentObject.createElement("p");
    message.textContent = "سجّل الدخول لعرض الأصدقاء وطلبات الصداقة.";
    const button = documentObject.createElement("button");
    button.className = "social-friend-action";
    button.setAttribute("type", "button");
    button.setAttribute("data-social-friends-auth", "true");
    button.textContent = "تسجيل الدخول";
    wrapper.append(message, button);
    host.setAttribute("aria-busy", "false");
    host.replaceChildren(wrapper);

    if (typeof button.addEventListener === "function" && rootObject.VVIP_AUTH) {
      button.addEventListener("click", function () {
        void rootObject.VVIP_AUTH.requireAuth(
          { name: "OPEN_SOCIAL_FRIENDS" },
          function () { return mountCurrentFriendsController(rootObject); }
        );
      });
    }

    return failure("SOCIAL_FRIENDS_AUTH_REQUIRED");
  }

  async function mountCurrentFriendsController(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    const host = documentObject && typeof documentObject.querySelector === "function"
      ? documentObject.querySelector("[data-social-friends-items]")
      : null;
    if (!host) return failure("SOCIAL_FRIENDS_HOST_UNAVAILABLE");

    const clerk = runtimeRoot.VVIP_RUNTIME && runtimeRoot.VVIP_RUNTIME.clerk;
    const actorSubject = clerk && clerk.user && clerk.user.id;
    if (!validUserSubject(actorSubject)) return renderAuthRequired(runtimeRoot);

    const runtimeApi = runtimeRoot.TIGERSocialRuntime;
    const auth = runtimeRoot.VVIP_AUTH;
    if (!runtimeApi || typeof runtimeApi.createCurrentSocialRuntime !== "function" || !auth) {
      host.replaceChildren(statusNode(documentObject, "error", "تعذر تجهيز الأصدقاء الآن."));
      return failure("SOCIAL_FRIENDS_BOOT_FAILED");
    }

    const controller = createFriendsController({
      host,
      document: documentObject,
      actorSubject,
      runtime: runtimeApi.createCurrentSocialRuntime(runtimeRoot),
      auth,
    });
    runtimeRoot.TIGERSocialFriendsCurrent = controller;
    return controller.load();
  }

  function installCurrentFriendsController(rootObject) {
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
        ready
          .then(function () { return mountCurrentFriendsController(runtimeRoot); })
          .catch(function () { return renderAuthRequired(runtimeRoot); });
        return;
      }
      if (runtimeRoot.VVIP_RUNTIME) {
        void mountCurrentFriendsController(runtimeRoot);
        return;
      }
      runtimeRoot.addEventListener("vvip:runtime-ready", function () {
        void mountCurrentFriendsController(runtimeRoot);
      }, { once: true });
      runtimeRoot.addEventListener("vvip:runtime-error", function () {
        renderAuthRequired(runtimeRoot);
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
    normalizeRelationship,
    createFriendsController,
    mountCurrentFriendsController,
    installCurrentFriendsController,
  });
});
