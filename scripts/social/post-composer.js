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
    root.TIGERSocialPostComposer = api;
    if (root.document && typeof root.addEventListener === "function") {
      api.installCurrentSocialPostComposer(root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (textContract) {
  "use strict";

  const AUDIENCES = new Set(["public", "friends", "only_me"]);
  const NEXUS_INTENTS = new Set(["OFFER", "NEED", "SERVICE", "OPPORTUNITY"]);
  const SECTOR_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
  const MAX_BODY_LENGTH = 5000;

  function frozen(value) {
    return Object.freeze(value);
  }

  function failure(code) {
    return frozen({ ok: false, code });
  }

  function normalizeSectorId(value) {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return SECTOR_ID.test(normalized) ? normalized : null;
  }

  function normalizeIntent(value) {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toUpperCase();
    return NEXUS_INTENTS.has(normalized) ? normalized : null;
  }

  function normalizeComposerDraft(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return failure("SOCIAL_POST_INVALID_DRAFT");
    }
    if (!textContract || typeof textContract.normalizeText !== "function") {
      return failure("SOCIAL_POST_INVALID_BODY");
    }

    const body = textContract.normalizeText(input.body, MAX_BODY_LENGTH, "SOCIAL_POST_INVALID_BODY");
    if (!body.ok) return failure(body.code);
    if (!AUDIENCES.has(input.audience)) {
      return failure("SOCIAL_POST_INVALID_AUDIENCE");
    }

    const sectorId = normalizeSectorId(input.sectorId);
    if (!sectorId) return failure("NEXUS_SECTOR_REQUIRED");
    const intent = normalizeIntent(input.intent);
    if (!intent) return failure("NEXUS_INTENT_REQUIRED");

    return frozen({
      ok: true,
      value: frozen({ body: body.value, audience: input.audience, sectorId, intent }),
    });
  }

  function createSocialPostComposer(options) {
    const draftInput = options && options.draftInput;
    const audienceInput = options && options.audienceInput;
    const sectorInput = options && options.sectorInput;
    const intentInput = options && options.intentInput;
    const classificationResolver = options && options.classificationResolver;
    const submitButton = options && options.submitButton;
    const statusHost = options && options.statusHost;
    const postSheet = options && options.sheet;
    const runtime = options && options.runtime;
    const auth = options && options.auth;
    const onPublished = options && options.onPublished;

    if (!draftInput || !audienceInput || !submitButton || !statusHost || !postSheet) {
      throw new TypeError("SOCIAL_POST_COMPOSER_SURFACE_REQUIRED");
    }
    if (!runtime || !runtime.posts || typeof runtime.posts.create !== "function") {
      throw new TypeError("SOCIAL_POST_RUNTIME_REQUIRED");
    }
    if (!auth || typeof auth.requireAuth !== "function") {
      throw new TypeError("SOCIAL_POST_AUTH_REQUIRED");
    }

    function setStatus(message, state) {
      statusHost.textContent = message;
      if (typeof statusHost.setAttribute === "function") {
        statusHost.setAttribute("data-social-post-status", state);
      }
    }

    function classification() {
      if (typeof classificationResolver === "function") {
        const value = classificationResolver();
        return value && typeof value === "object" ? value : {};
      }
      return {
        sectorId: sectorInput && sectorInput.value,
        intent: intentInput && intentInput.value,
      };
    }

    function currentDraft() {
      const nexus = classification();
      return normalizeComposerDraft({
        body: draftInput.value,
        audience: audienceInput.value,
        sectorId: nexus.sectorId,
        intent: nexus.intent,
      });
    }

    function sync() {
      const draft = currentDraft();
      submitButton.disabled = !draft.ok;
      return draft.ok;
    }

    async function publish(draft) {
      submitButton.disabled = true;
      setStatus("جارٍ نشر العرض أو الطلب…", "publishing");

      let response;
      try {
        response = await runtime.posts.create(draft);
      } catch (_) {
        response = null;
      }

      if (!response || response.ok !== true) {
        setStatus("تعذر النشر الآن. حاول مرة أخرى.", "error");
        sync();
        return failure("SOCIAL_POST_PUBLISH_FAILED");
      }

      draftInput.value = "";
      const currentSector = sectorInput || null;
      const currentIntent = intentInput || null;
      if (currentSector) currentSector.value = "";
      if (currentIntent) currentIntent.value = "";
      sync();
      setStatus("تم النشر داخل القطاع.", "success");
      postSheet.hidden = true;
      if (typeof postSheet.setAttribute === "function") {
        postSheet.setAttribute("aria-hidden", "true");
      }

      if (typeof onPublished === "function") {
        try {
          await onPublished(response.value);
        } catch (_) {
          // Publication is already authoritative; feed refresh is best-effort presentation only.
        }
      }

      return frozen({ ok: true, code: "SOCIAL_POST_PUBLISHED" });
    }

    async function submit() {
      const normalized = currentDraft();
      if (!normalized.ok) {
        if (normalized.code === "NEXUS_SECTOR_REQUIRED") {
          setStatus("اختر القطاع قبل النشر.", "invalid");
        } else if (normalized.code === "NEXUS_INTENT_REQUIRED") {
          setStatus("حدد هل تعرض أو تحتاج أو تقدم خدمة أو فرصة.", "invalid");
        } else {
          setStatus("أكمل تفاصيل العرض أو الطلب والجمهور.", "invalid");
        }
        sync();
        return failure(normalized.code);
      }

      let publicationResult = null;
      let granted;
      try {
        granted = await auth.requireAuth(
          { name: "CREATE_SOCIAL_POST" },
          async function () {
            publicationResult = await publish(normalized.value);
          }
        );
      } catch (_) {
        setStatus("تعذر فتح بوابة الدخول الآمنة الآن.", "error");
        sync();
        return failure("SOCIAL_POST_AUTH_FAILED");
      }

      if (!granted) {
        setStatus("سجّل الدخول لإكمال النشر.", "auth-required");
        return failure("SOCIAL_POST_AUTH_REQUIRED");
      }

      return publicationResult || failure("SOCIAL_POST_PUBLISH_FAILED");
    }

    return frozen({ sync, submit });
  }

  function renderInstallFailure(rootObject) {
    const documentObject = rootObject && rootObject.document;
    const statusHost = documentObject && typeof documentObject.querySelector === "function"
      ? documentObject.querySelector("[data-social-post-status]")
      : null;
    if (statusHost) {
      statusHost.textContent = "تعذر تجهيز النشر القطاعي الآن.";
      if (typeof statusHost.setAttribute === "function") {
        statusHost.setAttribute("data-social-post-status", "error");
      }
    }
    return failure("SOCIAL_POST_COMPOSER_BOOT_FAILED");
  }

  function mountCurrentSocialPostComposer(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    if (!documentObject || typeof documentObject.querySelector !== "function") {
      return failure("SOCIAL_POST_COMPOSER_DOCUMENT_UNAVAILABLE");
    }

    const draftInput = documentObject.querySelector("[data-social-post-draft]");
    const audienceInput = documentObject.querySelector("[data-social-post-audience]");
    const submitButton = documentObject.querySelector("[data-social-post-submit]");
    const statusHost = documentObject.querySelector("[data-social-post-status]");
    const postSheet = documentObject.querySelector("[data-social-post-sheet]");
    const runtimeApi = runtimeRoot.TIGERSocialRuntime;
    const auth = runtimeRoot.VVIP_AUTH;
    const wrapRuntime = runtimeRoot.TIGERNexusSocialRuntimeWrap;

    if (!draftInput || !audienceInput || !submitButton || !statusHost || !postSheet) {
      return renderInstallFailure(runtimeRoot);
    }
    if (!runtimeApi || typeof runtimeApi.createCurrentSocialRuntime !== "function") {
      return renderInstallFailure(runtimeRoot);
    }
    if (typeof wrapRuntime !== "function") {
      return renderInstallFailure(runtimeRoot);
    }
    if (!auth || typeof auth.requireAuth !== "function") {
      return renderInstallFailure(runtimeRoot);
    }

    const baseRuntime = runtimeApi.createCurrentSocialRuntime(runtimeRoot);
    const controller = createSocialPostComposer({
      draftInput,
      audienceInput,
      submitButton,
      statusHost,
      sheet: postSheet,
      classificationResolver: function () {
        const sector = documentObject.querySelector("[data-nexus-sector]");
        const intent = documentObject.querySelector("[data-nexus-intent]");
        return {
          sectorId: sector && sector.value,
          intent: intent && intent.value,
        };
      },
      runtime: wrapRuntime(baseRuntime, runtimeRoot.VVIP_SUPABASE),
      auth,
      onPublished: async function () {
        const feed = runtimeRoot.TIGERSocialFeedController;
        if (feed && typeof feed.mountCurrentSocialFeed === "function") {
          await feed.mountCurrentSocialFeed(runtimeRoot);
        }
      },
    });

    const sync = function () { controller.sync(); };
    if (typeof draftInput.addEventListener === "function") {
      draftInput.addEventListener("input", sync);
    }
    if (typeof audienceInput.addEventListener === "function") {
      audienceInput.addEventListener("change", sync);
    }
    if (typeof documentObject.addEventListener === "function") {
      documentObject.addEventListener("change", function (event) {
        const target = event && event.target;
        if (target && typeof target.matches === "function"
            && target.matches("[data-nexus-sector], [data-nexus-intent]")) {
          sync();
        }
      });
    }
    if (typeof submitButton.addEventListener === "function") {
      submitButton.addEventListener("click", function (event) {
        if (event && typeof event.preventDefault === "function") event.preventDefault();
        void controller.submit();
      });
    }

    controller.sync();
    return frozen({ ok: true, controller });
  }

  async function prepareNexusRuntime(runtimeRoot) {
    const [bootstrap, runtimeGuard] = await Promise.all([
      import("../nexus/bootstrap.js"),
      import("../nexus/social-runtime-guard.js")
    ]);
    if (!bootstrap || typeof bootstrap.installNexus !== "function"
        || !runtimeGuard || typeof runtimeGuard.wrapNexusSocialRuntime !== "function") {
      throw new Error("NEXUS_RUNTIME_CONTRACT_MISSING");
    }
    bootstrap.installNexus(runtimeRoot);
    runtimeRoot.TIGERNexusSocialRuntimeWrap = runtimeGuard.wrapNexusSocialRuntime;
  }

  function installCurrentSocialPostComposer(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    if (!documentObject || typeof runtimeRoot.addEventListener !== "function") {
      return frozen({ installed: false });
    }

    let started = false;
    const start = function () {
      if (started) return;
      started = true;

      const mountAfterNexus = async function () {
        await prepareNexusRuntime(runtimeRoot);
        return mountCurrentSocialPostComposer(runtimeRoot);
      };

      const ready = runtimeRoot.VVIPRuntimeReady;
      if (ready && typeof ready.then === "function") {
        ready
          .then(mountAfterNexus)
          .catch(function () { return renderInstallFailure(runtimeRoot); });
        return;
      }

      if (runtimeRoot.VVIP_SUPABASE && runtimeRoot.VVIP_AUTH) {
        void mountAfterNexus().catch(function () { return renderInstallFailure(runtimeRoot); });
        return;
      }

      runtimeRoot.addEventListener("vvip:runtime-ready", function () {
        void mountAfterNexus().catch(function () { return renderInstallFailure(runtimeRoot); });
      }, { once: true });
      runtimeRoot.addEventListener("vvip:runtime-error", function () {
        renderInstallFailure(runtimeRoot);
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
    normalizeComposerDraft,
    createSocialPostComposer,
    mountCurrentSocialPostComposer,
    installCurrentSocialPostComposer,
  });
});
