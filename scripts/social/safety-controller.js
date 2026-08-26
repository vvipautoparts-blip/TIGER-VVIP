(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGERSocialSafety = api;
    if (root.document && typeof root.addEventListener === "function") {
      api.installCurrentSocialSafety(root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const TARGET_KINDS = new Set(["profile", "post"]);
  const REPORT_REASONS = new Set([
    "spam",
    "harassment",
    "hate",
    "violence",
    "nudity",
    "fraud",
    "other",
  ]);
  const REPORT_INTENT = Object.freeze({ name: "SOCIAL_REPORT_SUBMIT" });

  function frozen(value) {
    return Object.freeze(value);
  }

  function failure(code) {
    return frozen({ ok: false, code });
  }

  function validUuid(value) {
    return typeof value === "string" && UUID_PATTERN.test(value);
  }

  function createSafetyController(options) {
    const documentObject = options && options.document;
    const layer = options && options.layer;
    const form = options && options.form;
    const reason = options && options.reason;
    const details = options && options.details;
    const submitButton = options && options.submitButton;
    const status = options && options.status;
    const runtime = options && options.runtime;
    const auth = options && options.auth;

    if (!documentObject || typeof documentObject.createElement !== "function") {
      throw new TypeError("SOCIAL_SAFETY_DOCUMENT_REQUIRED");
    }
    if (!layer || !form || !reason || !details || !submitButton || !status) {
      throw new TypeError("SOCIAL_SAFETY_NODES_REQUIRED");
    }
    if (!runtime || !runtime.safety
        || typeof runtime.safety.reportProfile !== "function"
        || typeof runtime.safety.reportPost !== "function") {
      throw new TypeError("SOCIAL_SAFETY_RUNTIME_REQUIRED");
    }
    if (!auth || typeof auth.requireAuth !== "function") {
      throw new TypeError("SOCIAL_SAFETY_AUTH_REQUIRED");
    }

    let target = null;

    function openReport(kind, id) {
      if (!TARGET_KINDS.has(kind) || !validUuid(id)) return false;
      target = frozen({ kind, id });
      reason.value = "";
      details.value = "";
      status.textContent = "";
      layer.hidden = false;
      layer.setAttribute("aria-hidden", "false");
      if (typeof reason.focus === "function") reason.focus();
      return true;
    }

    function closeReport() {
      target = null;
      layer.hidden = true;
      layer.setAttribute("aria-hidden", "true");
      reason.value = "";
      details.value = "";
      return true;
    }

    async function submitReport() {
      if (!target) return failure("SOCIAL_REPORT_TARGET_REQUIRED");
      if (!REPORT_REASONS.has(reason.value)) {
        status.textContent = "اختر سببًا صالحًا للبلاغ.";
        return failure("SOCIAL_INVALID_REPORT_REASON");
      }
      const detailText = typeof details.value === "string" ? details.value.trim() : "";
      if (detailText.length > 1000) {
        status.textContent = "تفاصيل البلاغ أطول من الحد المسموح.";
        return failure("SOCIAL_INVALID_REPORT_DETAILS");
      }

      const selected = target;
      const input = { reason: reason.value, details: detailText || null };
      let operationResult = null;
      let granted = false;
      submitButton.disabled = true;
      status.textContent = "جارٍ إرسال البلاغ…";
      try {
        granted = await auth.requireAuth(REPORT_INTENT, async function () {
          operationResult = selected.kind === "profile"
            ? await runtime.safety.reportProfile(selected.id, input)
            : await runtime.safety.reportPost(selected.id, input);
          return operationResult;
        });
      } catch (_) {
        operationResult = null;
      }
      submitButton.disabled = false;

      if (!granted || !operationResult || operationResult.ok !== true) {
        status.textContent = "تعذر إرسال البلاغ الآن. حاول مرة أخرى لاحقًا.";
        return failure("SOCIAL_REPORT_SUBMIT_FAILED");
      }

      status.textContent = "تم استلام البلاغ بأمان.";
      closeReport();
      status.textContent = "تم استلام البلاغ بأمان.";
      return frozen({ ok: true, code: "SOCIAL_REPORT_RECEIVED" });
    }

    return frozen({ openReport, closeReport, submitReport });
  }

  function mountCurrentSocialSafety(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    const runtimeApi = runtimeRoot && runtimeRoot.TIGERSocialRuntime;
    const auth = runtimeRoot && runtimeRoot.VVIP_AUTH;
    if (!documentObject || !runtimeApi || typeof runtimeApi.createCurrentSocialRuntime !== "function" || !auth) {
      return null;
    }

    const query = (selector) => documentObject.querySelector(selector);
    const controller = createSafetyController({
      document: documentObject,
      layer: query("[data-social-report-sheet]"),
      form: query("[data-social-report-form]"),
      reason: query("[data-social-report-reason]"),
      details: query("[data-social-report-details]"),
      submitButton: query("[data-social-report-submit]"),
      status: query("[data-social-report-status]"),
      runtime: runtimeApi.createCurrentSocialRuntime(runtimeRoot),
      auth,
    });

    documentObject.addEventListener("click", function (event) {
      const targetNode = event && event.target;
      const postButton = targetNode && typeof targetNode.closest === "function"
        ? targetNode.closest("[data-social-report-post]")
        : null;
      if (postButton) {
        const article = postButton.closest("[data-social-post-id]");
        const postId = article && article.getAttribute("data-social-post-id");
        if (controller.openReport("post", postId) && event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }
        return;
      }
      if (targetNode && typeof targetNode.closest === "function"
          && targetNode.closest("[data-social-report-close]")) {
        if (event && typeof event.preventDefault === "function") event.preventDefault();
        controller.closeReport();
      }
    });

    query("[data-social-report-form]")?.addEventListener("submit", function (event) {
      event.preventDefault();
      void controller.submitReport();
    });

    runtimeRoot.TIGERSocialSafetyCurrent = controller;
    return controller;
  }

  function installCurrentSocialSafety(rootObject) {
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
        ready.then(function () { mountCurrentSocialSafety(runtimeRoot); }).catch(function () {});
      } else if (runtimeRoot.VVIP_SUPABASE) {
        mountCurrentSocialSafety(runtimeRoot);
      } else {
        runtimeRoot.addEventListener("vvip:runtime-ready", function () {
          mountCurrentSocialSafety(runtimeRoot);
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
    REPORT_REASONS: frozen(Array.from(REPORT_REASONS)),
    createSafetyController,
    mountCurrentSocialSafety,
    installCurrentSocialSafety,
  });
});
