(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.TIGERSynapseLivingSurface = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SURFACE_SOURCES = Object.freeze(["HOME", "MARKETPLACE_RESCUE", "SOCIAL_ACTION", "PROFILE"]);
  const SURFACE_SET = new Set(SURFACE_SOURCES);
  const MODES = new Set(["PRIVATE_LOCAL", "ASSISTED", "LIVE_NETWORK"]);

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function cleanToken(value, fallback) {
    const token = String(value || fallback || "").trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(token)) fail("S3_TOKEN_INVALID", "surface token is invalid");
    return token;
  }

  function cleanSummary(value) {
    const summary = String(value || "").trim();
    if (!summary || summary.length > 500) fail("S3_SUMMARY_INVALID", "surface summary is required and bounded");
    return summary;
  }

  function safeObject(value) {
    if (value === undefined) return {};
    if (!value || typeof value !== "object" || Array.isArray(value)) fail("S3_OBJECT_INVALID", "surface options must be an object");
    const encoded = JSON.stringify(value);
    if (encoded.length > 3000) fail("S3_OBJECT_INVALID", "surface options exceed bounded size");
    return JSON.parse(encoded);
  }

  function buildIntentDraftFromSurface(input = {}, context = {}) {
    const source = String(input.source || "").trim().toUpperCase();
    if (!SURFACE_SET.has(source)) fail("S3_SOURCE_INVALID", "unknown living surface source");

    const activationMode = String(input.activationMode || "ASSISTED");
    if (!MODES.has(activationMode)) fail("S3_MODE_INVALID", "unknown living surface activation mode");

    const now = context.now instanceof Date ? new Date(context.now) : new Date(context.now || Date.now());
    if (!Number.isFinite(now.getTime())) fail("S3_NOW_INVALID", "trusted surface clock is invalid");
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return Object.freeze({
      direction: input.direction === "OFFER" ? "OFFER" : "NEED",
      sector: cleanToken(input.sector, "general"),
      category: cleanToken(input.category, "general"),
      summary: cleanSummary(input.summary),
      requiredConstraints: safeObject(input.requiredConstraints),
      preferences: safeObject(input.preferences),
      market: safeObject(input.market),
      activationMode,
      visibilityClass: activationMode === "LIVE_NETWORK" ? "MATCHING_NETWORK" : "PRIVATE_LOCAL",
      expiresAt: expiresAt.toISOString(),
      sourceProvenance: source === "SOCIAL_ACTION" ? "SOCIAL_ACTION" : "ASSISTED_DRAFT",
      surfaceSource: source,
    });
  }

  function createLivingSurfaceController({ intentRuntime, now = () => new Date(), document: documentRef = null, window: windowRef = null } = {}) {
    if (!intentRuntime || typeof intentRuntime.create !== "function") throw new TypeError("single Intent runtime authority is required");
    if (typeof now !== "function") throw new TypeError("trusted clock is required");

    const state = { lastDraft: null, lastResult: null };

    async function createFromSurface(input = {}, context = {}) {
      const clock = now();
      const draft = buildIntentDraftFromSurface(input, { now: clock });
      const explicitConfirmation = context.explicitConfirmation === true;
      if (draft.activationMode === "LIVE_NETWORK" && !explicitConfirmation) {
        fail("S3_CONFIRMATION_REQUIRED", "LIVE_NETWORK requires explicit user confirmation");
      }
      const result = await intentRuntime.create(draft, {
        ...context,
        now: clock,
        explicitConfirmation,
      });
      state.lastDraft = draft;
      state.lastResult = result;
      return result;
    }

    function refresh() {
      if (!documentRef) return false;
      const profile = documentRef.querySelector("[data-synapse-profile-intent-summary]");
      if (profile) {
        profile.textContent = state.lastDraft
          ? `النية الحالية: ${state.lastDraft.summary}`
          : "لا توجد نية نشطة معروضة. إنشاء النية يبدأ محليًا ولا يرسلها للشبكة تلقائيًا.";
      }
      const constellation = documentRef.querySelector("[data-synapse-match-constellation]");
      if (constellation && !constellation.hasChildNodes()) {
        const empty = documentRef.createElement("p");
        empty.textContent = "ستظهر المطابقات المؤهلة هنا بعد تفعيل نية شبكية صريحة وورود نتائج موثوقة.";
        constellation.append(empty);
      }
      enhanceSocialActions();
      return true;
    }

    function actorSubject() {
      const subject = windowRef?.Clerk?.user?.id || windowRef?.TIGER_CURRENT_USER_SUBJECT || "";
      return typeof subject === "string" ? subject : "";
    }

    function setStatus(host, message, stateName) {
      if (!host) return;
      host.textContent = message;
      if (stateName) host.dataset.synapseState = stateName;
    }

    async function createLocalDraft(input, statusHost) {
      if (windowRef && windowRef.navigator && windowRef.navigator.onLine === false) {
        setStatus(statusHost, "أنت غير متصل. ستبقى هذه المساعدة محلية ولن ندّعي نشرها أو مطابقتها.", "offline");
      }
      const actor = actorSubject();
      if (!actor) {
        setStatus(statusHost, "سجّل الدخول أولًا لإنشاء نية مرتبطة بهويتك الموثوقة.", "blocked");
        return { ok: false, code: "S3_ACTOR_UNAVAILABLE" };
      }
      try {
        const result = await createFromSurface(input, { actorSubject: actor, explicitConfirmation: false });
        setStatus(statusHost, result?.ok ? "تم تجهيز نية محلية. لم تُرسل إلى شبكة المطابقة." : "تعذر تجهيز النية بأمان.", result?.ok ? "local" : "error");
        refresh();
        return result;
      } catch (_) {
        setStatus(statusHost, "تعذر تجهيز النية بأمان.", "error");
        return { ok: false, code: "S3_DRAFT_FAILED" };
      }
    }

    function bindHome() {
      const form = documentRef?.querySelector("[data-synapse-intent-entry]");
      if (!form || form.dataset.synapseBound === "true") return;
      form.dataset.synapseBound = "true";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = form.querySelector("[data-synapse-intent-input]");
        const status = form.querySelector("[data-synapse-intent-status]");
        const summary = input?.value || "";
        if (!summary.trim()) return setStatus(status, "اكتب ما تحتاجه أو ما تعرضه أولًا.", "error");
        void createLocalDraft({ source: "HOME", summary, direction: "NEED", sector: "general", category: "general" }, status);
      });
    }

    function bindMarketplaceRescue() {
      const host = documentRef?.querySelector("[data-synapse-marketplace-rescue]");
      if (!host || host.dataset.synapseBound === "true") return;
      host.dataset.synapseBound = "true";
      host.addEventListener("click", (event) => {
        const trigger = event.target.closest("[data-synapse-marketplace-rescue-trigger]");
        if (!trigger) return;
        const search = documentRef.querySelector("[data-listing-search]");
        const query = String(search?.value || "").trim();
        if (!query) return setStatus(host.querySelector("[data-synapse-marketplace-rescue-status]"), "اكتب عبارة البحث أولًا.", "error");
        void createLocalDraft({ source: "MARKETPLACE_RESCUE", summary: query, direction: "NEED", sector: "general", category: "marketplace" }, host.querySelector("[data-synapse-marketplace-rescue-status]"));
      });
    }

    function enhanceSocialActions() {
      if (!documentRef) return;
      documentRef.querySelectorAll("[data-social-post-id]").forEach((article) => {
        if (article.querySelector("[data-synapse-social-to-intent]")) return;
        const actions = article.querySelector(".social-feed-post__secondary-actions, .social-feed-post__actions");
        if (!actions) return;
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = "social-post-action synapse-social-intent-action";
        button.setAttribute("data-synapse-social-to-intent", "");
        button.textContent = "حوّلها إلى نية";
        button.addEventListener("click", () => {
          const text = String(article.querySelector("[data-social-post-content], .social-feed-post__content")?.textContent || "").trim().slice(0, 500);
          if (!text) return;
          void createLocalDraft({ source: "SOCIAL_ACTION", summary: text, direction: "NEED", sector: "general", category: "social" }, null);
        });
        actions.append(button);
      });
    }

    function bind() {
      if (!documentRef) return false;
      bindHome();
      bindMarketplaceRescue();
      refresh();
      documentRef.addEventListener("vvip:social-posts-rendered", enhanceSocialActions);
      return true;
    }

    return Object.freeze({ createFromSurface, refresh, bind, getState: () => Object.freeze({ ...state }) });
  }

  function installBrowser(root) {
    if (!root || !root.document || !root.TIGERSynapseIntentRuntime) return null;
    const client = root.VVIP_SUPABASE;
    const rpc = async (name, params) => {
      if (!client || typeof client.rpc !== "function") return { error: { code: "S3_RPC_UNAVAILABLE" } };
      try { return await client.rpc(name, params); } catch (_) { return { error: { code: "S3_RPC_FAILED" } }; }
    };
    const intentRuntime = root.TIGERSynapseIntentRuntime.createIntentRuntimeAdapter({ rpc });
    const controller = createLivingSurfaceController({ intentRuntime, document: root.document, window: root });
    root.TIGERSynapseLivingSurfaceCurrent = controller;
    const start = () => controller.bind();
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
    return controller;
  }

  if (typeof window !== "undefined" && window.document) {
    try { installBrowser(window); } catch (_) { /* fail closed: existing social surface remains usable */ }
  }

  return { SURFACE_SOURCES, buildIntentDraftFromSurface, createLivingSurfaceController, installBrowser };
});
