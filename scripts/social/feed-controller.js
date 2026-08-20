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
    const authorId = `social-post-author-${item.id}`;
    article.className = "social-feed-post";
    article.setAttribute("data-social-post-id", item.id);
    article.setAttribute("data-social-post-audience", item.audience);
    article.setAttribute("aria-labelledby", authorId);

    const header = documentObject.createElement("header");
    header.className = "social-feed-post__header";

    const avatar = documentObject.createElement("span");
    avatar.className = "social-feed-post__avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "V";

    const identity = documentObject.createElement("div");
    identity.className = "social-feed-post__identity";

    const author = documentObject.createElement("strong");
    author.className = "social-feed-post__author";
    author.setAttribute("id", authorId);
    author.textContent = "عضو VVIP TIGER";

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

    secondaryActions.append(comment, share);
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
      : function (delayMs) { return new Promise(function (resolve) { setTimeout(resolve, delayMs); }); };

    if (!host || typeof host.replaceChildren !== "function") {
      throw new TypeError("SOCIAL_FEED_HOST_REQUIRED");
    }
    if (!readModel || typeof readModel.load !== "function") {
      throw new TypeError("SOCIAL_FEED_READ_MODEL_REQUIRED");
    }
    if (!documentObject || typeof documentObject.createElement !== "function") {
      throw new TypeError("SOCIAL_FEED_DOCUMENT_REQUIRED");
    }

    let initialLoadOptions = {};
    let nextCursor = null;
    let nextInFlight = null;
    let reconnectRequired = false;
    let focusAfterNextAppend = false;
    let renderedNodes = [];
    let paginationButton = null;
    const renderedPostIds = new Set();

    function renderFailure() {
      host.setAttribute("aria-busy", "false");
      host.replaceChildren(statusNode(
        documentObject,
        "error",
        "تعذر تحميل آخر الأخبار الآن. حاول مرة أخرى لاحقًا."
      ));
      return frozen({ ok: false, code: "SOCIAL_FEED_RENDER_FAILED" });
    }

    function normalizedInitialOptions(loadOptions) {
      const normalized = {};
      if (loadOptions && Number.isInteger(loadOptions.limit)) normalized.limit = loadOptions.limit;
      return normalized;
    }

    function rememberSnapshot(snapshot) {
      nextCursor = typeof snapshot.nextCursor === "string" ? snapshot.nextCursor : null;
      reconnectRequired = false;
    }

    function paginationNode() {
      if (paginationButton) return paginationButton;
      paginationButton = documentObject.createElement("button");
      paginationButton.type = "button";
      paginationButton.className = "social-feed-load-more";
      paginationButton.setAttribute("data-social-feed-load-more", "");
      paginationButton.setAttribute("aria-label", "تحميل المزيد من آخر الأخبار");
      paginationButton.addEventListener("click", function () {
        paginationButton.disabled = true;
        const operation = reconnectRequired ? reconnect() : loadNext({ focusAppended: true });
        void operation.then(function (result) {
          if (result && result.ok === true) return;
          paginationButton.disabled = false;
          paginationButton.textContent = reconnectRequired ? "تحديث آخر الأخبار" : "إعادة المحاولة";
        });
      });
      return paginationButton;
    }

    function renderPosts() {
      if (nextCursor !== null && !reconnectRequired) {
        const button = paginationNode();
        button.disabled = false;
        button.textContent = "تحميل المزيد";
        host.replaceChildren(...renderedNodes, button);
        return;
      }
      host.replaceChildren(...renderedNodes);
    }

    async function load(loadOptions) {
      initialLoadOptions = normalizedInitialOptions(loadOptions);
      nextCursor = null;
      reconnectRequired = false;
      renderedPostIds.clear();
      renderedNodes = [];
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

      host.setAttribute("aria-busy", "false");
      rememberSnapshot(snapshot);

      if (snapshot.empty || snapshot.items.length === 0) {
        host.replaceChildren(statusNode(
          documentObject,
          "empty",
          "لا توجد منشورات متاحة لك حتى الآن."
        ));
        return frozen({ ok: true, count: 0, empty: true });
      }

      const nodes = snapshot.items.map(function (item) {
        renderedPostIds.add(item.id);
        return postNode(documentObject, item);
      });
      renderedNodes = nodes;
      renderPosts();
      return frozen({ ok: true, count: nodes.length, empty: false, hasMore: nextCursor !== null });
    }

    function retryableFailure(value) {
      return value && (value.retryable === true || value.code === "SOCIAL_FEED_RETRYABLE");
    }

    async function requestNextPage(cursor) {
      const request = Object.assign({}, initialLoadOptions, { cursor });
      for (let attempt = 0; attempt < 3; attempt += 1) {
        let snapshot;
        try {
          snapshot = await readModel.load(request);
        } catch (error) {
          if (!retryableFailure(error) || attempt === 2) throw error;
          await sleep(250 * (2 ** attempt));
          continue;
        }

        if (snapshot && snapshot.ok === false && snapshot.code === "SOCIAL_FEED_STALE_CURSOR") {
          nextCursor = null;
          reconnectRequired = true;
          return frozen({ ok: false, code: snapshot.code, reconnectRequired: true });
        }
        if (snapshot && snapshot.ok === true && Array.isArray(snapshot.items)) return snapshot;
        if (!retryableFailure(snapshot) || attempt === 2) {
          return frozen({ ok: false, code: "SOCIAL_FEED_PAGE_FAILED" });
        }
        await sleep(250 * (2 ** attempt));
      }
      return frozen({ ok: false, code: "SOCIAL_FEED_PAGE_FAILED" });
    }

    async function appendNextPage() {
      if (reconnectRequired) {
        return frozen({ ok: false, code: "SOCIAL_FEED_STALE_CURSOR", reconnectRequired: true });
      }
      if (nextCursor === null) return frozen({ ok: true, count: 0, hasMore: false });

      host.setAttribute("aria-busy", "true");
      let snapshot;
      try {
        snapshot = await requestNextPage(nextCursor);
      } catch (_) {
        snapshot = frozen({ ok: false, code: "SOCIAL_FEED_PAGE_FAILED" });
      }
      host.setAttribute("aria-busy", "false");
      if (!snapshot || snapshot.ok !== true) return snapshot;

      const newItems = snapshot.items.filter(function (item) {
        return item && typeof item.id === "string" && !renderedPostIds.has(item.id);
      });
      const nodes = newItems.map(function (item) {
        renderedPostIds.add(item.id);
        return postNode(documentObject, item);
      });
      renderedNodes.push(...nodes);
      rememberSnapshot(snapshot);
      renderPosts();
      if (focusAfterNextAppend && nextCursor === null && nodes[0]) {
        nodes[0].setAttribute("tabindex", "-1");
        nodes[0].focus();
      }
      focusAfterNextAppend = false;
      return frozen({ ok: true, count: nodes.length, hasMore: nextCursor !== null });
    }

    function loadNext(loadOptions) {
      if (loadOptions && loadOptions.focusAppended === true) focusAfterNextAppend = true;
      if (nextInFlight) return nextInFlight;
      nextInFlight = appendNextPage().finally(function () {
        nextInFlight = null;
        focusAfterNextAppend = false;
        if (host.getAttribute && host.getAttribute("aria-busy") === "true") {
          host.setAttribute("aria-busy", "false");
        }
      });
      return nextInFlight;
    }

    function reconnect() {
      return load(initialLoadOptions);
    }

    return frozen({ load, loadNext, reconnect });
  }

  function observeFeedTail(rootObject, host, controller) {
    if (!rootObject || typeof rootObject.IntersectionObserver !== "function") return null;

    const observer = new rootObject.IntersectionObserver(function (entries) {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        void controller.loadNext().then(function (result) {
          if (result && result.ok === true && result.hasMore === true) observeTail();
        });
      }
    }, { rootMargin: "320px 0px" });

    function observeTail() {
      const tail = host.lastElementChild;
      if (tail) observer.observe(tail);
    }

    observeTail();
    return observer;
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
    const controller = createSocialFeedController({ host, readModel, document: documentObject });
    const result = await controller.load();

    if (result.ok && result.hasMore) observeFeedTail(runtimeRoot, host, controller);

    const reactionsApi = runtimeRoot && runtimeRoot.TIGERSocialReactions;
    if (result.ok && reactionsApi && typeof reactionsApi.mountCurrentSocialReactions === "function") {
      reactionsApi.mountCurrentSocialReactions(runtimeRoot);
    }
    const commentsApi = runtimeRoot && runtimeRoot.TIGERSocialComments;
    if (result.ok && commentsApi && typeof commentsApi.mountCurrentSocialComments === "function") {
      commentsApi.mountCurrentSocialComments(runtimeRoot);
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
    createSocialFeedController,
    mountCurrentSocialFeed,
    installCurrentSocialFeed,
  });
});
