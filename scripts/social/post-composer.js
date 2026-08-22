(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialPostComposer = api;
    if (root.document && typeof root.addEventListener === "function") {
      api.installCurrentSocialPostComposer(root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const AUDIENCES = new Set(["public", "friends", "only_me"]);
  const MAX_BODY_LENGTH = 5000;

  function frozen(value) {
    return Object.freeze(value);
  }

  function failure(code) {
    return frozen({ ok: false, code });
  }

  function normalizeComposerDraft(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return failure("SOCIAL_POST_INVALID_DRAFT");
    }
    if (typeof input.body !== "string") {
      return failure("SOCIAL_POST_INVALID_BODY");
    }

    const body = input.body.trim();
    if (!body || body.length > MAX_BODY_LENGTH) {
      return failure("SOCIAL_POST_INVALID_BODY");
    }
    if (!AUDIENCES.has(input.audience)) {
      return failure("SOCIAL_POST_INVALID_AUDIENCE");
    }

    return frozen({
      ok: true,
      value: frozen({ body, audience: input.audience }),
    });
  }

  function createSocialPostComposer(options) {
    const draftInput = options && options.draftInput;
    const audienceInput = options && options.audienceInput;
    const submitButton = options && options.submitButton;
    const statusHost = options && options.statusHost;
    const postSheet = options && options.sheet;
    const runtime = options && options.runtime;
    const auth = options && options.auth;
    const onPublished = options && options.onPublished;
    const dualLaneCommit = options && options.dualLaneCommit;
    const authorityProvider = options && options.authorityProvider;

    if (!draftInput || !audienceInput || !submitButton || !statusHost || !postSheet) {
      throw new TypeError("SOCIAL_POST_COMPOSER_SURFACE_REQUIRED");
    }
    if (!runtime || !runtime.posts || typeof runtime.posts.create !== "function") {
      throw new TypeError("SOCIAL_POST_RUNTIME_REQUIRED");
    }
    if (!auth || typeof auth.requireAuth !== "function") {
      throw new TypeError("SOCIAL_POST_AUTH_REQUIRED");
    }
    if (dualLaneCommit && typeof dualLaneCommit.commit !== "function") {
      throw new TypeError("ONE_FIELD_DUAL_LANE_COMMIT_INVALID");
    }
    if (dualLaneCommit && typeof authorityProvider !== "function") {
      throw new TypeError("ONE_FIELD_AUTHORITY_PROVIDER_REQUIRED");
    }

    function setStatus(message, state) {
      statusHost.textContent = message;
      if (typeof statusHost.setAttribute === "function") {
        statusHost.setAttribute("data-social-post-status", state);
      }
    }

    function currentDraft() {
      return normalizeComposerDraft({
        body: draftInput.value,
        audience: audienceInput.value,
      });
    }

    function sync() {
      const draft = currentDraft();
      submitButton.disabled = !draft.ok;
      return draft.ok;
    }

    async function publish(draft) {
      submitButton.disabled = true;
      setStatus("جارٍ نشر المنشور…", "publishing");

      let response;
      try {
        if (dualLaneCommit) {
          const authority = await authorityProvider();
          const committed = await dualLaneCommit.commit({ draft, authority });
          response = committed && committed.ok === true
            ? frozen({ ok: true, value: committed.publication || null })
            : committed;
        } else {
          response = await runtime.posts.create(draft);
        }
      } catch (_) {
        response = null;
      }

      if (!response || response.ok !== true) {
        setStatus("تعذر نشر المنشور الآن. حاول مرة أخرى.", "error");
        sync();
        return failure((response && response.code) || "SOCIAL_POST_PUBLISH_FAILED");
      }

      draftInput.value = "";
      sync();
      setStatus("تم نشر المنشور.", "success");
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
        setStatus("اكتب منشورًا صالحًا واختر الجمهور.", "invalid");
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
        setStatus("سجّل الدخول لإكمال نشر المنشور.", "auth-required");
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
      statusHost.textContent = "تعذر تجهيز نشر المنشور الآن.";
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

    if (!draftInput || !audienceInput || !submitButton || !statusHost || !postSheet) {
      return renderInstallFailure(runtimeRoot);
    }
    if (!runtimeApi || typeof runtimeApi.createCurrentSocialRuntime !== "function") {
      return renderInstallFailure(runtimeRoot);
    }
    if (!auth || typeof auth.requireAuth !== "function") {
      return renderInstallFailure(runtimeRoot);
    }

    const runtime = runtimeApi.createCurrentSocialRuntime(runtimeRoot);
    const oneField = runtimeRoot.TIGEROneFieldPostCommit;
    const oneFieldBridge = runtimeRoot.TIGEROneFieldComposerBridge;
    let dualLaneCommit = null;
    let authorityProvider = null;

    if (oneField && typeof oneField.createDualLanePostCommit === "function" && oneFieldBridge) {
      if (
        typeof oneFieldBridge.authorize === "function" &&
        typeof oneFieldBridge.enrich === "function" &&
        typeof oneFieldBridge.authority === "function"
      ) {
        dualLaneCommit = oneField.createDualLanePostCommit({
          authorize: oneFieldBridge.authorize,
          enrich: oneFieldBridge.enrich,
          publish: function (draft) { return runtime.posts.create(draft); },
        });
        authorityProvider = oneFieldBridge.authority;
      }
    }

    const controller = createSocialPostComposer({
      draftInput,
      audienceInput,
      submitButton,
      statusHost,
      sheet: postSheet,
      runtime,
      auth,
      dualLaneCommit,
      authorityProvider,
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
    if (typeof submitButton.addEventListener === "function") {
      submitButton.addEventListener("click", function (event) {
        if (event && typeof event.preventDefault === "function") event.preventDefault();
        void controller.submit();
      });
    }

    controller.sync();
    return frozen({ ok: true, controller });
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

      const ready = runtimeRoot.VVIPRuntimeReady;
      if (ready && typeof ready.then === "function") {
        ready
          .then(function () { return mountCurrentSocialPostComposer(runtimeRoot); })
          .catch(function () { return renderInstallFailure(runtimeRoot); });
        return;
      }

      if (runtimeRoot.VVIP_SUPABASE && runtimeRoot.VVIP_AUTH) {
        mountCurrentSocialPostComposer(runtimeRoot);
        return;
      }

      runtimeRoot.addEventListener("vvip:runtime-ready", function () {
        mountCurrentSocialPostComposer(runtimeRoot);
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
