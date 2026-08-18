(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialFeedController = api;
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

  function postNode(documentObject, item) {
    const article = documentObject.createElement("article");
    article.className = "social-feed-post";
    article.setAttribute("data-social-post-id", item.id);
    article.setAttribute("data-social-post-audience", item.audience);

    const header = documentObject.createElement("header");
    header.className = "social-feed-post__header";

    const author = documentObject.createElement("strong");
    author.className = "social-feed-post__author";
    author.textContent = "عضو VVIP TIGER";

    const meta = documentObject.createElement("span");
    meta.className = "social-feed-post__meta";
    meta.textContent = audienceLabel(item.audience);

    const time = documentObject.createElement("time");
    time.className = "social-feed-post__time";
    time.setAttribute("datetime", item.createdAt);
    time.textContent = item.createdAt;

    const body = documentObject.createElement("p");
    body.className = "social-feed-post__body";
    body.textContent = item.body;

    header.append(author, meta, time);
    article.append(header, body);
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

        if (snapshot.empty || snapshot.items.length === 0) {
          host.replaceChildren(statusNode(
            documentObject,
            "empty",
            "لا توجد منشورات متاحة لك حتى الآن."
          ));
          return frozen({ ok: true, count: 0, empty: true });
        }

        const nodes = snapshot.items.map((item) => postNode(documentObject, item));
        host.replaceChildren(...nodes);
        return frozen({ ok: true, count: nodes.length, empty: false });
      },
    });
  }

  return frozen({
    createSocialFeedController,
  });
});
