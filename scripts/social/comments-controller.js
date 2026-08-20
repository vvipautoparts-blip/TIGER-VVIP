(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialComments = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function frozen(value) {
    return Object.freeze(value);
  }

  const COMMENT_ACTION_ATTRIBUTES = frozen({
    reply: "data-social-comment-reply",
    edit: "data-social-comment-edit",
    remove: "data-social-comment-remove",
  });
  const DEFAULT_RATE_LIMIT_MS = 5_000;
  const MAX_RATE_LIMIT_MS = 60_000;

  function validId(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function validBody(value) {
    return typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 2000;
  }

  function normalizeRow(value, postId) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (!validId(value.comment_id) || value.post_id !== postId) return null;
    if (value.parent_comment_id !== null && !validId(value.parent_comment_id)) return null;
    if (!validBody(value.body)) return null;
    if (typeof value.created_at !== "string" || typeof value.updated_at !== "string") return null;
    if (typeof value.viewer_can_edit !== "boolean") return null;

    return frozen({
      commentId: value.comment_id,
      postId: value.post_id,
      parentCommentId: value.parent_comment_id,
      body: value.body,
      createdAt: value.created_at,
      updatedAt: value.updated_at,
      viewerCanEdit: value.viewer_can_edit,
    });
  }

  function normalizeSnapshot(result, postId) {
    const value = result && result.ok === true ? result.value : null;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.ok !== true || value.post_id !== postId || !Array.isArray(value.items)) return null;
    if (!Number.isInteger(value.total) || value.total !== value.items.length || value.total < 0) return null;

    const items = [];
    const ids = new Set();
    for (const rawItem of value.items) {
      const item = normalizeRow(rawItem, postId);
      if (!item || ids.has(item.commentId)) return null;
      ids.add(item.commentId);
      items.push(item);
    }

    const byId = new Map(items.map((item) => [item.commentId, item]));
    for (const item of items) {
      if (item.parentCommentId === null) continue;
      const parent = byId.get(item.parentCommentId);
      if (!parent || parent.parentCommentId !== null) return null;
    }

    return frozen({ total: items.length, items: frozen(items) });
  }

  function statusNode(documentObject, state, message) {
    const node = documentObject.createElement("p");
    node.className = "social-comments__status";
    node.setAttribute("data-social-comments-state", state);
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    node.textContent = message;
    return node;
  }

  function actionButton(documentObject, name, commentId, label) {
    const button = documentObject.createElement("button");
    button.type = "button";
    button.className = "social-comment__action social-comment__action--" + name;
    button.setAttribute(COMMENT_ACTION_ATTRIBUTES[name], commentId);
    button.textContent = label;
    return button;
  }

  function createSocialCommentsController(options) {
    const host = options && options.host;
    const postId = options && options.postId;
    const comments = options && options.comments;
    const documentObject = options && options.document;
    const now = options && typeof options.now === "function" ? options.now : Date.now;

    if (!host || typeof host.replaceChildren !== "function") {
      throw new TypeError("SOCIAL_COMMENTS_HOST_REQUIRED");
    }
    if (!validId(postId)) {
      throw new TypeError("SOCIAL_COMMENTS_POST_ID_REQUIRED");
    }
    if (!comments
      || typeof comments.list !== "function"
      || typeof comments.create !== "function"
      || typeof comments.update !== "function"
      || typeof comments.remove !== "function") {
      throw new TypeError("SOCIAL_COMMENTS_ADAPTER_REQUIRED");
    }
    if (!documentObject || typeof documentObject.createElement !== "function") {
      throw new TypeError("SOCIAL_COMMENTS_DOCUMENT_REQUIRED");
    }

    let hasConfirmed = false;
    let pending = false;
    let destroyed = false;
    let draft = null;
    let submit = null;
    let state = null;
    let mode = frozen({ type: "create", commentId: null });
    let mutationCooldownUntil = 0;

    function setState(nextState, message) {
      if (!state) return;
      state.setAttribute("data-social-comments-state", nextState);
      state.textContent = message;
    }

    function resetMode() {
      mode = frozen({ type: "create", commentId: null });
      if (draft) draft.value = "";
      if (submit) submit.textContent = "نشر التعليق";
      setState("ready", "");
    }

    function chooseReply(commentId) {
      mode = frozen({ type: "reply", commentId });
      if (submit) submit.textContent = "نشر الرد";
      setState("reply", "أنت ترد على تعليق.");
      if (draft && typeof draft.focus === "function") draft.focus();
    }

    function chooseEdit(item) {
      mode = frozen({ type: "edit", commentId: item.commentId });
      if (draft) draft.value = item.body;
      if (submit) submit.textContent = "حفظ التعديل";
      setState("edit", "أنت تعدّل تعليقك.");
      if (draft && typeof draft.focus === "function") draft.focus();
    }

    function commentNode(item, repliesByParent) {
      const article = documentObject.createElement("article");
      article.className = item.parentCommentId
        ? "social-comment social-comment--reply"
        : "social-comment";
      article.setAttribute("data-social-comment-id", item.commentId);

      const meta = documentObject.createElement("div");
      meta.className = "social-comment__meta";

      const author = documentObject.createElement("strong");
      author.className = "social-comment__author";
      author.textContent = "عضو VVIP TIGER";

      const time = documentObject.createElement("time");
      time.className = "social-comment__time";
      time.setAttribute("datetime", item.createdAt);
      time.textContent = item.updatedAt !== item.createdAt ? "تم التعديل" : item.createdAt;
      meta.append(author, time);

      const body = documentObject.createElement("p");
      body.className = "social-comment__body";
      body.textContent = item.body;

      const actions = documentObject.createElement("div");
      actions.className = "social-comment__actions";

      if (item.parentCommentId === null) {
        const reply = actionButton(documentObject, "reply", item.commentId, "رد");
        reply.addEventListener("click", function () { chooseReply(item.commentId); });
        actions.append(reply);
      }

      if (item.viewerCanEdit) {
        const edit = actionButton(documentObject, "edit", item.commentId, "تعديل");
        edit.addEventListener("click", function () { chooseEdit(item); });

        const removeButton = actionButton(documentObject, "remove", item.commentId, "حذف");
        removeButton.addEventListener("click", function () { void remove(item.commentId, removeButton); });
        actions.append(edit, removeButton);
      }

      article.append(meta, body, actions);

      const replies = repliesByParent.get(item.commentId) || [];
      if (replies.length > 0) {
        const replyList = documentObject.createElement("div");
        replyList.className = "social-comment__replies";
        replyList.setAttribute("data-social-comment-replies", item.commentId);
        for (const reply of replies) replyList.append(commentNode(reply, new Map()));
        article.append(replyList);
      }

      return article;
    }

    function composerNode() {
      const form = documentObject.createElement("form");
      form.className = "social-comments__composer";
      form.setAttribute("data-social-comment-composer", "");

      const label = documentObject.createElement("label");
      label.className = "social-comments__label";
      label.textContent = "أضف تعليقًا";

      draft = documentObject.createElement("textarea");
      draft.className = "social-comments__draft";
      draft.setAttribute("data-social-comment-draft", "");
      draft.setAttribute("maxlength", "2000");
      draft.setAttribute("rows", "2");
      draft.setAttribute("placeholder", "اكتب تعليقًا…");
      label.append(draft);

      const controls = documentObject.createElement("div");
      controls.className = "social-comments__composer-controls";

      state = statusNode(documentObject, "ready", "");

      const cancel = documentObject.createElement("button");
      cancel.type = "button";
      cancel.className = "social-comments__cancel";
      cancel.setAttribute("data-social-comment-cancel", "");
      cancel.textContent = "إلغاء";
      cancel.addEventListener("click", resetMode);

      submit = documentObject.createElement("button");
      submit.type = "submit";
      submit.className = "social-comments__submit";
      submit.setAttribute("data-social-comment-submit", "");
      submit.textContent = "نشر التعليق";

      controls.append(state, cancel, submit);
      form.append(label, controls);
      form.addEventListener("submit", function (event) {
        if (event && typeof event.preventDefault === "function") event.preventDefault();
        const body = draft ? draft.value : "";
        if (mode.type === "reply") {
          void reply(mode.commentId, body);
          return;
        }
        if (mode.type === "edit") {
          void update(mode.commentId, body);
          return;
        }
        void create(body);
      });
      return form;
    }

    function render(snapshot) {
      hasConfirmed = true;
      host.setAttribute("aria-busy", "false");
      host.dataset.socialCommentsCount = String(snapshot.total);

      const list = documentObject.createElement("div");
      list.className = "social-comments__list";
      list.setAttribute("data-social-comments-list", "");

      const repliesByParent = new Map();
      const topLevel = [];
      for (const item of snapshot.items) {
        if (item.parentCommentId === null) {
          topLevel.push(item);
          continue;
        }
        const replies = repliesByParent.get(item.parentCommentId) || [];
        replies.push(item);
        repliesByParent.set(item.parentCommentId, replies);
      }

      if (topLevel.length === 0) {
        list.append(statusNode(documentObject, "empty", "لا توجد تعليقات بعد. كن أول من يعلّق."));
      } else {
        for (const item of topLevel) list.append(commentNode(item, repliesByParent));
      }

      host.replaceChildren(list, composerNode());
      return frozen({ ok: true, count: snapshot.total, empty: snapshot.total === 0 });
    }

    function renderLoadFailure() {
      host.setAttribute("aria-busy", "false");
      if (hasConfirmed) {
        setState("error", "تعذر تحديث التعليقات الآن.");
      } else {
        host.replaceChildren(statusNode(documentObject, "error", "تعذر تحميل التعليقات الآن."));
      }
      return frozen({ ok: false, code: "SOCIAL_COMMENTS_FAILED" });
    }

    async function load() {
      if (destroyed) return frozen({ ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
      host.setAttribute("aria-busy", "true");
      if (!hasConfirmed) {
        host.replaceChildren(statusNode(documentObject, "loading", "جارٍ تحميل التعليقات…"));
      } else {
        setState("loading", "جارٍ تحديث التعليقات…");
      }

      try {
        const result = await comments.list(postId);
        if (destroyed) return frozen({ ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
        const snapshot = normalizeSnapshot(result, postId);
        if (!snapshot) return renderLoadFailure();
        return render(snapshot);
      } catch (_) {
        return renderLoadFailure();
      }
    }

    function renderMutationFailure() {
      host.setAttribute("aria-busy", "false");
      setState("error", "تعذر حفظ التغيير الآن. حاول مرة أخرى.");
      return frozen({ ok: false, code: "SOCIAL_COMMENTS_FAILED" });
    }

    function rateLimitDelay(result) {
      if (!result || result.code !== "SOCIAL_RATE_LIMITED") return null;
      if (!Number.isSafeInteger(result.retryAfterMs) || result.retryAfterMs < 1) {
        return DEFAULT_RATE_LIMIT_MS;
      }
      return Math.min(result.retryAfterMs, MAX_RATE_LIMIT_MS);
    }

    function renderRateLimit(retryAfterMs) {
      host.setAttribute("aria-busy", "false");
      setState("rate-limited", "تم إيقاف المحاولات مؤقتًا. حاول لاحقًا.");
      return frozen({ ok: false, code: "SOCIAL_COMMENTS_RATE_LIMITED", retryAfterMs });
    }

    async function applyMutation(operation, affectedControl) {
      if (destroyed) return frozen({ ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
      if (pending) return frozen({ ok: false, code: "SOCIAL_COMMENT_PENDING" });
      const cooldownRemaining = Math.max(0, mutationCooldownUntil - now());
      if (cooldownRemaining > 0) return renderRateLimit(cooldownRemaining);
      mutationCooldownUntil = 0;
      pending = true;
      host.setAttribute("aria-busy", "true");
      const control = affectedControl || submit;
      if (control) control.disabled = true;
      setState("pending", "جارٍ الحفظ…");

      try {
        const result = await operation();
        if (destroyed) return frozen({ ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
        if (!result || result.ok !== true) {
          const delay = rateLimitDelay(result);
          if (delay !== null) {
            mutationCooldownUntil = now() + delay;
            return renderRateLimit(delay);
          }
          return renderMutationFailure();
        }
        const refreshed = await load();
        if (refreshed.ok) resetMode();
        return refreshed;
      } catch (_) {
        return renderMutationFailure();
      } finally {
        pending = false;
        if (!destroyed) host.setAttribute("aria-busy", "false");
        if (control) control.disabled = false;
      }
    }

    function create(body) {
      return applyMutation(function () {
        return comments.create(postId, { body });
      });
    }

    function reply(parentCommentId, body) {
      return applyMutation(function () {
        return comments.create(postId, { body, parentCommentId });
      });
    }

    function update(commentId, body) {
      return applyMutation(function () {
        return comments.update(commentId, body);
      });
    }

    function remove(commentId, affectedControl) {
      return applyMutation(function () {
        return comments.remove(commentId);
      }, affectedControl);
    }

    function focusDraft() {
      if (draft && typeof draft.focus === "function") draft.focus();
      return frozen({ focused: Boolean(draft) });
    }

    function destroy() {
      if (destroyed) return frozen({ destroyed: true });
      destroyed = true;
      pending = false;
      draft = null;
      submit = null;
      state = null;
      host.removeAttribute("aria-busy");
      host.replaceChildren();
      return frozen({ destroyed: true });
    }

    return frozen({ load, create, reply, update, remove, focusDraft, destroy });
  }

  function mountCommentHost(rootObject, comments, host) {
    if (!host || host.dataset.socialCommentsMounted === "true") return null;
    const postId = host.getAttribute("data-social-post-id");
    if (!validId(postId)) return null;

    host.dataset.socialCommentsMounted = "true";
    const controller = createSocialCommentsController({
      host,
      postId,
      comments,
      document: rootObject.document,
    });

    let loadPromise = null;
    const ensureLoaded = function () {
      if (!loadPromise) {
        loadPromise = controller.load().then(function (result) {
          if (!result.ok) loadPromise = null;
          return result;
        });
      }
      return loadPromise;
    };

    const article = typeof host.closest === "function" ? host.closest("[data-social-post-id]") : null;
    const trigger = article && typeof article.querySelector === "function"
      ? article.querySelector("[data-social-comment-trigger]")
      : null;
    if (trigger && typeof trigger.addEventListener === "function") {
      trigger.addEventListener("click", function () {
        void ensureLoaded().then(function (result) {
          if (result.ok) controller.focusDraft();
        });
      });
    }

    return frozen({ host, ensureLoaded });
  }

  function mountCurrentSocialComments(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    const runtimeApi = runtimeRoot && runtimeRoot.TIGERSocialRuntime;
    if (!documentObject || typeof documentObject.querySelectorAll !== "function") {
      return frozen({ mounted: 0 });
    }
    if (!runtimeApi || typeof runtimeApi.createCurrentSocialRuntime !== "function") {
      return frozen({ mounted: 0 });
    }

    const runtime = runtimeApi.createCurrentSocialRuntime(runtimeRoot);
    if (!runtime || !runtime.comments) return frozen({ mounted: 0 });

    const hosts = Array.from(documentObject.querySelectorAll("[data-social-comments-host]"));
    const mounts = hosts
      .map((host) => mountCommentHost(runtimeRoot, runtime.comments, host))
      .filter(Boolean);

    if (typeof runtimeRoot.IntersectionObserver !== "function") {
      mounts.forEach((mount) => { void mount.ensureLoaded(); });
      return frozen({ mounted: mounts.length });
    }

    const byHost = new Map(mounts.map((mount) => [mount.host, mount]));
    const observer = new runtimeRoot.IntersectionObserver(function (entries) {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const mount = byHost.get(entry.target);
        if (mount) void mount.ensureLoaded();
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "160px 0px" });

    mounts.forEach((mount) => observer.observe(mount.host));
    return frozen({ mounted: mounts.length });
  }

  return frozen({
    createSocialCommentsController,
    mountCurrentSocialComments,
  });
});
