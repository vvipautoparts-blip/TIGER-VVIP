(function (window, document) {
  "use strict";

  const contract = window.VVIP_PR39_PROFILE_CONTRACT;
  const previewApi = window.VVIP_PR39_PROFILE_PREVIEW;

  function createEditorState(subject) {
    return {
      original: Object.assign({}, subject || {}),
      draft: Object.assign({}, subject || {})
    };
  }

  function collectFormData(form) {
    if (!form) return {};
    const result = {
      displayName: form.querySelector("[name='displayName']") && form.querySelector("[name='displayName']").value,
      publicUsername: form.querySelector("[name='publicUsername']") && form.querySelector("[name='publicUsername']").value,
      publicBio: form.querySelector("[name='publicBio']") && form.querySelector("[name='publicBio']").value,
      publicLocation: form.querySelector("[name='publicLocation']") && form.querySelector("[name='publicLocation']").value,
      avatarUrl: form.querySelector("[name='avatarUrl']") && form.querySelector("[name='avatarUrl']").value,
      coverUrl: form.querySelector("[name='coverUrl']") && form.querySelector("[name='coverUrl']").value
    };
    result.publicUsername = contract.sanitizeUsername(result.publicUsername || "");
    result.avatarUrl = contract.sanitizePublicUrl(result.avatarUrl || "");
    result.coverUrl = contract.sanitizePublicUrl(result.coverUrl || "");
    result.displayName = String(result.displayName || "").replace(/[<>]/g, "").trim().slice(0, 120);
    result.publicBio = String(result.publicBio || "").replace(/[<>]/g, "").trim().slice(0, 220);
    result.publicLocation = String(result.publicLocation || "").replace(/[<>]/g, "").trim().slice(0, 120);
    return result;
  }

  function cancelEdit(state, fallbackSubject) {
    const base = fallbackSubject || state.original || {};
    state.draft = Object.assign({}, base);
    return Object.assign({}, base);
  }

  function saveEdits(state, env, storage) {
    if (!env || env.backendAvailable !== true) {
      const previewResult = previewApi.writeSafeDraft(state.draft, {
        hostname: env && env.hostname || window.location.hostname,
        preview: env && env.preview || ""
      }, storage || window.localStorage);

      return {
        ok: false,
        message: "تم تجهيز التعديلات، لكن الحفظ الرسمي غير متاح في هذه المرحلة.",
        preview: previewResult
      };
    }

    return {
      ok: false,
      message: "تم تعطيل الحفظ الرسمي في PR39 لحماية البيانات حتى اكتمال الربط الخلفي المعتمد."
    };
  }

  function bootstrapPage() {
    const form = document.querySelector("[data-pr39-edit-form]");
    const status = document.querySelector("[data-pr39-edit-status]");
    if (!form || !contract) return;

    const subject = contract.createProfileSubject({
      sessionUser: null,
      subjectUserId: "",
      profileSource: {
        displayName: "مستخدم VVIP",
        publicBio: "نبذة عامة ستظهر بعد التفعيل الرسمي.",
        accountType: "buyer-standard",
        publishingPermission: "none",
        accountStatus: "active"
      }
    });

    const state = createEditorState(subject);

    const writeStatus = function (message) {
      if (status) status.textContent = message;
    };

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      state.draft = collectFormData(form);
      const result = saveEdits(state, {
        backendAvailable: false,
        hostname: window.location.hostname,
        preview: new URLSearchParams(window.location.search).get("preview") || ""
      }, window.localStorage);
      writeStatus(result.message);
    });

    const cancelButton = document.querySelector("[data-pr39-edit-cancel]");
    if (cancelButton) {
      cancelButton.addEventListener("click", function () {
        const restored = cancelEdit(state, subject);
        form.querySelector("[name='displayName']").value = restored.displayName || "";
        form.querySelector("[name='publicUsername']").value = restored.publicUsername || "";
        form.querySelector("[name='publicBio']").value = restored.publicBio || "";
        form.querySelector("[name='publicLocation']").value = restored.publicLocation || "";
        form.querySelector("[name='avatarUrl']").value = restored.avatarUrl || "";
        form.querySelector("[name='coverUrl']").value = restored.coverUrl || "";
        writeStatus("تم إلغاء التعديلات والعودة لآخر حالة مؤكدة.");
      });
    }
  }

  if (document && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", bootstrapPage);
  }

  window.VVIP_PR39_PROFILE_EDITOR = Object.freeze({
    createEditorState: createEditorState,
    collectFormData: collectFormData,
    cancelEdit: cancelEdit,
    saveEdits: saveEdits
  });
}(window, document));
