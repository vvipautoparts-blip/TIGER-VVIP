(function () {
  "use strict";

  const SECTORS = Object.freeze({
    automotive: "قطع وخدمات السيارات",
    materials: "مواد ولوازم",
    "real-estate": "عقارات"
  });
  const SECTOR_FIELDS = Object.freeze({
    automotive: ["autoType", "autoCondition", "autoCompatibility", "autoWarranty"],
    materials: ["materialType", "materialQuantity", "materialAvailability", "materialDelivery"],
    "real-estate": ["estateType", "estateArea", "estateRooms", "estateOffer"]
  });
  const FIELD_MESSAGES = Object.freeze({
    sector: "اختر قطاع الإعلان.",
    title: "اكتب اسم الإعلان بوضوح.",
    price: "أدخل سعرًا صحيحًا أكبر من صفر.",
    location: "حدد المدينة أو المنطقة.",
    summary: "أضف وصفًا مختصرًا يساعد المستخدمين على فهم الإعلان."
  });
  const FUTURE_PUBLISH_MESSAGE =
    "النشر الحقيقي سيتم تفعيله لاحقًا بعد ربط قاعدة البيانات والمراجعة.";

  let readinessLayer = null;
  let readinessPanel = null;
  let lastFocusedElement = null;

  function normalizeValidationInput(value) {
    return String(value == null ? "" : value)
      .replace(/<[^>]*>/g, " ")
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function validateRequiredText(value, fieldName) {
    const normalized = normalizeValidationInput(value);
    return {
      valid: Boolean(normalized),
      value: normalized,
      message: normalized ? "" : (FIELD_MESSAGES[fieldName] || "أكمل هذا الحقل.")
    };
  }

  function validateSector(value) {
    const normalized = normalizeValidationInput(value);
    const key = Object.prototype.hasOwnProperty.call(SECTORS, normalized)
      ? normalized
      : Object.keys(SECTORS).find(function (sector) {
        return SECTORS[sector] === normalized;
      }) || "";
    return { valid: Boolean(key), value: key, message: key ? "" : FIELD_MESSAGES.sector };
  }

  function normalizeNumericInput(value) {
    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    return String(value == null ? "" : value)
      .replace(/[٠-٩]/g, function (digit) { return arabicDigits.indexOf(digit); })
      .replace(/[۰-۹]/g, function (digit) { return persianDigits.indexOf(digit); })
      .replace(/[٬,\s]/g, "")
      .replace(/٫/g, ".")
      .trim();
  }

  function validatePrice(value) {
    const normalized = normalizeNumericInput(value);
    const formatValid = /^\d+(?:\.\d{1,2})?$/.test(normalized);
    const price = formatValid ? Number(normalized) : NaN;
    const valid = Number.isFinite(price) && price > 0 && price <= 999999999999.99;
    return { valid: valid, value: valid ? price : null, message: valid ? "" : FIELD_MESSAGES.price };
  }

  function validateLocation(value) {
    const required = validateRequiredText(value, "location");
    const valid = required.valid && required.value.length <= 60;
    return { valid: valid, value: required.value.slice(0, 60), message: valid ? "" : FIELD_MESSAGES.location };
  }

  function validateSummary(value) {
    const normalized = normalizeValidationInput(value);
    if (normalized.length > 280) {
      return { valid: false, value: normalized.slice(0, 280), severity: "blocker", message: FIELD_MESSAGES.summary };
    }
    if (normalized.length < 10) {
      return { valid: true, value: normalized, severity: "warning", message: FIELD_MESSAGES.summary };
    }
    return { valid: true, value: normalized, severity: "none", message: "" };
  }

  function validateTitle(value) {
    const normalized = normalizeValidationInput(value);
    const valid = normalized.length >= 2 && normalized.length <= 80;
    return { valid: valid, value: normalized.slice(0, 80), message: valid ? "" : FIELD_MESSAGES.title };
  }

  function sanitizeSpecs(value) {
    return normalizeValidationInput(value)
      .split(/[،,]/)
      .map(function (item) { return normalizeValidationInput(item).slice(0, 80); })
      .filter(Boolean)
      .slice(0, 10)
      .join("، ");
  }

  function validateListingDraft(draft) {
    const input = draft && typeof draft === "object" ? draft : {};
    const sector = validateSector(input.sector);
    const title = validateTitle(input.title);
    const price = validatePrice(input.price);
    const location = validateLocation(input.location);
    const summary = validateSummary(input.summary);
    const errors = {};
    const missing = [];
    const warnings = [];

    [
      ["sector", sector],
      ["title", title],
      ["price", price],
      ["location", location]
    ].forEach(function (entry) {
      if (!entry[1].valid) {
        missing.push(entry[0]);
        errors[entry[0]] = entry[1].message;
      }
    });
    if (!summary.valid) {
      errors.summary = summary.message;
      missing.push("summary");
    } else if (summary.severity === "warning") {
      warnings.push("summary");
    }

    const sourceFields = input.sectorDetails && typeof input.sectorDetails === "object"
      ? input.sectorDetails
      : input.sectorFields && typeof input.sectorFields === "object"
        ? input.sectorFields
        : {};
    const sectorFields = {};
    (SECTOR_FIELDS[sector.value] || []).forEach(function (name) {
      sectorFields[name] = normalizeValidationInput(sourceFields[name]).slice(0, 140);
    });
    if (sector.value && !Object.keys(sectorFields).some(function (name) { return sectorFields[name]; })) {
      warnings.push("sectorDetails");
    }

    const photoCount = Math.max(0, Math.min(100, Number(
      input.photoCount == null ? input.selectedLocalPhotoCount : input.photoCount
    ) || 0));
    if (!photoCount) warnings.push("photos");

    return {
      ready: missing.length === 0,
      score: Math.max(0, 100 - (missing.length * 25)),
      missing: missing,
      warnings: warnings,
      blockers: missing.slice(),
      nextAction: missing.length ? "رجوع للتعديل" : "جاهز للمراجعة",
      errors: errors,
      draft: {
        sector: sector.value,
        title: title.value,
        price: price.value,
        location: location.value,
        summary: summary.value,
        specs: sanitizeSpecs(input.specs),
        sectorDetails: sectorFields,
        selectedLocalPhotoCount: photoCount
      }
    };
  }

  function getListingReadiness(draft) {
    const validation = validateListingDraft(draft);
    return {
      ready: validation.ready,
      score: validation.score,
      missing: validation.missing,
      warnings: validation.warnings,
      blockers: validation.blockers,
      nextAction: validation.nextAction
    };
  }

  function shellRoot() {
    return document.querySelector("[data-vvip-create-listing-shell]");
  }

  function setFieldError(fieldName, message) {
    const root = shellRoot();
    if (!root) return;
    const error = root.querySelector('[data-vvip-validation-error="' + fieldName + '"]');
    if (error) {
      error.textContent = message || "";
      error.hidden = !message;
    }
    const input = root.querySelector('[name="' + fieldName + '"]');
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    if (fieldName === "sector") {
      root.querySelectorAll("[data-create-sector]").forEach(function (button) {
        button.setAttribute("aria-invalid", message ? "true" : "false");
      });
    }
  }

  function setFieldWarning(fieldName, message) {
    const root = shellRoot();
    if (!root) return;
    const warning = root.querySelector('[data-vvip-validation-warning="' + fieldName + '"]');
    if (warning) {
      warning.textContent = message || "";
      warning.hidden = !message;
    }
  }

  function clearValidationErrors() {
    const root = shellRoot();
    if (!root) return;
    root.querySelectorAll("[data-vvip-validation-error]").forEach(function (node) {
      node.textContent = "";
      node.hidden = true;
    });
    root.querySelectorAll("[data-vvip-validation-warning]").forEach(function (node) {
      node.textContent = "";
      node.hidden = true;
    });
    root.querySelectorAll("[aria-invalid='true']").forEach(function (node) {
      node.setAttribute("aria-invalid", "false");
    });
  }

  function renderValidationErrors(errors) {
    clearValidationErrors();
    Object.keys(errors || {}).forEach(function (name) {
      const message = errors[name];
      setFieldError(name, message);
    });
  }

  function readinessLabel(readiness) {
    return readiness.ready ? "جاهز للمراجعة" : "البيانات الأساسية غير مكتملة";
  }

  function updateReadinessStatus(draft) {
    const readiness = getListingReadiness(draft);
    const root = shellRoot();
    if (!root) return readiness;
    root.querySelectorAll("[data-vvip-readiness-status]").forEach(function (node) {
      node.textContent = readinessLabel(readiness);
      node.dataset.readinessState = readiness.ready ? "ready" : "incomplete";
    });
    root.querySelectorAll("[data-readiness-check]").forEach(function (node) {
      const name = node.dataset.readinessCheck;
      const complete = !readiness.blockers.includes(name);
      node.textContent = (complete ? "✓ " : "• ") + node.dataset.readinessLabel;
      node.dataset.readinessState = complete ? "ready" : "incomplete";
    });
    return readiness;
  }

  function readinessMarkup() {
    return `<div class="vvip-readiness-layer" data-vvip-readiness-sheet aria-hidden="true" hidden>
      <button class="vvip-readiness-backdrop" type="button" tabindex="-1" data-vvip-readiness-close aria-label="إغلاق جاهزية النشر"></button>
      <section class="vvip-readiness-sheet" role="dialog" aria-modal="true" aria-labelledby="vvip-readiness-title" tabindex="-1">
        <button class="vvip-readiness-close" type="button" data-vvip-readiness-close aria-label="إغلاق">×</button>
        <span class="vvip-readiness-kicker">VVIP TIGER</span>
        <h2 id="vvip-readiness-title">جاهزية النشر</h2>
        <strong data-readiness-sheet-status></strong>
        <p data-readiness-sheet-message></p>
        <ul data-readiness-sheet-list></ul>
        <p class="vvip-readiness-privacy">لم يتم إرسال أي بيانات خارج هذا الجهاز في هذه المرحلة.</p>
        <p class="vvip-readiness-disclaimer">VVIP TIGER منصة عرض وتواصل فقط وليست طرفًا في البيع أو الدفع أو التوصيل أو العقود.</p>
        <div class="vvip-readiness-actions"><button type="button" data-vvip-readiness-close>متابعة التعديل</button><button type="button" data-vvip-readiness-close>إغلاق</button></div>
      </section>
    </div>`;
  }

  function buildReadinessSheet() {
    if (readinessLayer || !document.body) return;
    const host = document.createElement("div");
    host.innerHTML = readinessMarkup();
    readinessLayer = host.firstElementChild;
    readinessPanel = readinessLayer.querySelector(".vvip-readiness-sheet");
    document.body.appendChild(readinessLayer);
  }

  function showReadinessSheet(readinessInput) {
    buildReadinessSheet();
    if (!readinessLayer) return false;
    const readiness = readinessInput && typeof readinessInput.ready === "boolean"
      ? readinessInput
      : getListingReadiness(readinessInput || {});
    const status = readinessLayer.querySelector("[data-readiness-sheet-status]");
    const message = readinessLayer.querySelector("[data-readiness-sheet-message]");
    const list = readinessLayer.querySelector("[data-readiness-sheet-list]");
    status.textContent = readinessLabel(readiness);
    status.dataset.readinessState = readiness.ready ? "ready" : "incomplete";
    message.textContent = readiness.ready
      ? "إعلانك جاهز كمسودة محلية. " + FUTURE_PUBLISH_MESSAGE
      : "أكمل البيانات الأساسية التالية، ثم أعد فحص الجاهزية.";
    list.replaceChildren();
    readiness.blockers.forEach(function (name) {
      const item = document.createElement("li");
      item.textContent = FIELD_MESSAGES[name] || "أكمل البيانات المطلوبة.";
      list.appendChild(item);
    });
    lastFocusedElement = document.activeElement;
    readinessLayer.hidden = false;
    readinessLayer.setAttribute("aria-hidden", "false");
    document.body.classList.add("vvip-readiness-open");
    readinessPanel.focus();
    return true;
  }

  function closeReadinessSheet() {
    if (!readinessLayer || readinessLayer.hidden) return;
    readinessLayer.hidden = true;
    readinessLayer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("vvip-readiness-open");
    if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus();
    lastFocusedElement = null;
  }

  function currentDraft() {
    const shell = window.VVIP_PR31_CREATE_LISTING;
    if (shell && typeof shell.currentDraft === "function") {
      const activeDraft = shell.currentDraft();
      if (activeDraft) return activeDraft;
    }
    const drafts = window.VVIP_PR32_DRAFTS;
    if (drafts && typeof drafts.readLocalDraft === "function") {
      const snapshot = drafts.readLocalDraft();
      if (snapshot.status === "ready") return snapshot.draft;
    }
    return {};
  }

  function feedback(message) {
    if (window.VVIP_PR30 && typeof window.VVIP_PR30.showFeedback === "function") {
      window.VVIP_PR30.showFeedback(message);
    }
  }

  function trapFocus(event) {
    if (event.key !== "Tab" || !readinessLayer || readinessLayer.hidden) return;
    const focusable = Array.from(readinessLayer.querySelectorAll("button:not([disabled]), [tabindex='0']"))
      .filter(function (node) { return node.tabIndex >= 0; });
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const api = Object.freeze({
    normalizeValidationInput: normalizeValidationInput,
    validateRequiredText: validateRequiredText,
    validatePrice: validatePrice,
    validateSector: validateSector,
    validateLocation: validateLocation,
    validateSummary: validateSummary,
    validateListingDraft: validateListingDraft,
    getListingReadiness: getListingReadiness,
    renderValidationErrors: renderValidationErrors,
    clearValidationErrors: clearValidationErrors,
    setFieldError: setFieldError,
    setFieldWarning: setFieldWarning,
    showReadinessSheet: showReadinessSheet,
    updateReadinessStatus: updateReadinessStatus
  });

  if (typeof document === "undefined") {
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    return;
  }

  buildReadinessSheet();
  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-vvip-readiness-open], [data-vvip-safe-publish-action]")) {
      const readiness = getListingReadiness(currentDraft());
      showReadinessSheet(readiness);
      if (event.target.closest("[data-vvip-safe-publish-action]")) feedback(FUTURE_PUBLISH_MESSAGE);
      return;
    }
    if (event.target.closest("[data-vvip-readiness-close]")) closeReadinessSheet();
  });
  document.addEventListener("keydown", function (event) {
    if (!readinessLayer || readinessLayer.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeReadinessSheet();
      return;
    }
    trapFocus(event);
  });

  window.VVIP_PR33_READINESS = api;
})();
