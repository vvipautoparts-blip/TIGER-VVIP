(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") {
    root.TIGERSocialSearchController = api;
    if (root.document && typeof root.addEventListener === "function") {
      api.installCurrentSocialSearch(root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const PROFILE_KEYS = new Set([
    "profile_id", "display_name", "avatar_url", "business_name", "location",
    "specialization", "viewer_is_following",
  ]);
  const POST_KEYS = new Set([
    "post_id", "author_profile_id", "author_display_name", "author_avatar_url",
    "author_available", "body", "audience", "created_at", "updated_at",
  ]);

  function frozen(value) {
    return Object.freeze(value);
  }

  function failure(code) {
    return frozen({ ok: false, code });
  }

  function exactKeys(value, allowed) {
    return value && typeof value === "object" && !Array.isArray(value)
      && Object.keys(value).length === allowed.size
      && Object.keys(value).every((key) => allowed.has(key));
  }

  function optionalText(value, maximum) {
    return value === null || (typeof value === "string" && value.length <= maximum);
  }

  function normalizeProfile(value) {
    if (!exactKeys(value, PROFILE_KEYS)
        || !UUID_PATTERN.test(value.profile_id)
        || typeof value.display_name !== "string"
        || value.display_name.trim().length < 1
        || value.display_name.trim().length > 160
        || !optionalText(value.avatar_url, 2048)
        || !optionalText(value.business_name, 200)
        || !optionalText(value.location, 200)
        || !optionalText(value.specialization, 200)
        || typeof value.viewer_is_following !== "boolean") {
      return null;
    }
    return frozen({
      profileId: value.profile_id,
      displayName: value.display_name.trim(),
      avatarUrl: value.avatar_url,
      businessName: value.business_name,
      location: value.location,
      specialization: value.specialization,
      viewerIsFollowing: value.viewer_is_following,
    });
  }

  function createSearchController(options) {
    const documentObject = options && options.document;
    const form = options && options.form;
    const input = options && options.input;
    const status = options && options.status;
    const peopleHost = options && options.peopleHost;
    const postsHost = options && options.postsHost;
    const runtime = options && options.runtime;
    const normalizePost = options && options.normalizePost;
    const renderPost = options && options.renderPost;
    const onPostsRendered = options && options.onPostsRendered;

    if (!documentObject || typeof documentObject.createElement !== "function") {
      throw new TypeError("SOCIAL_SEARCH_DOCUMENT_REQUIRED");
    }
    if (!form || !input || !status || !peopleHost || !postsHost
        || typeof peopleHost.replaceChildren !== "function"
        || typeof postsHost.replaceChildren !== "function") {
      throw new TypeError("SOCIAL_SEARCH_NODES_REQUIRED");
    }
    if (!runtime || !runtime.search
        || typeof runtime.search.query !== "function"
        || typeof runtime.search.discover !== "function") {
      throw new TypeError("SOCIAL_SEARCH_RUNTIME_REQUIRED");
    }
    if (typeof normalizePost !== "function" || typeof renderPost !== "function") {
      throw new TypeError("SOCIAL_SEARCH_POST_RENDERER_REQUIRED");
    }

    let generation = 0;

    function setStatus(message) {
      status.textContent = message;
    }

    function clearResults() {
      peopleHost.replaceChildren();
      postsHost.replaceChildren();
    }

    function renderProfile(profile) {
      const card = documentObject.createElement("article");
      card.className = "social-search-profile";

      const avatar = documentObject.createElement("span");
      avatar.className = "social-search-profile__avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = profile.displayName.slice(0, 1).toUpperCase() || "V";

      const details = documentObject.createElement("div");
      details.className = "social-search-profile__details";
      const name = documentObject.createElement("strong");
      name.textContent = profile.displayName;
      const meta = documentObject.createElement("span");
      meta.textContent = [profile.businessName, profile.specialization, profile.location]
        .filter(Boolean).join(" · ");
      details.append(name, meta);

      const open = documentObject.createElement("button");
      open.type = "button";
      open.className = "social-search-profile__open";
      open.setAttribute("data-social-profile-id", profile.profileId);
      open.setAttribute("aria-label", `عرض ملف ${profile.displayName}`);
      open.textContent = profile.viewerIsFollowing ? "تتابعه" : "عرض الملف";
      card.append(avatar, details, open);
      return card;
    }

    function normalizeProfiles(values, maximum) {
      if (!Array.isArray(values) || values.length > maximum) return null;
      const seen = new Set();
      const profiles = [];
      for (const value of values) {
        const profile = normalizeProfile(value);
        if (!profile || seen.has(profile.profileId)) return null;
        seen.add(profile.profileId);
        profiles.push(profile);
      }
      return profiles;
    }

    function normalizePosts(values, maximum) {
      if (!Array.isArray(values) || values.length > maximum) return null;
      const posts = [];
      for (const value of values) {
        if (!exactKeys(value, POST_KEYS)) return null;
        const normalized = normalizePost(value);
        if (!normalized || normalized.ok !== true || !normalized.value) return null;
        posts.push(normalized.value);
      }
      return posts;
    }

    function renderPeople(profiles) {
      peopleHost.replaceChildren(...profiles.map(renderProfile));
    }

    async function discover() {
      const requestGeneration = ++generation;
      setStatus("جارٍ تجهيز اقتراحات آمنة…");
      let response;
      try {
        response = await runtime.search.discover({ limit: 12 });
      } catch (_) {
        response = null;
      }
      if (requestGeneration !== generation) return failure("SOCIAL_SEARCH_STALE_RESULT");
      const payload = response && response.ok === true ? response.value : null;
      if (!payload || !exactKeys(payload, new Set(["ok", "profiles"])) || payload.ok !== true) {
        clearResults();
        setStatus("تعذر تحميل الاقتراحات الآن.");
        return failure("SOCIAL_DISCOVERY_FAILED");
      }
      const profiles = normalizeProfiles(payload.profiles, 12);
      if (!profiles) {
        clearResults();
        setStatus("تعذر التحقق من نتائج الاقتراحات.");
        return failure("SOCIAL_DISCOVERY_INVALID_PAYLOAD");
      }
      renderPeople(profiles);
      postsHost.replaceChildren();
      setStatus(profiles.length ? "أشخاص مقترحون لك." : "لا توجد اقتراحات متاحة الآن.");
      return frozen({ ok: true, count: profiles.length });
    }

    async function search() {
      const query = typeof input.value === "string" ? input.value.trim() : "";
      if (query.length < 2 || query.length > 100) {
        clearResults();
        setStatus("اكتب عبارتين على الأقل وبحد أقصى 100 حرف.");
        return failure("SOCIAL_INVALID_SEARCH_QUERY");
      }
      const requestGeneration = ++generation;
      setStatus("جارٍ البحث…");
      let response;
      try {
        response = await runtime.search.query(query, { limit: 20 });
      } catch (_) {
        response = null;
      }
      if (requestGeneration !== generation) return failure("SOCIAL_SEARCH_STALE_RESULT");
      const payload = response && response.ok === true ? response.value : null;
      const rootKeys = new Set(["ok", "query", "profiles", "posts"]);
      if (!payload || !exactKeys(payload, rootKeys) || payload.ok !== true || payload.query !== query) {
        clearResults();
        setStatus("تعذر التحقق من نتائج البحث.");
        return failure("SOCIAL_SEARCH_INVALID_PAYLOAD");
      }
      const profiles = normalizeProfiles(payload.profiles, 20);
      const posts = normalizePosts(payload.posts, 20);
      if (!profiles || !posts) {
        clearResults();
        setStatus("تعذر التحقق من نتائج البحث.");
        return failure("SOCIAL_SEARCH_INVALID_PAYLOAD");
      }
      const postNodes = posts.map(renderPost);
      if (postNodes.some((node) => !node)) {
        clearResults();
        setStatus("تعذر عرض نتائج البحث بأمان.");
        return failure("SOCIAL_SEARCH_RENDER_FAILED");
      }
      renderPeople(profiles);
      postsHost.replaceChildren(...postNodes);
      if (typeof onPostsRendered === "function" && postNodes.length) onPostsRendered();
      const total = profiles.length + posts.length;
      setStatus(total ? `تم العثور على ${total} نتيجة.` : "لم نعثر على نتائج مطابقة.");
      return frozen({ ok: true, peopleCount: profiles.length, postCount: posts.length });
    }

    return frozen({ discover, search });
  }

  function mountCurrentSocialSearch(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    const query = (selector) => documentObject && documentObject.querySelector(selector);
    const runtimeApi = runtimeRoot && runtimeRoot.TIGERSocialRuntime;
    const feedModel = runtimeRoot && runtimeRoot.TIGERSocialFeed;
    const feedController = runtimeRoot && runtimeRoot.TIGERSocialFeedController;
    if (!documentObject || !runtimeApi || !feedModel || !feedController
        || typeof runtimeApi.createCurrentSocialRuntime !== "function"
        || typeof feedModel.normalizeFeedPost !== "function"
        || typeof feedController.createSocialPostNode !== "function") {
      return null;
    }
    const form = query("[data-social-search-form]");
    const input = query("[data-social-search-input]");
    const status = query("[data-social-search-status]");
    const peopleHost = query("[data-social-search-people]");
    const postsHost = query("[data-social-search-posts]");
    if (!form || !input || !status || !peopleHost || !postsHost) return null;

    const controller = createSearchController({
      document: documentObject,
      form,
      input,
      status,
      peopleHost,
      postsHost,
      runtime: runtimeApi.createCurrentSocialRuntime(runtimeRoot),
      normalizePost: feedModel.normalizeFeedPost,
      renderPost: (post) => feedController.createSocialPostNode(documentObject, post),
      onPostsRendered: function () {
        if (typeof runtimeRoot.CustomEvent === "function") {
          documentObject.dispatchEvent(new runtimeRoot.CustomEvent("vvip:social-posts-rendered"));
        }
      },
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      void controller.search();
    });
    runtimeRoot.TIGERSocialSearchCurrent = controller;
    void controller.discover();
    return controller;
  }

  function installCurrentSocialSearch(rootObject) {
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
        ready.then(function () { mountCurrentSocialSearch(runtimeRoot); }).catch(function () {});
      } else if (runtimeRoot.VVIP_SUPABASE) {
        mountCurrentSocialSearch(runtimeRoot);
      } else {
        runtimeRoot.addEventListener("vvip:runtime-ready", function () {
          mountCurrentSocialSearch(runtimeRoot);
        }, { once: true });
      }
    };
    if (documentObject.readyState === "loading") {
      runtimeRoot.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
    return frozen({ installed: true, start });
  }

  return frozen({
    createSearchController,
    mountCurrentSocialSearch,
    installCurrentSocialSearch,
  });
});
