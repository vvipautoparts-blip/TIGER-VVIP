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

  const STORAGE_ERROR_TEXT = Object.freeze({
    ar: {
      read_failed: "تعذر قراءة المسودة المحلية على هذا الجهاز.",
      write_failed: "تعذر حفظ المسودة محليًا على هذا الجهاز.",
      remove_failed: "تعذر إزالة المسودة المحلية على هذا الجهاز.",
      unknown: "تعذر الوصول إلى التخزين المحلي على هذا الجهاز."
    },
    en: {
      read_failed: "Unable to read the local draft on this device.",
      write_failed: "Unable to save the local draft on this device.",
      remove_failed: "Unable to remove the local draft on this device.",
      unknown: "Unable to access local storage on this device."
    }
  });

  function getTypesApi() {
    return window.VVIP_PR38_ACCOUNT_TYPES || null;
  }

  function normalizeLang(lang) {
    return String(lang || "ar").toLowerCase().startsWith("en") ? "en" : "ar";
  }

  function getStorageErrorMessage(code, lang) {
    const language = normalizeLang(lang);
    const group = STORAGE_ERROR_TEXT[language] || STORAGE_ERROR_TEXT.ar;
    return group[code] || group.unknown;
  }

  function safeStorageGetItem(storage, key) {
    if (!storage || typeof storage.getItem !== "function") {
      return { ok: false, value: null, error: "read_failed" };
    }

    try {
      return { ok: true, value: storage.getItem(key), error: null };
    } catch (error) {
      return { ok: false, value: null, error: "read_failed" };
    }
  }

  function safeStorageSetItem(storage, key, value) {
    if (!storage || typeof storage.setItem !== "function") {
      return { ok: false, error: "write_failed" };
    }

    try {
      storage.setItem(key, value);
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: "write_failed" };
    }
  }

  function safeStorageRemoveItem(storage, key) {
    if (!storage || typeof storage.removeItem !== "function") {
      return { ok: false, error: "remove_failed" };
    }

    try {
      storage.removeItem(key);
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: "remove_failed" };
    }
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

  function readDraftResultFromStorage(storage) {
    const rawResult = safeStorageGetItem(storage, DRAFT_STORAGE_KEY);
    if (!rawResult.ok) {
      return { draft: null, error: rawResult.error };
    }

    const raw = rawResult.value;
    if (!raw) return { draft: null, error: null };

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      safeStorageRemoveItem(storage, DRAFT_STORAGE_KEY);
      return { draft: null, error: null };
    }

    const sanitized = sanitizeDraftPayload(parsed);
    if (!sanitized) {
      safeStorageRemoveItem(storage, DRAFT_STORAGE_KEY);
      return { draft: null, error: null };
    }

    return { draft: sanitized, error: null };
  }

  function readDraftFromStorage(storage) {
    return readDraftResultFromStorage(storage).draft;
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
    const draftResult = readDraftResultFromStorage(safeStorage);

    if (draftResult.error) {
      statusNode.textContent = getStorageErrorMessage(draftResult.error, lang);
      return;
    }

    statusNode.textContent = getStatusLabelFromDraft(draftResult.draft, lang);
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
    getStorageErrorMessage: getStorageErrorMessage,
    safeStorageGetItem: safeStorageGetItem,
    safeStorageSetItem: safeStorageSetItem,
    safeStorageRemoveItem: safeStorageRemoveItem,
    readDraftResultFromStorage: readDraftResultFromStorage,
    readDraftFromStorage: readDraftFromStorage,
    getStatusLabelFromDraft: getStatusLabelFromDraft,
    applyProfileDraftStatus: applyProfileDraftStatus
  });
}(window));
