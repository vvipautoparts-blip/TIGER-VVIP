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
    article.className = "social-feed-post";
    article.setAttribute("data-social-post-id", item.id);
    article.setAttribute("data-social-post-audience", item.audience);

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

    if (!host || typeof host.replaceChildren !== "function") {
      throw new TypeError("SOCIAL_FEED_HOST_REQUIRED");
    }
    if (!readModel || typeof readModel.load !== "function") {
      throw new TypeError("SOCIAL_FEED_READ_MODEL_REQUIRED");
    }
    if (!documentObject || typeof documentObject.createElement !== "function") {
      throw new TypeError("SOCIAL_FEED_DOCUMENT_REQUIRED");
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

    return frozen({
      load: async function (loadOptions) {
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
        const rejectedCount = Number.isInteger(snapshot.rejectedCount) && snapshot.rejectedCount > 0
          ? snapshot.rejectedCount
          : 0;
        host.dataset.socialFeedMalformed = String(rejectedCount);

        if (snapshot.empty || snapshot.items.length === 0) {
          host.replaceChildren(statusNode(
            documentObject,
            "empty",
            "لا توجد منشورات متاحة لك حتى الآن."
          ));
          return frozen({ ok: true, count: 0, empty: true, rejectedCount });
        }

        const nodes = snapshot.items.map((item) => postNode(documentObject, item));
        host.replaceChildren(...nodes);
        return frozen({ ok: true, count: nodes.length, empty: false, rejectedCount });
      },
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
    const controller = createSocialFeedController({ host, readModel, document: documentObject });
    const result = await controller.load();

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
