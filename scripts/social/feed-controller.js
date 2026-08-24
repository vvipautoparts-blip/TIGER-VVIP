(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialFeedController = api;
    if (root.document && typeof root.addEventListener === "function") {
      api.installCurrentSocialFeed(root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RETRY_DELAYS_MS = Object.freeze([250, 500]);

  function frozen(value) {
    return Object.freeze(value);
  }

  function statusNode(documentObject, state, message) {
    const node = documentObject.createElement("p");
    node.className = "social-feed-state";
    node.setAttribute("data-social-feed-state", state);
    node.setAttribute("role", "status");
    node.textContent = message;
    return node;
  }

  function audienceLabel(audience) {
    if (audience === "public") return "عام";
    if (audience === "friends") return "الأصدقاء";
    return "أنا فقط";
  }

  function iconButton(documentObject, label, className, text) {
    const button = documentObject.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.textContent = text;
    return button;
  }

  function postNode(documentObject, item) {
    const article = documentObject.createElement("article");
    article.className = "social-feed-post";
    article.setAttribute("data-social-post-id", item.id);
    article.setAttribute("data-social-post-audience", item.audience);

    const authorLabelId = `social-post-author-${item.id}`;
    article.setAttribute("aria-labelledby", authorLabelId);

    const header = documentObject.createElement("header");
    header.className = "social-feed-post__header";

    const avatar = documentObject.createElement("span");
    avatar.className = "social-feed-post__avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "V";

    const identity = documentObject.createElement("div");
    identity.className = "social-feed-post__identity";

    const author = documentObject.createElement(
      item.authorAvailable && item.authorProfileId ? "button" : "strong"
    );
    author.className = "social-feed-post__author";
    author.setAttribute("id", authorLabelId);
    author.textContent = item.authorDisplayName;
    if (item.authorAvailable && item.authorProfileId) {
      author.type = "button";
      author.setAttribute("data-social-profile-id", item.authorProfileId);
      author.setAttribute("aria-label", `عرض ملف ${item.authorDisplayName}`);
    }

    const details = documentObject.createElement("div");
    details.className = "social-feed-post__details";

    const time = documentObject.createElement("time");
    time.className = "social-feed-post__time";
    time.setAttribute("datetime", item.createdAt);
    time.textContent = item.createdAt;

    const separator = documentObject.createElement("span");
    separator.className = "social-feed-post__separator";
    separator.setAttribute("aria-hidden", "true");
    separator.textContent = "·";

    const meta = documentObject.createElement("span");
    meta.className = "social-feed-post__meta";
    meta.textContent = audienceLabel(item.audience);

    details.append(time, separator, meta);
    identity.append(author, details);

    const menu = iconButton(documentObject, "خيارات المنشور", "social-feed-post__menu", "•••");
    header.append(avatar, identity, menu);

    const body = documentObject.createElement("p");
    body.className = "social-feed-post__body";
    body.textContent = item.body;

    const actions = documentObject.createElement("div");
    actions.className = "social-feed-post__actions";
    actions.setAttribute("data-social-post-actions", "");

    const reactions = documentObject.createElement("section");
    reactions.className = "social-reactions";
    reactions.setAttribute("data-social-reactions-host", "");
    reactions.setAttribute("data-social-post-id", item.id);
    reactions.setAttribute("aria-label", "تفاعلات المنشور");

    const secondaryActions = documentObject.createElement("div");
    secondaryActions.className = "social-feed-post__secondary-actions";

    const comment = iconButton(documentObject, "تعليق", "social-post-action social-post-action--comment", "تعليق");
    comment.setAttribute("data-social-comment-trigger", "");

    const share = iconButton(documentObject, "مشاركة", "social-post-action social-post-action--share", "مشاركة");
    share.setAttribute("data-social-share-trigger", "");
    share.disabled = true;

    const report = iconButton(documentObject, "الإبلاغ عن المنشور", "social-post-action social-post-action--report", "إبلاغ");
    report.setAttribute("data-social-report-post", "");

    secondaryActions.append(comment, share, report);
    actions.append(reactions, secondaryActions);

    const comments = documentObject.createElement("section");
    comments.className = "social-comments";
    comments.setAttribute("data-social-comments-host", "");
    comments.setAttribute("data-social-post-id", item.id);
    comments.setAttribute("aria-label", "تعليقات المنشور وردوده");

    article.append(header, body, actions, comments);
    return article;
  }

  function createSocialFeedController(options) {
    const host = options && options.host;
    const readModel = options && options.readModel;
    const documentObject = options && options.document;
    const sleep = options && typeof options.sleep === "function"
      ? options.sleep
      : (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));
    const onItemsAppended = options && typeof options.onItemsAppended === "function"
      ? options.onItemsAppended
      : null;
    const onPageSettled = options && typeof options.onPageSettled === "function"
      ? options.onPageSettled
      : null;

    if (!host || typeof host.replaceChildren !== "function") {
      throw new TypeError("SOCIAL_FEED_HOST_REQUIRED");
    }
    if (!readModel || typeof readModel.load !== "function") {
      throw new TypeError("SOCIAL_FEED_READ_MODEL_REQUIRED");
    }
    if (!documentObject || typeof documentObject.createElement !== "function") {
      throw new TypeError("SOCIAL_FEED_DOCUMENT_REQUIRED");
    }

    let baseLoadOptions;
    let nextCursor = null;
    let renderedNodes = [];
    let renderedPostIds = new Set();
    let loadMoreButton = null;
    let inFlightNext = null;

    function baseOptions(loadOptions) {
      if (!loadOptions || typeof loadOptions !== "object" || Array.isArray(loadOptions)) {
        return undefined;
      }
      const result = {};
      for (const [key, value] of Object.entries(loadOptions)) {
        if (key !== "cursor") result[key] = value;
      }
      return result;
    }

    function nextOptions(cursor) {
      return Object.assign({}, baseLoadOptions || {}, { cursor });
    }

    function renderFailure() {
      host.setAttribute("aria-busy", "false");
      host.replaceChildren(statusNode(
        documentObject,
        "error",
        "تعذر تحميل آخر الأخبار الآن. حاول مرة أخرى لاحقًا."
      ));
      return frozen({ ok: false, code: "SOCIAL_FEED_RENDER_FAILED" });
    }

    function renderLoadMore() {
      if (!nextCursor) return null;
      const button = iconButton(
        documentObject,
        "تحميل المزيد من آخر الأخبار",
        "social-feed-load-more",
        "تحميل المزيد"
      );
      button.setAttribute("data-social-feed-load-more", "");
      button.addEventListener("click", function () {
        void loadNextInternal(true);
      });
      return button;
    }

    function renderPostsAndTail() {
      loadMoreButton = renderLoadMore();
      if (loadMoreButton) {
        host.replaceChildren(...renderedNodes, loadMoreButton);
      } else {
        host.replaceChildren(...renderedNodes);
      }
    }

    function normalizePageFailure(snapshot) {
      if (!snapshot || snapshot.ok !== false || typeof snapshot.code !== "string") {
        return frozen({ ok: false, code: "SOCIAL_FEED_PAGE_FAILED" });
      }
      const failure = { ok: false, code: snapshot.code };
      if (Number.isFinite(snapshot.retryAfterMs)) {
        failure.retryAfterMs = snapshot.retryAfterMs;
      }
      if (snapshot.code === "SOCIAL_FEED_STALE_CURSOR" || snapshot.code === "SOCIAL_FEED_SESSION_STALE") {
        failure.reconnectRequired = true;
      }
      return frozen(failure);
    }

    async function readNextWithRetry(cursor) {
      const request = nextOptions(cursor);
      let attempt = 0;
      while (true) {
        let snapshot;
        try {
          snapshot = await readModel.load(request);
        } catch (_) {
          return frozen({ ok: false, code: "SOCIAL_FEED_PAGE_FAILED" });
        }

        if (snapshot && snapshot.ok === true) return snapshot;
        if (!snapshot || snapshot.code !== "SOCIAL_FEED_RETRYABLE" || attempt >= RETRY_DELAYS_MS.length) {
          return normalizePageFailure(snapshot);
        }

        await sleep(RETRY_DELAYS_MS[attempt]);
        attempt += 1;
      }
    }

    async function loadNextInternal(keyboardRequested) {
      if (inFlightNext) return inFlightNext;
      if (!nextCursor) {
        return frozen({ ok: true, count: 0, hasMore: false });
      }

      const cursor = nextCursor;
      const focusAfterTerminalSuccess = keyboardRequested === true;
      inFlightNext = (async function () {
        host.setAttribute("aria-busy", "true");
        const snapshot = await readNextWithRetry(cursor);

        if (!snapshot || snapshot.ok !== true || !Array.isArray(snapshot.items)) {
          host.setAttribute("aria-busy", "false");
          return normalizePageFailure(snapshot);
        }

        const newNodes = [];
        for (const item of snapshot.items) {
          if (renderedPostIds.has(item.id)) continue;
          renderedPostIds.add(item.id);
          const node = postNode(documentObject, item);
          renderedNodes.push(node);
          newNodes.push(node);
        }

        nextCursor = typeof snapshot.nextCursor === "string" && snapshot.nextCursor
          ? snapshot.nextCursor
          : null;
        renderPostsAndTail();
        host.setAttribute("aria-busy", "false");

        if (newNodes.length > 0 && onItemsAppended) {
          onItemsAppended(Object.freeze([...newNodes]));
        }
        if (onPageSettled) onPageSettled();

        if (focusAfterTerminalSuccess && !nextCursor && newNodes.length > 0) {
          const firstNewNode = newNodes[0];
          firstNewNode.setAttribute("tabindex", "-1");
          if (typeof firstNewNode.focus === "function") firstNewNode.focus();
        }

        return frozen({
          ok: true,
          count: newNodes.length,
          hasMore: Boolean(nextCursor),
        });
      })();

      try {
        return await inFlightNext;
      } finally {
        inFlightNext = null;
      }
    }

    async function load(loadOptions) {
      baseLoadOptions = baseOptions(loadOptions);
      nextCursor = null;
      renderedNodes = [];
      renderedPostIds = new Set();
      loadMoreButton = null;

      host.setAttribute("aria-busy", "true");
      host.replaceChildren(statusNode(documentObject, "loading", "جارٍ تحميل آخر الأخبار…"));

      let snapshot;
      try {
        snapshot = await readModel.load(loadOptions);
      } catch (_) {
        return renderFailure();
      }

      if (!snapshot || snapshot.ok !== true || !Array.isArray(snapshot.items)) {
        return renderFailure();
      }

      nextCursor = typeof snapshot.nextCursor === "string" && snapshot.nextCursor
        ? snapshot.nextCursor
        : null;

      for (const item of snapshot.items) {
        if (renderedPostIds.has(item.id)) continue;
        renderedPostIds.add(item.id);
        renderedNodes.push(postNode(documentObject, item));
      }

      host.setAttribute("aria-busy", "false");

      if (renderedNodes.length === 0 && !nextCursor) {
        host.replaceChildren(statusNode(
          documentObject,
          "empty",
          "لا توجد منشورات متاحة لك حتى الآن."
        ));
        return frozen({ ok: true, count: 0, empty: true });
      }

      renderPostsAndTail();
      return frozen({
        ok: true,
        count: renderedNodes.length,
        empty: false,
        hasMore: Boolean(nextCursor),
      });
    }

    async function reconnect() {
      return load(baseLoadOptions);
    }

    return frozen({
      load,
      loadNext: function () { return loadNextInternal(false); },
      reconnect,
      getLoadMoreTarget: function () { return loadMoreButton; },
    });
  }

  function renderBootstrapFailure(rootObject) {
    const documentObject = rootObject && rootObject.document;
    const host = documentObject && documentObject.querySelector
      ? documentObject.querySelector("[data-social-feed-items]")
      : null;
    if (!host || typeof host.replaceChildren !== "function") {
      return frozen({ ok: false, code: "SOCIAL_FEED_HOST_UNAVAILABLE" });
    }
    host.setAttribute("aria-busy", "false");
    host.replaceChildren(statusNode(
      documentObject,
      "error",
      "تعذر تحميل آخر الأخبار الآن. حاول مرة أخرى لاحقًا."
    ));
    return frozen({ ok: false, code: "SOCIAL_FEED_BOOT_FAILED" });
  }

  async function mountCurrentSocialFeed(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    const host = documentObject && typeof documentObject.querySelector === "function"
      ? documentObject.querySelector("[data-social-feed-items]")
      : null;

    if (!host) return frozen({ ok: false, code: "SOCIAL_FEED_HOST_UNAVAILABLE" });

    const runtimeApi = runtimeRoot && runtimeRoot.TIGERSocialRuntime;
    const feedApi = runtimeRoot && runtimeRoot.TIGERSocialFeed;
    if (!runtimeApi || typeof runtimeApi.createCurrentSocialRuntime !== "function") {
      return renderBootstrapFailure(runtimeRoot);
    }
    if (!feedApi || typeof feedApi.createSocialFeedReadModel !== "function") {
      return renderBootstrapFailure(runtimeRoot);
    }

    const runtime = runtimeApi.createCurrentSocialRuntime(runtimeRoot);
    const readModel = feedApi.createSocialFeedReadModel({ runtime });
    const reactionsApi = runtimeRoot && runtimeRoot.TIGERSocialReactions;
    const commentsApi = runtimeRoot && runtimeRoot.TIGERSocialComments;
    let observer = null;
    let observedTarget = null;
    let controller;

    function mountPostEnhancers() {
      if (reactionsApi && typeof reactionsApi.mountCurrentSocialReactions === "function") {
        reactionsApi.mountCurrentSocialReactions(runtimeRoot);
      }
      if (commentsApi && typeof commentsApi.mountCurrentSocialComments === "function") {
        commentsApi.mountCurrentSocialComments(runtimeRoot);
      }
    }

    function observeCurrentTail() {
      if (!observer || !controller) return;
      const target = controller.getLoadMoreTarget();
      if (!target || target === observedTarget) return;
      if (observedTarget && typeof observer.unobserve === "function") {
        observer.unobserve(observedTarget);
      }
      observedTarget = target;
      observer.observe(target);
    }

    controller = createSocialFeedController({
      host,
      readModel,
      document: documentObject,
      onItemsAppended: function () {
        mountPostEnhancers();
      },
      onPageSettled: function () {
        observeCurrentTail();
      },
    });

    const result = await controller.load();
    if (!result.ok) return result;

    mountPostEnhancers();

    if (typeof runtimeRoot.IntersectionObserver === "function") {
      observer = new runtimeRoot.IntersectionObserver(function (entries) {
        for (const entry of entries || []) {
          if (!entry || entry.isIntersecting !== true || entry.target !== observedTarget) continue;
          const target = observedTarget;
          observedTarget = null;
          if (target && typeof observer.unobserve === "function") observer.unobserve(target);
          void controller.loadNext();
          break;
        }
      }, { rootMargin: "320px 0px" });
      observeCurrentTail();
    }

    return result;
  }

  function installCurrentSocialFeed(rootObject) {
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
          .then(function () { return mountCurrentSocialFeed(runtimeRoot); })
          .catch(function () { return renderBootstrapFailure(runtimeRoot); });
        return;
      }

      if (runtimeRoot.VVIP_SUPABASE) {
        void mountCurrentSocialFeed(runtimeRoot);
        return;
      }

      runtimeRoot.addEventListener("vvip:runtime-ready", function () {
        void mountCurrentSocialFeed(runtimeRoot);
      }, { once: true });
      runtimeRoot.addEventListener("vvip:runtime-error", function () {
        renderBootstrapFailure(runtimeRoot);
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
    createSocialPostNode: postNode,
    createSocialFeedController,
    mountCurrentSocialFeed,
    installCurrentSocialFeed,
  });
});
