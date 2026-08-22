(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.TIGERSocialSearch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_DEBOUNCE_MS = 250;
  const SEARCH_RETRYABLE_STATES = new Set([
    "partial",
    "error",
    "rate-limited",
    "session-stale",
    "cursor-stale",
    "offline",
  ]);

  function safeItems(result) {
    if (!result || result.ok !== true || !result.value || !Array.isArray(result.value.items)) return [];
    return result.value.items;
  }

  function failureCode(result) {
    return result && result.ok === false && typeof result.code === "string"
      ? result.code
      : null;
  }

  function resultState(peopleResult, postResult, peopleCount, postsCount) {
    const peopleOk = Boolean(peopleResult && peopleResult.ok === true);
    const postsOk = Boolean(postResult && postResult.ok === true);
    const codes = [failureCode(peopleResult), failureCode(postResult)].filter(Boolean);

    if (peopleOk && postsOk) {
      return { kind: peopleCount + postsCount > 0 ? "content" : "empty", code: null };
    }
    if (peopleOk || postsOk) {
      return { kind: "partial", code: codes[0] || "SOCIAL_SEARCH_PARTIAL" };
    }
    if (codes.includes("SOCIAL_RATE_LIMITED")) {
      return { kind: "rate-limited", code: "SOCIAL_RATE_LIMITED" };
    }
    if (codes.includes("SOCIAL_SEARCH_SESSION_STALE")) {
      return { kind: "session-stale", code: "SOCIAL_SEARCH_SESSION_STALE" };
    }
    if (codes.includes("SOCIAL_SEARCH_STALE_CURSOR")) {
      return { kind: "cursor-stale", code: "SOCIAL_SEARCH_STALE_CURSOR" };
    }
    return { kind: "error", code: codes[0] || "SOCIAL_SEARCH_RETRYABLE" };
  }

  function createTigerSocialSearchController(options) {
    const config = options && typeof options === "object" ? options : {};
    const searchAdapter = config.search;
    const view = config.view;
    const onStateChange = typeof config.onStateChange === "function" ? config.onStateChange : function () {};
    let generation = 0;
    let lastQuery = null;
    let online = true;
    const inFlight = new Map();

    if (!searchAdapter || typeof searchAdapter.people !== "function" || typeof searchAdapter.posts !== "function") {
      throw new TypeError("TIGER_SOCIAL_SEARCH_ADAPTER_REQUIRED");
    }
    if (!view || typeof view.setState !== "function" || typeof view.renderPeople !== "function" || typeof view.renderPosts !== "function") {
      throw new TypeError("TIGER_SOCIAL_SEARCH_VIEW_REQUIRED");
    }

    function emit(kind, details) {
      const safeDetails = details && typeof details === "object" ? details : {};
      const state = Object.freeze({
        kind,
        peopleCount: Number.isInteger(safeDetails.peopleCount) ? safeDetails.peopleCount : 0,
        postsCount: Number.isInteger(safeDetails.postsCount) ? safeDetails.postsCount : 0,
        code: typeof safeDetails.code === "string" ? safeDetails.code : null,
      });
      view.setState(state);
      onStateChange(state);
      return state;
    }

    function isOnline() {
      if (typeof config.isOnline === "function") return config.isOnline() !== false;
      return online;
    }

    async function settleSearch(operation, query) {
      try {
        const result = await operation(query, { limit: 20 });
        if (result && typeof result === "object") return result;
        return { ok: false, code: "SOCIAL_SEARCH_RETRYABLE" };
      } catch (_error) {
        return { ok: false, code: "SOCIAL_SEARCH_RETRYABLE" };
      }
    }

    async function runSearch(query) {
      const activeGeneration = ++generation;
      lastQuery = query;
      if (typeof view.setQuery === "function") view.setQuery(query);

      if (!isOnline()) {
        const offlineState = emit("offline", { code: "SOCIAL_SEARCH_OFFLINE" });
        return Object.freeze({
          state: offlineState.kind,
          peopleCount: 0,
          postsCount: 0,
          code: offlineState.code,
        });
      }

      emit("loading");

      const [peopleResult, postsResult] = await Promise.all([
        settleSearch(searchAdapter.people, query),
        settleSearch(searchAdapter.posts, query),
      ]);

      if (activeGeneration !== generation) {
        return Object.freeze({ state: "stale", peopleCount: 0, postsCount: 0 });
      }

      const people = safeItems(peopleResult);
      const posts = safeItems(postsResult);
      if (peopleResult && peopleResult.ok === true) view.renderPeople(people);
      if (postsResult && postsResult.ok === true) view.renderPosts(posts);

      const resolved = resultState(peopleResult, postsResult, people.length, posts.length);
      emit(resolved.kind, {
        peopleCount: people.length,
        postsCount: posts.length,
        code: resolved.code,
      });

      return Object.freeze({
        state: resolved.kind,
        peopleCount: people.length,
        postsCount: posts.length,
        code: resolved.code,
      });
    }

    function queryKey(query) {
      return typeof query === "string" ? query.trim().replace(/\s+/g, " ") : String(query);
    }

    function search(query) {
      const key = queryKey(query);
      const existing = inFlight.get(key);
      if (existing) return existing;

      const promise = runSearch(query);
      inFlight.set(key, promise);
      promise.then(
        () => { if (inFlight.get(key) === promise) inFlight.delete(key); },
        () => { if (inFlight.get(key) === promise) inFlight.delete(key); }
      );
      return promise;
    }

    function retry() {
      if (lastQuery === null) {
        return Promise.resolve(Object.freeze({
          state: "idle",
          peopleCount: 0,
          postsCount: 0,
          code: null,
        }));
      }
      return search(lastQuery);
    }

    function invalidate() {
      generation += 1;
    }

    function setOnline(value) {
      online = value !== false;
      if (!online) invalidate();
      return online;
    }

    return Object.freeze({ search, retry, invalidate, setOnline });
  }

  function appendText(parent, tagName, className, value) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    node.textContent = value == null ? "" : String(value);
    parent.appendChild(node);
    return node;
  }

  function createDomSearchView(root) {
    const stateNode = root.querySelector("[data-social-search-state]");
    const peopleNode = root.querySelector("[data-social-search-people]");
    const postsNode = root.querySelector("[data-social-search-posts]");
    const input = root.querySelector("[data-social-search-input]");
    const retryButton = root.querySelector("[data-social-search-retry]");

    function clear(node) {
      while (node && node.firstChild) node.removeChild(node.firstChild);
    }

    function renderPeople(items) {
      if (!peopleNode) return;
      clear(peopleNode);
      for (const item of items) {
        const card = document.createElement("article");
        card.className = "social-search-person";
        card.dataset.profileId = item.profile_id || "";
        appendText(card, "strong", "social-search-person__name", item.display_name || "عضو TIGER");
        const meta = [item.business_name, item.specialization, item.location].filter(Boolean).join(" · ");
        if (meta) appendText(card, "span", "social-search-person__meta", meta);
        peopleNode.appendChild(card);
      }
    }

    function renderPosts(items) {
      if (!postsNode) return;
      clear(postsNode);
      for (const item of items) {
        const card = document.createElement("article");
        card.className = "social-search-post";
        card.dataset.postId = item.post_id || "";
        appendText(card, "strong", "social-search-post__author", item.author_display_name || "عضو غير متاح");
        appendText(card, "p", "social-search-post__body", item.body || "");
        postsNode.appendChild(card);
      }
    }

    function stateMessage(state) {
      switch (state.kind) {
        case "loading": return "جارٍ البحث…";
        case "empty": return "لا توجد نتائج متاحة وفق صلاحياتك الحالية.";
        case "partial": return "ظهرت نتائج جزئية؛ تعذر تحميل أحد أقسام البحث.";
        case "rate-limited": return "تم بلوغ حد البحث مؤقتًا. أعد المحاولة بعد قليل.";
        case "session-stale": return "انتهت صلاحية جلسة البحث. حدّث الجلسة ثم أعد المحاولة.";
        case "cursor-stale": return "تغيّر سياق البحث. أعد البحث من البداية.";
        case "error": return "تعذر إكمال البحث الآن. أعد المحاولة.";
        case "offline": return "لا يوجد اتصال حاليًا. ستتمكن من إعادة المحاولة بعد عودة الاتصال.";
        case "content": return `${state.peopleCount + state.postsCount} نتيجة متاحة.`;
        default: return "ابحث عن أشخاص أو منشورات داخل VVIP TIGER.";
      }
    }

    return Object.freeze({
      setState(state) {
        root.dataset.searchState = state.kind;
        if (stateNode) stateNode.textContent = stateMessage(state);
        if (retryButton) {
          const retryVisible = SEARCH_RETRYABLE_STATES.has(state.kind);
          retryButton.hidden = !retryVisible;
          retryButton.setAttribute("aria-hidden", retryVisible ? "false" : "true");
        }
        root.setAttribute("aria-busy", state.kind === "loading" ? "true" : "false");
      },
      renderPeople,
      renderPosts,
      setQuery(query) {
        if (input && input.value !== query) input.value = query;
      },
    });
  }

  function bindTigerSocialSearchSurface(root, searchAdapter, options) {
    if (!root) return null;
    const input = root.querySelector("[data-social-search-input]");
    if (!input) return null;

    const config = options && typeof options === "object" ? options : {};
    const retryButton = root.querySelector("[data-social-search-retry]");
    const view = config.view || createDomSearchView(root);
    const ownerWindow = root.ownerDocument && root.ownerDocument.defaultView;
    const isOnline = typeof config.isOnline === "function"
      ? config.isOnline
      : () => !ownerWindow || !ownerWindow.navigator || ownerWindow.navigator.onLine !== false;
    const controller = createTigerSocialSearchController({
      search: searchAdapter,
      view,
      isOnline,
      onStateChange: config.onStateChange,
    });
    let timer = null;

    function submit() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      const query = input.value;
      if (typeof query !== "string") return;
      const compact = query.trim().replace(/\s+/g, " ");
      if (compact.length < 2 || compact.length > 160) {
        controller.invalidate();
        view.renderPeople([]);
        view.renderPosts([]);
        view.setState({ kind: "idle", peopleCount: 0, postsCount: 0, code: null });
        return;
      }
      controller.search(query);
    }

    input.addEventListener("input", () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(submit, debounceMs);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      submit();
    });

    if (retryButton) {
      retryButton.addEventListener("click", () => {
        controller.retry();
      });
    }

    if (ownerWindow && typeof ownerWindow.addEventListener === "function") {
      ownerWindow.addEventListener("offline", () => {
        controller.setOnline(false);
        view.setState({ kind: "offline", peopleCount: 0, postsCount: 0, code: "SOCIAL_SEARCH_OFFLINE" });
      });
      ownerWindow.addEventListener("online", () => {
        controller.setOnline(true);
        if (retryButton && root.dataset.searchState === "offline") retryButton.focus();
      });
    }

    return controller;
  }

  function bootCurrentSearch() {
    if (typeof document === "undefined") return;
    const root = document.querySelector("[data-social-search-surface]");
    const runtime = typeof globalThis !== "undefined" && globalThis.TIGERSocialRuntime;
    if (!root || !runtime || typeof runtime.createCurrentSocialRuntime !== "function") return;
    const adapters = runtime.createCurrentSocialRuntime(globalThis);
    if (!adapters || !adapters.search) return;
    bindTigerSocialSearchSurface(root, adapters.search);
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    window.addEventListener("DOMContentLoaded", bootCurrentSearch);
  }

  return Object.freeze({
    DEFAULT_DEBOUNCE_MS,
    createTigerSocialSearchController,
    createDomSearchView,
    bindTigerSocialSearchSurface,
  });
});