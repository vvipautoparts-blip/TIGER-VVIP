(function (root, factory) {
  "use strict";

  const textContract = root && root.TIGERSocialTextContract
    ? root.TIGERSocialTextContract
    : (typeof module === "object" && module.exports ? require("./text-contract.js") : null);
  const api = factory(textContract);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialComments = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (textContract) {
  "use strict";

  const COMMENT_PAGE_LIMIT = 20;
  const COMMENT_LOAD_CONCURRENCY = 2;
  const DEFAULT_RATE_LIMIT_MS = 5000;
  const MAX_RATE_LIMIT_MS = 60000;

  function frozen(value) {
    return Object.freeze(value);
  }

  const COMMENT_ACTION_ATTRIBUTES = frozen({
    reply: "data-social-comment-reply",
    edit: "data-social-comment-edit",
    remove: "data-social-comment-remove",
  });

  function validId(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function validTimestamp(value) {
    return typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
  }

  function normalizeBody(value) {
    if (!textContract || typeof textContract.normalizeText !== "function") return null;
    const result = textContract.normalizeText(value, 2000, "SOCIAL_INVALID_COMMENT_BODY");
    return result.ok && result.value === value ? result.value : null;
  }

  function normalizeRow(value, postId, parentCommentId) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (!validId(value.comment_id) || value.post_id !== postId) return null;
    if (value.parent_comment_id !== parentCommentId) return null;
    const body = normalizeBody(value.body);
    if (body === null) return null;
    if (!validTimestamp(value.created_at) || !validTimestamp(value.updated_at)) return null;
    if (typeof value.viewer_can_edit !== "boolean") return null;

    return frozen({
      commentId: value.comment_id,
      postId: value.post_id,
      parentCommentId: value.parent_comment_id,
      body,
      createdAt: value.created_at,
      updatedAt: value.updated_at,
      viewerCanEdit: value.viewer_can_edit,
    });
  }

  function normalizeCursor(value) {
    if (value === null) return null;
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    if (!validTimestamp(value.created_at) || !validId(value.comment_id)) return undefined;
    return frozen({ createdAt: value.created_at, commentId: value.comment_id });
  }

  function normalizePage(result, postId, parentCommentId) {
    const value = result && result.ok === true ? result.value : null;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.ok !== true || value.post_id !== postId || value.parent_comment_id !== parentCommentId) return null;
    if (!Array.isArray(value.items) || value.items.length > COMMENT_PAGE_LIMIT) return null;
    if (!Number.isInteger(value.page_count) || value.page_count !== value.items.length) return null;

    const nextCursor = normalizeCursor(value.next_cursor);
    if (nextCursor === undefined) return null;

    const items = [];
    const ids = new Set();
    let rejectedCount = 0;
    for (const rawItem of value.items) {
      const item = normalizeRow(rawItem, postId, parentCommentId);
      if (!item || ids.has(item.commentId)) {
        rejectedCount += 1;
        continue;
      }
      ids.add(item.commentId);
      items.push(item);
    }

    return frozen({ items: frozen(items), rejectedCount, nextCursor });
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
    const scheduleRead = options && typeof options.scheduleRead === "function"
      ? options.scheduleRead
      : function (task) { return Promise.resolve().then(task); };
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
    let mutationCooldownUntil = 0;
    let draft = null;
    let submit = null;
    let state = null;
    let refreshButton = null;
    let mode = frozen({ type: "create", commentId: null });
    let parentItems = [];
    let parentNextCursor = null;
    let rejectedCount = 0;
    let readEpoch = 0;
    const repliesByParent = new Map();
    const replyNextCursor = new Map();
    const readFlights = new Map();

    function setState(nextState, message) {
      if (!state) return;
      state.setAttribute("data-social-comments-state", nextState);
      state.textContent = message;
    }

    function applyModeState() {
      if (!submit) return;
      if (mode.type === "reply") {
        submit.textContent = "نشر الرد";
        setState("reply", "أنت ترد على تعليق.");
      } else if (mode.type === "edit") {
        submit.textContent = "حفظ التعديل";
        setState("edit", "أنت تعدّل تعليقك.");
      } else {
        submit.textContent = "نشر التعليق";
        setState("ready", "");
      }
    }

    function resetMode() {
      mode = frozen({ type: "create", commentId: null });
      if (draft) draft.value = "";
      if (refreshButton) refreshButton.hidden = true;
      applyModeState();
    }

    function chooseReply(commentId) {
      mode = frozen({ type: "reply", commentId });
      applyModeState();
      if (draft && typeof draft.focus === "function") draft.focus();
    }

    function chooseEdit(item) {
      mode = frozen({ type: "edit", commentId: item.commentId });
      if (draft) draft.value = item.body;
      applyModeState();
      if (draft && typeof draft.focus === "function") draft.focus();
    }

    function commentNode(item) {
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

        const showReplies = documentObject.createElement("button");
        showReplies.type = "button";
        showReplies.className = "social-comment__action social-comment__action--replies";
        showReplies.setAttribute("data-social-comment-load-replies", item.commentId);
        showReplies.textContent = "عرض الردود";
        showReplies.addEventListener("click", function () { void loadReplies(item.commentId); });
        actions.append(reply, showReplies);
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
        for (const reply of replies) replyList.append(commentNode(reply));
        article.append(replyList);
      }

      if (replyNextCursor.get(item.commentId)) {
        const moreReplies = documentObject.createElement("button");
        moreReplies.type = "button";
        moreReplies.className = "social-comment__action social-comments__more";
        moreReplies.setAttribute("data-social-comment-more-replies", item.commentId);
        moreReplies.textContent = "عرض المزيد من الردود";
        moreReplies.addEventListener("click", function () { void loadReplies(item.commentId, true); });
        article.append(moreReplies);
      }

      return article;
    }

    function composerNode(initialValue) {
      const form = documentObject.createElement("form");
      form.className = "social-comments__composer";
      form.setAttribute("data-social-comment-composer", "");

      const label = documentObject.createElement("label");
      label.className = "social-comments__label";
      label.textContent = "أضف تعليقًا";

      draft = documentObject.createElement("textarea");
      draft.className = "social-comments__draft";
      draft.setAttribute("data-social-comment-draft", "");
      draft.setAttribute("rows", "2");
      draft.setAttribute("placeholder", "اكتب تعليقًا…");
      draft.value = initialValue;
      label.append(draft);

      const controls = documentObject.createElement("div");
      controls.className = "social-comments__composer-controls";

      state = statusNode(documentObject, "ready", "");

      refreshButton = documentObject.createElement("button");
      refreshButton.type = "button";
      refreshButton.className = "social-comments__cancel social-comments__refresh";
      refreshButton.setAttribute("data-social-comment-refresh", "");
      refreshButton.textContent = "إعادة تحميل التعليقات";
      refreshButton.hidden = true;
      refreshButton.addEventListener("click", function () { void retryRefresh(); });

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

      controls.append(state, refreshButton, cancel, submit);
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
      applyModeState();
      return form;
    }

    function renderCollection() {
      hasConfirmed = true;
      host.setAttribute("aria-busy", "false");
      const previousDraft = draft ? draft.value : "";

      const list = documentObject.createElement("div");
      list.className = "social-comments__list";
      list.setAttribute("data-social-comments-list", "");

      if (rejectedCount > 0) {
        list.append(statusNode(
          documentObject,
          "malformed",
          "تعذر عرض " + rejectedCount + " من عناصر التعليقات غير الصالحة."
        ));
      }

      if (parentItems.length === 0) {
        list.append(statusNode(documentObject, "empty", "لا توجد تعليقات بعد. كن أول من يعلّق."));
      } else {
        for (const item of parentItems) list.append(commentNode(item));
      }

      if (parentNextCursor) {
        const more = documentObject.createElement("button");
        more.type = "button";
        more.className = "social-comment__action social-comments__more";
        more.setAttribute("data-social-comments-more", "");
        more.textContent = "عرض المزيد من التعليقات";
        more.addEventListener("click", function () { void loadMore(); });
        list.append(more);
      }

      host.dataset.socialCommentsMalformed = String(rejectedCount);
      host.dataset.socialCommentsCount = String(
        parentItems.length + Array.from(repliesByParent.values()).reduce((sum, items) => sum + items.length, 0)
      );
      host.replaceChildren(list, composerNode(previousDraft));
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

    function uniqueAppend(current, incoming) {
      const seen = new Set(current.map((item) => item.commentId));
      const merged = current.slice();
      let duplicates = 0;
      for (const item of incoming) {
        if (seen.has(item.commentId)) {
          duplicates += 1;
          continue;
        }
        seen.add(item.commentId);
        merged.push(item);
      }
      return { items: merged, duplicates };
    }

    function destroyedResult() {
      return frozen({ ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
    }

    function supersededResult() {
      return frozen({ ok: false, code: "SOCIAL_COMMENTS_READ_SUPERSEDED" });
    }

    function inactiveReadResult(epoch) {
      if (destroyed) return destroyedResult();
      if (epoch !== readEpoch) return supersededResult();
      return null;
    }

    function beginReadGeneration() {
      readEpoch += 1;
      readFlights.clear();
      return readEpoch;
    }

    function runReadFlight(scope, epoch, kind, task) {
      const existing = readFlights.get(scope);
      if (existing && existing.epoch === epoch) return existing.promise;

      let operation;
      try {
        operation = Promise.resolve(task());
      } catch (error) {
        operation = Promise.reject(error);
      }

      let tracked;
      tracked = operation.finally(function () {
        const current = readFlights.get(scope);
        if (current && current.promise === tracked) readFlights.delete(scope);
      });
      readFlights.set(scope, { epoch, kind, promise: tracked });
      return tracked;
    }

    async function fetchPage(parentCommentId, cursor, epoch) {
      const result = await scheduleRead(function () {
        if (destroyed || epoch !== readEpoch) return null;
        return comments.list(postId, {
          parentCommentId,
          cursor,
          limit: COMMENT_PAGE_LIMIT,
        });
      });
      if (destroyed || epoch !== readEpoch) return null;
      return normalizePage(result, postId, parentCommentId);
    }

    async function loadAtEpoch(epoch) {
      host.setAttribute("aria-busy", "true");
      if (!hasConfirmed) {
        host.replaceChildren(statusNode(documentObject, "loading", "جارٍ تحميل التعليقات…"));
      } else {
        setState("loading", "جارٍ تحديث التعليقات…");
      }

      try {
        const page = await fetchPage(null, null, epoch);
        const inactive = inactiveReadResult(epoch);
        if (inactive) return inactive;
        if (!page) return renderLoadFailure();
        parentItems = page.items.slice();
        parentNextCursor = page.nextCursor;
        rejectedCount = page.rejectedCount;
        repliesByParent.clear();
        replyNextCursor.clear();
        renderCollection();
        return frozen({
          ok: true,
          count: parentItems.length,
          empty: parentItems.length === 0,
          rejectedCount,
          nextCursor: parentNextCursor,
        });
      } catch (_) {
        const inactive = inactiveReadResult(epoch);
        if (inactive) return inactive;
        return renderLoadFailure();
      }
    }

    function loadCollection(forceRefresh) {
      if (destroyed) return Promise.resolve(destroyedResult());
      const existing = readFlights.get("parents");
      if (!forceRefresh
        && existing
        && existing.epoch === readEpoch
        && existing.kind === "replace") {
        return existing.promise;
      }

      const epoch = beginReadGeneration();
      return runReadFlight("parents", epoch, "replace", function () {
        return loadAtEpoch(epoch);
      });
    }

    function load() {
      return loadCollection(false);
    }

    async function loadMoreAtEpoch(epoch, cursor) {
      host.setAttribute("aria-busy", "true");
      try {
        const page = await fetchPage(null, cursor, epoch);
        const inactive = inactiveReadResult(epoch);
        if (inactive) return inactive;
        if (!page) return renderLoadFailure();
        const merged = uniqueAppend(parentItems, page.items);
        parentItems = merged.items;
        parentNextCursor = page.nextCursor;
        rejectedCount += page.rejectedCount + merged.duplicates;
        renderCollection();
        return frozen({ ok: true, count: parentItems.length, rejectedCount, nextCursor: parentNextCursor });
      } catch (_) {
        const inactive = inactiveReadResult(epoch);
        if (inactive) return inactive;
        return renderLoadFailure();
      }
    }

    function loadMore() {
      if (!parentNextCursor) {
        return Promise.resolve(frozen({ ok: true, count: parentItems.length, rejectedCount, nextCursor: null }));
      }
      const epoch = readEpoch;
      const cursor = parentNextCursor;
      return runReadFlight("parents", epoch, "append", function () {
        return loadMoreAtEpoch(epoch, cursor);
      });
    }

    async function loadRepliesAtEpoch(parentCommentId, appendPage, cursor, epoch) {
      host.setAttribute("aria-busy", "true");
      try {
        const page = await fetchPage(parentCommentId, cursor, epoch);
        const inactive = inactiveReadResult(epoch);
        if (inactive) return inactive;
        if (!page) return renderLoadFailure();
        const current = appendPage ? (repliesByParent.get(parentCommentId) || []) : [];
        const merged = uniqueAppend(current, page.items);
        repliesByParent.set(parentCommentId, merged.items);
        replyNextCursor.set(parentCommentId, page.nextCursor);
        rejectedCount += page.rejectedCount + merged.duplicates;
        renderCollection();
        return frozen({
          ok: true,
          count: merged.items.length,
          rejectedCount: page.rejectedCount + merged.duplicates,
          nextCursor: page.nextCursor,
        });
      } catch (_) {
        const inactive = inactiveReadResult(epoch);
        if (inactive) return inactive;
        return renderLoadFailure();
      }
    }

    function loadReplies(parentCommentId, appendPage) {
      if (!validId(parentCommentId)) {
        return Promise.resolve(frozen({ ok: false, code: "SOCIAL_INVALID_COMMENT_ID" }));
      }
      const epoch = readEpoch;
      const cursor = appendPage ? (replyNextCursor.get(parentCommentId) || null) : null;
      const scope = "replies:" + parentCommentId;
      return runReadFlight(scope, epoch, appendPage ? "append" : "replace", function () {
        return loadRepliesAtEpoch(parentCommentId, appendPage, cursor, epoch);
      });
    }

    function renderMutationFailure() {
      host.setAttribute("aria-busy", "false");
      setState("error", "تعذر حفظ التغيير الآن. حاول مرة أخرى.");
      return frozen({ ok: false, code: "SOCIAL_COMMENTS_FAILED" });
    }

    function renderRefreshPending() {
      if (!state) host.replaceChildren(composerNode(""));
      setState("refresh-pending", "تم الحفظ. تعذر تحديث التعليقات؛ أعد التحميل فقط.");
      if (refreshButton) refreshButton.hidden = false;
      return frozen({ ok: true, code: "SOCIAL_COMMENT_SAVED_REFRESH_PENDING" });
    }

    function normalizeRateLimitMs(result) {
      const requested = result && Number.isFinite(result.retryAfterMs) && result.retryAfterMs > 0
        ? result.retryAfterMs
        : DEFAULT_RATE_LIMIT_MS;
      return Math.min(MAX_RATE_LIMIT_MS, Math.ceil(requested));
    }

    function renderRateLimited(retryAfterMs) {
      host.setAttribute("aria-busy", "false");
      setState("rate-limited", "تم إيقاف المحاولة مؤقتًا. حاول مرة أخرى بعد قليل.");
      return frozen({
        ok: false,
        code: "SOCIAL_COMMENTS_RATE_LIMITED",
        retryAfterMs,
      });
    }

    function activeCooldownFailure() {
      const remaining = Math.max(1, Math.ceil(mutationCooldownUntil - now()));
      return renderRateLimited(remaining);
    }

    async function applyMutation(operation, affectedControl) {
      if (destroyed) return frozen({ ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
      if (now() < mutationCooldownUntil) return activeCooldownFailure();
      if (pending) return frozen({ ok: false, code: "SOCIAL_COMMENT_PENDING" });
      pending = true;
      host.setAttribute("aria-busy", "true");
      const control = affectedControl || submit;
      if (control) control.disabled = true;
      setState("pending", "جارٍ الحفظ…");

      try {
        let result;
        try {
          result = await operation();
        } catch (_) {
          return renderMutationFailure();
        }
        if (destroyed) return frozen({ ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
        if (result && result.ok === false && result.code === "SOCIAL_RATE_LIMITED") {
          const retryAfterMs = normalizeRateLimitMs(result);
          mutationCooldownUntil = now() + retryAfterMs;
          return renderRateLimited(retryAfterMs);
        }
        if (!result || result.ok !== true || !result.value || result.value.ok !== true) {
          return renderMutationFailure();
        }

        resetMode();
        const refreshed = await loadCollection(true);
        if (destroyed) return frozen({ ok: false, code: "SOCIAL_COMMENTS_DESTROYED" });
        if (!refreshed.ok) return renderRefreshPending();
        return refreshed;
      } finally {
        pending = false;
        if (!destroyed) host.setAttribute("aria-busy", "false");
        if (control) control.disabled = false;
      }
    }

    function create(body) {
      return applyMutation(function () { return comments.create(postId, { body }); });
    }

    function reply(parentCommentId, body) {
      return applyMutation(function () { return comments.create(postId, { body, parentCommentId }); });
    }

    function update(commentId, body) {
      return applyMutation(function () { return comments.update(commentId, body); });
    }

    function remove(commentId, affectedControl) {
      return applyMutation(function () { return comments.remove(commentId); }, affectedControl);
    }

    function retryRefresh() {
      if (refreshButton) refreshButton.hidden = true;
      return loadCollection(true);
    }

    function focusDraft() {
      if (draft && typeof draft.focus === "function") draft.focus();
      return frozen({ focused: Boolean(draft) });
    }

    function destroy() {
      if (destroyed) return frozen({ destroyed: true });
      destroyed = true;
      readEpoch += 1;
      readFlights.clear();
      pending = false;
      mutationCooldownUntil = 0;
      draft = null;
      submit = null;
      state = null;
      refreshButton = null;
      parentItems = [];
      repliesByParent.clear();
      replyNextCursor.clear();
      host.removeAttribute("aria-busy");
      host.replaceChildren();
      return frozen({ destroyed: true });
    }

    return frozen({ load, loadMore, loadReplies, retryRefresh, create, reply, update, remove, focusDraft, destroy });
  }

  function createLoadScheduler(limit) {
    const maximum = Number.isInteger(limit) && limit > 0 ? limit : COMMENT_LOAD_CONCURRENCY;
    const queue = [];
    let active = 0;

    function pump() {
      while (active < maximum && queue.length > 0) {
        const entry = queue.shift();
        active += 1;
        Promise.resolve()
          .then(entry.task)
          .then(entry.resolve, entry.reject)
          .finally(function () {
            active -= 1;
            pump();
          });
      }
    }

    return function schedule(task) {
      return new Promise(function (resolve, reject) {
        queue.push({ task, resolve, reject });
        pump();
      });
    };
  }

  const scheduleCommentLoad = createLoadScheduler(COMMENT_LOAD_CONCURRENCY);

  function mountCommentHost(rootObject, comments, host, schedule) {
    if (!host || host.dataset.socialCommentsMounted === "true") return null;
    const postId = host.getAttribute("data-social-post-id");
    if (!validId(postId)) return null;

    host.dataset.socialCommentsMounted = "true";
    const controller = createSocialCommentsController({
      host,
      postId,
      comments,
      document: rootObject.document,
      scheduleRead: schedule,
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
      .map((host) => mountCommentHost(runtimeRoot, runtime.comments, host, scheduleCommentLoad))
      .filter(Boolean);

    // Deliberately no IntersectionObserver or mount-time load: comments are fetched
    // only after the user activates a post's comment control.
    return frozen({ mounted: mounts.length });
  }

  return frozen({ createSocialCommentsController, mountCurrentSocialComments });
});
