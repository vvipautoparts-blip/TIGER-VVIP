(function (window) {
  "use strict";

  const STORAGE_VERSION = "1";
  const DRAFT_STORAGE_KEY = "vvip:p04:account-type-draft:v1";
  const ALLOWED_KEYS = Object.freeze([
    "version",
    "accountTypeId",
    "publishingPermission",
    "official",
    "updatedAt"
  ]);

  const STATUS_TEXT = Object.freeze({
    ar: {
      unknown: "غير محدد"
    },
    en: {
      unknown: "Not set"
    }
  });

  function getTypesApi() {
    return window.VVIP_PR38_ACCOUNT_TYPES || null;
  }

  function normalizeLang(lang) {
    return String(lang || "ar").toLowerCase().startsWith("en") ? "en" : "ar";
  }

  function knownKeysOnly(value) {
    const keys = Object.keys(value);
    if (keys.length !== ALLOWED_KEYS.length) return false;
    return keys.every(function (key) {
      return ALLOWED_KEYS.indexOf(key) >= 0;
    });
  }

  function sanitizeDraftPayload(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    if (!knownKeysOnly(payload)) return null;

    const typeId = String(payload.accountTypeId || "");
    const api = getTypesApi();
    if (!api || typeof api.isValidId !== "function" || !api.isValidId(typeId)) return null;

    if (String(payload.version || "") !== STORAGE_VERSION) return null;
    if (String(payload.publishingPermission || "") !== "none") return null;
    if (payload.official !== false) return null;

    const updatedAt = String(payload.updatedAt || "");
    if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) return null;

    return Object.freeze({
      version: STORAGE_VERSION,
      accountTypeId: typeId,
      publishingPermission: "none",
      official: false,
      updatedAt: updatedAt
    });
  }

  function createDraftPayload(accountTypeId, nowIso) {
    const api = getTypesApi();
    const typeId = String(accountTypeId || "");
    if (!api || typeof api.isValidId !== "function" || !api.isValidId(typeId)) return null;

    const timestamp = String(nowIso || new Date().toISOString());
    if (Number.isNaN(Date.parse(timestamp))) return null;

    return Object.freeze({
      version: STORAGE_VERSION,
      accountTypeId: typeId,
      publishingPermission: "none",
      official: false,
      updatedAt: timestamp
    });
  }

  function buildDraftSummary(accountTypeId, lang) {
    const api = getTypesApi();
    if (!api || typeof api.getById !== "function") return null;

    const type = api.getById(accountTypeId);
    if (!type) return null;

    const language = normalizeLang(lang);
    return Object.freeze({
      accountTypeId: type.id,
      name: language === "en" ? type.nameEn : type.nameAr,
      description: language === "en" ? type.descriptionEn : type.descriptionAr,
      publishingPermission: "none",
      official: false
    });
  }

  function readDraftFromStorage(storage) {
    if (!storage || typeof storage.getItem !== "function") return null;

    const raw = storage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      storage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }

    const sanitized = sanitizeDraftPayload(parsed);
    if (!sanitized) {
      storage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }

    return sanitized;
  }

  function getStatusLabelFromDraft(draft, lang) {
    const language = normalizeLang(lang);
    if (!draft) return STATUS_TEXT[language].unknown;
    const summary = buildDraftSummary(draft.accountTypeId, language);
    return summary ? summary.name : STATUS_TEXT[language].unknown;
  }

  function applyProfileDraftStatus(root, storage) {
    const scope = root && typeof root.querySelector === "function" ? root : document;
    const statusNode = scope.querySelector("[data-pr38-account-type-status]");
    if (!statusNode) return;

    const lang = normalizeLang(scope.documentElement && scope.documentElement.lang || "ar");
    const safeStorage = storage || window.localStorage;
    const draft = readDraftFromStorage(safeStorage);
    statusNode.textContent = getStatusLabelFromDraft(draft, lang);
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      applyProfileDraftStatus(document, window.localStorage);
    });
  }

  window.VVIP_PR38_ACCOUNT_SUMMARY = Object.freeze({
    storageKey: DRAFT_STORAGE_KEY,
    sanitizeDraftPayload: sanitizeDraftPayload,
    createDraftPayload: createDraftPayload,
    buildDraftSummary: buildDraftSummary,
    readDraftFromStorage: readDraftFromStorage,
    getStatusLabelFromDraft: getStatusLabelFromDraft,
    applyProfileDraftStatus: applyProfileDraftStatus
  });
}(window));
