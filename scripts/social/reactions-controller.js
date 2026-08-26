(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialReactions = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const REACTION_DEFINITIONS = Object.freeze([
    Object.freeze({ type: "like", label: "إعجاب", icon: "👍", colorToken: "--tiger-reaction-like" }),
    Object.freeze({ type: "love", label: "أحببته", icon: "♥", colorToken: "--tiger-reaction-love" }),
    Object.freeze({ type: "support", label: "دعم", icon: "🫶", colorToken: "--tiger-reaction-support" }),
    Object.freeze({ type: "haha", label: "أضحكني", icon: "😄", colorToken: "--tiger-reaction-haha" }),
    Object.freeze({ type: "wow", label: "مذهل", icon: "😮", colorToken: "--tiger-reaction-wow" }),
    Object.freeze({ type: "sad", label: "أحزنني", icon: "😢", colorToken: "--tiger-reaction-sad" }),
    Object.freeze({ type: "angry", label: "أغضبني", icon: "😠", colorToken: "--tiger-reaction-angry" }),
  ]);
  const REACTION_TYPES = Object.freeze(REACTION_DEFINITIONS.map((item) => item.type));

  function frozen(value) {
    return Object.freeze(value);
  }

  function isReactionType(value) {
    return typeof value === "string" && REACTION_TYPES.includes(value);
  }

  function safeInteger(value) {
    return Number.isInteger(value) && value >= 0 ? value : 0;
  }

  function normalizeSummary(value, postId) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.ok !== true || value.post_id !== postId) return null;

    const viewerReaction = value.viewer_reaction === null || value.viewer_reaction === undefined
      ? null
      : value.viewer_reaction;
    if (viewerReaction !== null && !isReactionType(viewerReaction)) return null;

    const counts = {};
    const rawCounts = value.counts && typeof value.counts === "object" && !Array.isArray(value.counts)
      ? value.counts
      : {};
    for (const definition of REACTION_DEFINITIONS) {
      counts[definition.type] = safeInteger(rawCounts[definition.type]);
    }

    return frozen({
      total: safeInteger(value.total),
      counts: frozen(counts),
      viewerReaction,
    });
  }

  function statusNode(documentObject, state, message) {
    const node = documentObject.createElement("span");
    node.className = "social-reactions__status";
    node.setAttribute("data-social-reactions-state", state);
    node.setAttribute("role", "status");
    node.textContent = message;
    return node;
  }

  function createSocialReactionsController(options) {
    const host = options && options.host;
    const runtime = options && options.runtime;
    const documentObject = options && options.document;
    const postId = options && options.postId;

    if (!host || typeof host.replaceChildren !== "function") {
      throw new TypeError("SOCIAL_REACTIONS_HOST_REQUIRED");
    }
    if (!runtime || !runtime.reactions) {
      throw new TypeError("SOCIAL_REACTIONS_RUNTIME_REQUIRED");
    }
    if (!documentObject || typeof documentObject.createElement !== "function") {
      throw new TypeError("SOCIAL_REACTIONS_DOCUMENT_REQUIRED");
    }
    if (typeof postId !== "string" || !postId) {
      throw new TypeError("SOCIAL_REACTIONS_POST_ID_REQUIRED");
    }

    let confirmed = null;
    let pending = false;

    function renderFailure() {
      host.setAttribute("aria-busy", "false");
      host.replaceChildren(statusNode(
        documentObject,
        "error",
        "تعذر تحميل التفاعلات الآن."
      ));
      return frozen({ ok: false, code: "SOCIAL_REACTIONS_FAILED" });
    }

    function render(snapshot) {
      confirmed = snapshot;
      host.setAttribute("aria-busy", "false");
      host.dataset.socialReactionTotal = String(snapshot.total);
      host.dataset.socialViewerReaction = snapshot.viewerReaction || "";

      const summary = documentObject.createElement("div");
      summary.className = "social-reactions__summary";

      const total = documentObject.createElement("span");
      total.className = "social-reactions__total";
      total.setAttribute("data-social-reaction-total", String(snapshot.total));
      total.textContent = snapshot.total > 0 ? String(snapshot.total) : "";
      summary.append(total);

      const actions = documentObject.createElement("div");
      actions.className = "social-reactions__actions";

      const main = documentObject.createElement("button");
      main.className = "social-reactions__main";
      main.setAttribute("type", "button");
      main.setAttribute("data-social-reaction-main", "like");
      main.setAttribute("aria-pressed", snapshot.viewerReaction === "like" ? "true" : "false");
      main.textContent = snapshot.viewerReaction === "like" ? "👍 إعجاب" : "إعجاب";
      main.addEventListener("click", function () {
        void toggleLike();
      });

      const picker = documentObject.createElement("div");
      picker.className = "social-reactions__picker";
      picker.setAttribute("data-social-reaction-picker", "");
      picker.setAttribute("role", "group");
      picker.setAttribute("aria-label", "اختر تفاعلًا");

      for (const definition of REACTION_DEFINITIONS) {
        const button = documentObject.createElement("button");
        button.className = "social-reactions__choice social-reactions__choice--" + definition.type;
        button.setAttribute("type", "button");
        button.setAttribute("data-social-reaction-choice", definition.type);
        button.setAttribute("data-social-reaction-color-token", definition.colorToken);
        button.setAttribute("aria-label", definition.label);
        button.setAttribute("aria-pressed", snapshot.viewerReaction === definition.type ? "true" : "false");
        button.textContent = definition.icon;
        button.addEventListener("click", function () {
          void choose(definition.type);
        });
        picker.append(button);
      }

      actions.append(main, picker);
      host.replaceChildren(summary, actions);
      return frozen({ ok: true, total: snapshot.total, viewerReaction: snapshot.viewerReaction });
    }

    async function apply(operation) {
      if (pending) return frozen({ ok: false, code: "SOCIAL_REACTION_PENDING" });
      pending = true;
      host.setAttribute("aria-busy", "true");
      try {
        const result = await operation();
        if (!result || result.ok !== true) return renderFailure();
        const snapshot = normalizeSummary(result.value, postId);
        if (!snapshot) return renderFailure();
        return render(snapshot);
      } catch (_) {
        return renderFailure();
      } finally {
        pending = false;
      }
    }

    async function choose(reactionType) {
      if (!isReactionType(reactionType)) {
        return frozen({ ok: false, code: "SOCIAL_INVALID_REACTION_TYPE" });
      }
      return apply(function () {
        return runtime.reactions.set(postId, reactionType);
      });
    }

    async function toggleLike() {
      if (confirmed && confirmed.viewerReaction === "like") {
        return apply(function () {
          return runtime.reactions.remove(postId);
        });
      }
      return choose("like");
    }

    return frozen({
      load: async function () {
        host.setAttribute("aria-busy", "true");
        host.replaceChildren(statusNode(documentObject, "loading", "جارٍ تحميل التفاعلات…"));
        try {
          const result = await runtime.reactions.summary(postId);
          if (!result || result.ok !== true) return renderFailure();
          const snapshot = normalizeSummary(result.value, postId);
          if (!snapshot) return renderFailure();
          return render(snapshot);
        } catch (_) {
          return renderFailure();
        }
      },
      choose,
      toggleLike,
    });
  }

  function mountReactionHost(rootObject, runtime, host) {
    if (!host || host.dataset.socialReactionsMounted === "true") return;
    const postId = host.getAttribute("data-social-post-id");
    if (!postId) return;

    host.dataset.socialReactionsMounted = "true";
    const controller = createSocialReactionsController({
      host,
      runtime,
      document: rootObject.document,
      postId,
    });
    void controller.load();
  }

  function mountCurrentSocialReactions(rootObject) {
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
    const hosts = Array.from(documentObject.querySelectorAll("[data-social-reactions-host]"));
    if (typeof runtimeRoot.IntersectionObserver !== "function") {
      hosts.forEach((host) => mountReactionHost(runtimeRoot, runtime, host));
      return frozen({ mounted: hosts.length });
    }

    const observer = new runtimeRoot.IntersectionObserver(function (entries) {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        mountReactionHost(runtimeRoot, runtime, entry.target);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "160px 0px" });

    hosts.forEach((host) => observer.observe(host));
    return frozen({ mounted: hosts.length });
  }

  return frozen({
    REACTION_DEFINITIONS,
    createSocialReactionsController,
    mountCurrentSocialReactions,
  });
});
