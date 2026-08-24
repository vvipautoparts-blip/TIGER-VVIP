(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") {
    root.TIGERSocialAccountLifecycleController = api;
    if (root.document && typeof root.addEventListener === "function") {
      api.installCurrentSocialAccountLifecycle(root);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const STATES = new Set(["missing", "active", "deactivated", "deleted"]);

  function frozen(value) {
    return Object.freeze(value);
  }

  function failure(code) {
    return frozen({ ok: false, code });
  }

  function hasIdentityKey(value) {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(hasIdentityKey);
    return Object.entries(value).some(([key, child]) => (
      /subject|clerk|token|session/i.test(key) || hasIdentityKey(child)
    ));
  }

  function normalizeState(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)
        || Object.keys(value).length !== 3
        || !Object.hasOwn(value, "ok")
        || !Object.hasOwn(value, "state")
        || !Object.hasOwn(value, "profile_id")
        || value.ok !== true
        || !STATES.has(value.state)
        || (value.state === "missing" ? value.profile_id !== null : !UUID_PATTERN.test(value.profile_id))
        || hasIdentityKey(value)) {
      return null;
    }
    return frozen({ state: value.state, profileId: value.profile_id });
  }

  function normalizeMutation(value, expectedState, expectedStatus) {
    if (!value || typeof value !== "object" || Array.isArray(value)
        || value.ok !== true || value.status !== expectedStatus
        || !value.profile || typeof value.profile !== "object" || Array.isArray(value.profile)
        || !UUID_PATTERN.test(value.profile.profile_id)
        || value.profile.profile_state !== expectedState
        || hasIdentityKey(value)) {
      return null;
    }
    return frozen({ state: expectedState, profileId: value.profile.profile_id });
  }

  function createAccountLifecycleController(options) {
    const documentObject = options && options.document;
    const status = options && options.status;
    const actions = options && options.actions;
    const runtime = options && options.runtime;
    const clerk = options && options.clerk;
    const confirmDeactivate = options && typeof options.confirmDeactivate === "function"
      ? options.confirmDeactivate
      : function () { return false; };

    if (!documentObject || typeof documentObject.createElement !== "function") {
      throw new TypeError("SOCIAL_ACCOUNT_DOCUMENT_REQUIRED");
    }
    if (!status || !actions || typeof actions.replaceChildren !== "function") {
      throw new TypeError("SOCIAL_ACCOUNT_NODES_REQUIRED");
    }
    if (!runtime || !runtime.accountLifecycle
        || typeof runtime.accountLifecycle.state !== "function"
        || typeof runtime.accountLifecycle.deactivate !== "function"
        || typeof runtime.accountLifecycle.reactivate !== "function") {
      throw new TypeError("SOCIAL_ACCOUNT_RUNTIME_REQUIRED");
    }

    let state = null;
    let busy = false;

    function button(label, action, marker) {
      const control = documentObject.createElement("button");
      control.type = "button";
      control.className = "button button--quiet";
      control.setAttribute(marker, "");
      control.textContent = label;
      control.addEventListener("click", function () { void action(); });
      return control;
    }

    function render(next) {
      state = next;
      actions.replaceChildren();
      if (next.state === "active") {
        status.textContent = "حسابك الاجتماعي نشط.";
        actions.replaceChildren(button(
          "تعطيل الحساب مؤقتًا", deactivate, "data-social-account-deactivate"
        ));
      } else if (next.state === "deactivated") {
        status.textContent = "حسابك الاجتماعي معطّل مؤقتًا ومخفي عن الآخرين.";
        actions.replaceChildren(button(
          "إعادة تنشيط الحساب", reactivate, "data-social-account-reactivate"
        ));
      } else if (next.state === "deleted") {
        status.textContent = "هذا الحساب الاجتماعي محذوف نهائيًا ولا يمكن إعادة تنشيطه.";
      } else {
        status.textContent = "لم يكتمل إنشاء ملفك الاجتماعي بعد.";
      }
    }

    function renderFailure(message) {
      state = null;
      actions.replaceChildren();
      status.textContent = message;
      status.setAttribute("role", "alert");
    }

    async function load() {
      if (busy) return failure("SOCIAL_ACCOUNT_BUSY");
      busy = true;
      try {
        const response = await runtime.accountLifecycle.state();
        const normalized = response && response.ok === true
          ? normalizeState(response.value)
          : null;
        if (!normalized) {
          renderFailure("تعذر التحقق من حالة الحساب بأمان.");
          return failure("SOCIAL_ACCOUNT_STATE_FAILED");
        }
        render(normalized);
        return frozen({ ok: true, state: normalized.state });
      } catch (_) {
        renderFailure("تعذر التحقق من حالة الحساب بأمان.");
        return failure("SOCIAL_ACCOUNT_STATE_FAILED");
      } finally {
        busy = false;
      }
    }

    async function deactivate() {
      if (busy || !state || state.state !== "active") return failure("SOCIAL_ACCOUNT_ACTION_DENIED");
      if (!confirmDeactivate()) return failure("SOCIAL_ACCOUNT_DEACTIVATION_CANCELLED");
      busy = true;
      try {
        const response = await runtime.accountLifecycle.deactivate();
        const normalized = response && response.ok === true
          ? normalizeMutation(response.value, "deactivated", "profile_deactivated")
          : null;
        if (!normalized) {
          renderFailure("تعذر تعطيل الحساب الآن.");
          return failure("SOCIAL_ACCOUNT_DEACTIVATION_FAILED");
        }
        render(normalized);
        if (!clerk || typeof clerk.signOut !== "function") {
          return failure("SOCIAL_ACCOUNT_SESSION_CLOSE_FAILED");
        }
        await clerk.signOut();
        return frozen({ ok: true, state: "deactivated" });
      } catch (_) {
        renderFailure("تم رفض العملية أو تعذر إغلاق الجلسة بأمان.");
        return failure("SOCIAL_ACCOUNT_DEACTIVATION_FAILED");
      } finally {
        busy = false;
      }
    }

    async function reactivate() {
      if (busy || !state || state.state !== "deactivated") return failure("SOCIAL_ACCOUNT_ACTION_DENIED");
      busy = true;
      try {
        const response = await runtime.accountLifecycle.reactivate();
        const normalized = response && response.ok === true
          ? normalizeMutation(response.value, "active", "profile_active")
          : null;
        if (!normalized) {
          renderFailure("تعذر إعادة تنشيط الحساب الآن.");
          return failure("SOCIAL_ACCOUNT_REACTIVATION_FAILED");
        }
        render(normalized);
        return frozen({ ok: true, state: "active" });
      } catch (_) {
        renderFailure("تعذر إعادة تنشيط الحساب الآن.");
        return failure("SOCIAL_ACCOUNT_REACTIVATION_FAILED");
      } finally {
        busy = false;
      }
    }

    return frozen({ load, deactivate, reactivate });
  }

  function mountCurrentSocialAccountLifecycle(rootObject) {
    const runtimeRoot = rootObject || (typeof globalThis !== "undefined" ? globalThis : null);
    const documentObject = runtimeRoot && runtimeRoot.document;
    const runtimeApi = runtimeRoot && runtimeRoot.TIGERSocialRuntime;
    if (!documentObject || !runtimeApi || typeof runtimeApi.createCurrentSocialRuntime !== "function") return null;
    const status = documentObject.querySelector("[data-social-account-lifecycle-status]");
    const actions = documentObject.querySelector("[data-social-account-lifecycle-actions]");
    if (!status || !actions) return null;
    const controller = createAccountLifecycleController({
      document: documentObject,
      status,
      actions,
      runtime: runtimeApi.createCurrentSocialRuntime(runtimeRoot),
      clerk: runtimeRoot.Clerk,
      confirmDeactivate: function () {
        return typeof runtimeRoot.confirm === "function"
          ? runtimeRoot.confirm("سيُخفى ملفك ومحتواك عن الآخرين وستُغلق جلستك. يمكنك إعادة التنشيط بعد تسجيل الدخول مجددًا.")
          : false;
      },
    });
    runtimeRoot.TIGERSocialAccountLifecycleCurrent = controller;
    return controller;
  }

  function installCurrentSocialAccountLifecycle(rootObject) {
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
        ready.then(function () { mountCurrentSocialAccountLifecycle(runtimeRoot); }).catch(function () {});
      } else if (runtimeRoot.VVIP_SUPABASE) {
        mountCurrentSocialAccountLifecycle(runtimeRoot);
      } else {
        runtimeRoot.addEventListener("vvip:runtime-ready", function () {
          mountCurrentSocialAccountLifecycle(runtimeRoot);
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
    createAccountLifecycleController,
    mountCurrentSocialAccountLifecycle,
    installCurrentSocialAccountLifecycle,
  });
});
