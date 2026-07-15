(function (window, document) {
  "use strict";

  const HOME_PATH = "index.html";
  const PROFILE_PATH = "private-profile-p03.html";
  const SAFE_RETURN_PATHS = new Set([HOME_PATH, PROFILE_PATH]);

  const SELECTORS = Object.freeze({
    chooseStep: "[data-pr38-step='choose']",
    reviewStep: "[data-pr38-step='review']",
    successStep: "[data-pr38-step='success']",
    message: "[data-pr38-live-message]",
    typesGrid: "[data-pr38-types-grid]",
    continueButton: "[data-pr38-continue]",
    backButton: "[data-pr38-back]",
    saveDraftButton: "[data-pr38-save-draft]",
    cancelButtons: "[data-pr38-cancel]",
    homeButton: "[data-pr38-go-home]",
    reviewName: "[data-pr38-review-name]",
    reviewDescription: "[data-pr38-review-description]",
    reviewPermission: "[data-pr38-review-permission]"
  });

  const ui = {
    chooseStep: null,
    reviewStep: null,
    successStep: null,
    message: null,
    typesGrid: null,
    continueButton: null,
    backButton: null,
    saveDraftButton: null,
    cancelButtons: [],
    homeButton: null,
    reviewName: null,
    reviewDescription: null,
    reviewPermission: null
  };

  const state = {
    selectedId: "",
    lang: "ar"
  };

  function getTypesApi() {
    return window.VVIP_PR38_ACCOUNT_TYPES || null;
  }

  function getSummaryApi() {
    return window.VVIP_PR38_ACCOUNT_SUMMARY || null;
  }

  function isLocalPreviewAllowed() {
    const params = new URLSearchParams(window.location.search || "");
    const preview = params.get("preview");
    const host = window.location.hostname;
    const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]" || host === "0.0.0.0";
    return localHost && preview === "onboarding";
  }

  function safeReturnPath() {
    const params = new URLSearchParams(window.location.search || "");
    const candidate = params.get("return_to");
    return SAFE_RETURN_PATHS.has(candidate) ? candidate : PROFILE_PATH;
  }

  function safeRedirect(path) {
    window.location.replace(path || HOME_PATH);
  }

  function setMessage(text) {
    if (!ui.message) return;
    ui.message.textContent = String(text || "");
  }

  function setStep(active) {
    if (ui.chooseStep) ui.chooseStep.hidden = active !== "choose";
    if (ui.reviewStep) ui.reviewStep.hidden = active !== "review";
    if (ui.successStep) ui.successStep.hidden = active !== "success";
  }

  function selectedSummary() {
    const summaryApi = getSummaryApi();
    if (!summaryApi || typeof summaryApi.buildDraftSummary !== "function") return null;
    return summaryApi.buildDraftSummary(state.selectedId, state.lang);
  }

  function refreshContinueButton() {
    if (!ui.continueButton) return;
    const typesApi = getTypesApi();
    const valid = !!(typesApi && typeof typesApi.isValidId === "function" && typesApi.isValidId(state.selectedId));
    ui.continueButton.disabled = !valid;
  }

  function renderReview() {
    const summary = selectedSummary();
    if (!summary) {
      setMessage("تعذر قراءة نوع الحساب المحدد. حاول مرة أخرى.");
      setStep("choose");
      return;
    }

    if (ui.reviewName) ui.reviewName.textContent = summary.name;
    if (ui.reviewDescription) ui.reviewDescription.textContent = summary.description;
    if (ui.reviewPermission) ui.reviewPermission.textContent = "غير مفعلة — " + summary.publishingPermission;
    setStep("review");
  }

  function makeTypeCard(type) {
    const wrapper = document.createElement("label");
    wrapper.className = "pr38-type-option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "pr38-account-type";
    input.value = type.id;
    input.setAttribute("aria-label", type.nameAr);

    const title = document.createElement("span");
    title.className = "pr38-type-option__title";
    title.textContent = type.nameAr;

    const description = document.createElement("span");
    description.className = "pr38-type-option__description";
    description.textContent = type.descriptionAr;

    input.addEventListener("change", function () {
      state.selectedId = type.id;
      refreshContinueButton();
      setMessage("");
    });

    wrapper.appendChild(input);
    wrapper.appendChild(title);
    wrapper.appendChild(description);
    return wrapper;
  }

  function renderTypeOptions() {
    const typesApi = getTypesApi();
    if (!ui.typesGrid || !typesApi || typeof typesApi.getAll !== "function") {
      setMessage("تعذر تحميل أنواع الحسابات حاليًا.");
      return;
    }

    const items = typesApi.getAll();
    items.forEach(function (type) {
      ui.typesGrid.appendChild(makeTypeCard(type));
    });
  }

  function readDraft() {
    const summaryApi = getSummaryApi();
    if (!summaryApi || typeof summaryApi.readDraftFromStorage !== "function") return null;
    return summaryApi.readDraftFromStorage(window.localStorage);
  }

  function saveDraft(accountTypeId) {
    const summaryApi = getSummaryApi();
    if (!summaryApi) return null;
    const payload = summaryApi.createDraftPayload(accountTypeId);
    if (!payload) return null;
    window.localStorage.setItem(summaryApi.storageKey, JSON.stringify(payload));
    return payload;
  }

  function clearDraft() {
    const summaryApi = getSummaryApi();
    if (!summaryApi) return;
    window.localStorage.removeItem(summaryApi.storageKey);
  }

  function cancelOnboarding() {
    safeRedirect(safeReturnPath());
  }

  function completeToHome() {
    safeRedirect(HOME_PATH);
  }

  function restoreExistingDraftSelection() {
    const existing = readDraft();
    if (!existing) return;
    state.selectedId = existing.accountTypeId;
    const node = document.querySelector("input[name='pr38-account-type'][value='" + existing.accountTypeId + "']");
    if (node) node.checked = true;
    refreshContinueButton();
  }

  function bindEvents() {
    if (ui.continueButton) {
      ui.continueButton.addEventListener("click", function () {
        const typesApi = getTypesApi();
        if (!typesApi || !typesApi.isValidId(state.selectedId)) {
          setMessage("اختر نوع حساب صالحًا قبل المتابعة.");
          return;
        }
        renderReview();
      });
    }

    if (ui.backButton) {
      ui.backButton.addEventListener("click", function () {
        setStep("choose");
      });
    }

    if (ui.saveDraftButton) {
      ui.saveDraftButton.addEventListener("click", function () {
        const saved = saveDraft(state.selectedId);
        if (!saved) {
          setMessage("تعذر حفظ المسودة محليًا. تأكد من اختيار نوع الحساب.");
          return;
        }
        setMessage("تم حفظ اختيار نوع الحساب كمسودة على هذا الجهاز، ولم يتم تفعيله رسميًا بعد.");
        setStep("success");
      });
    }

    ui.cancelButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        cancelOnboarding();
      });
    });

    if (ui.homeButton) {
      ui.homeButton.addEventListener("click", function () {
        completeToHome();
      });
    }

    document.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" || event.key === " ") && document.activeElement && document.activeElement.matches("label.pr38-type-option")) {
        const radio = document.activeElement.querySelector("input[type='radio']");
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      if (event.key === "Escape") {
        cancelOnboarding();
      }
    });
  }

  async function ensureSessionOrRedirect() {
    if (isLocalPreviewAllowed()) return true;

    try {
      if (!window.Clerk) {
        safeRedirect(HOME_PATH);
        return false;
      }

      await window.Clerk.load();
      if (!window.Clerk.isSignedIn) {
        safeRedirect(HOME_PATH);
        return false;
      }

      return true;
    } catch (error) {
      safeRedirect(HOME_PATH);
      return false;
    }
  }

  function connectDom() {
    ui.chooseStep = document.querySelector(SELECTORS.chooseStep);
    ui.reviewStep = document.querySelector(SELECTORS.reviewStep);
    ui.successStep = document.querySelector(SELECTORS.successStep);
    ui.message = document.querySelector(SELECTORS.message);
    ui.typesGrid = document.querySelector(SELECTORS.typesGrid);
    ui.continueButton = document.querySelector(SELECTORS.continueButton);
    ui.backButton = document.querySelector(SELECTORS.backButton);
    ui.saveDraftButton = document.querySelector(SELECTORS.saveDraftButton);
    ui.cancelButtons = Array.prototype.slice.call(document.querySelectorAll(SELECTORS.cancelButtons));
    ui.homeButton = document.querySelector(SELECTORS.homeButton);
    ui.reviewName = document.querySelector(SELECTORS.reviewName);
    ui.reviewDescription = document.querySelector(SELECTORS.reviewDescription);
    ui.reviewPermission = document.querySelector(SELECTORS.reviewPermission);
  }

  async function bootstrap() {
    state.lang = String(document.documentElement.lang || "ar").toLowerCase();
    connectDom();

    const ok = await ensureSessionOrRedirect();
    if (!ok) return;

    renderTypeOptions();
    restoreExistingDraftSelection();
    refreshContinueButton();
    bindEvents();
    setStep("choose");
  }

  if (document && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", function () {
      void bootstrap();
    });
  }

  window.VVIP_PR38_ONBOARDING = Object.freeze({
    testHooks: Object.freeze({
      storageKey: (window.VVIP_PR38_ACCOUNT_SUMMARY && window.VVIP_PR38_ACCOUNT_SUMMARY.storageKey) || "vvip:p04:account-type-draft:v1",
      sanitizeDraft: function (payload) {
        const summaryApi = getSummaryApi();
        return summaryApi && summaryApi.sanitizeDraftPayload ? summaryApi.sanitizeDraftPayload(payload) : null;
      },
      readDraft: readDraft,
      saveDraft: saveDraft,
      clearDraft: clearDraft,
      cancelOnboarding: cancelOnboarding,
      completeToHome: completeToHome
    })
  });
}(window, document));
