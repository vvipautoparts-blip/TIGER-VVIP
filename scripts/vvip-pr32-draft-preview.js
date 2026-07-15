(function () {
  "use strict";

  const DRAFT_KEY = "vvip_pr31_create_listing_draft";
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
  const CORRUPT_MESSAGE =
    "تعذر قراءة المسودة المحلية. يمكنك حذفها أو إنشاء مسودة جديدة.";
  const READINESS_FIELDS = Object.freeze(["sector", "title", "price", "location", "summary"]);
  const READINESS_WARNINGS = Object.freeze(["summary", "sectorDetails", "photos"]);

  let previewLayer;
  let previewPanel;
  let lastFocusedElement = null;
  let corruptNoticeShown = false;

  function cleanText(value, limit) {
    return String(value == null ? "" : value)
      .replace(/<[^>]*>/g, " ")
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit || 500);
  }

  function parsePrice(value) {
    const normalized = String(value == null ? "" : value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
    const price = Number(normalized);
    return Number.isFinite(price) && price > 0 ? price : null;
  }

  function sanitizePhotoMetadata(input) {
    if (!Array.isArray(input)) return [];
    const seen = new Set();
    return input.slice(0, 7).map(function (item, position) {
      if (!item || typeof item !== "object") return null;
      const mimeType = ["image/jpeg", "image/webp"].includes(item.mimeType) ? item.mimeType : "";
      const width = Number(item.width), height = Number(item.height), sizeBytes = Number(item.sizeBytes);
      const imageId = cleanText(item.imageId, 80);
      if (!imageId || seen.has(imageId) || !mimeType || !Number.isInteger(width) || !Number.isInteger(height) || !Number.isInteger(sizeBytes) || width < 1 || height < 1 || width > 1600 || height > 1200 || width * 3 !== height * 4 || sizeBytes < 1 || sizeBytes > 15 * 1024 * 1024) return null;
      seen.add(imageId);
      return { imageId: imageId, position: position, altText: cleanText(item.altText, 140), mimeType: mimeType, width: width, height: height, sizeBytes: sizeBytes };
    }).filter(function (item) { return item && item.imageId; });
  }

  function sanitizeDraft(input) {
    if (!input || typeof input !== "object" || !SECTORS[input.sector]) return null;
    const sourceFields = input.sectorFields && typeof input.sectorFields === "object"
      ? input.sectorFields
      : input.sectorDetails && typeof input.sectorDetails === "object"
        ? input.sectorDetails
        : {};
    const sectorFields = {};
    SECTOR_FIELDS[input.sector].forEach(function (name) {
      sectorFields[name] = cleanText(sourceFields[name], 140);
    });
    const photoMetadata = sanitizePhotoMetadata(input.photoMetadata);
    const photoCount = photoMetadata.length;
    const requestedStep = Number(input.lastStep);
    const lastStep = Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= 3
      ? requestedStep
      : 1;
    const price = parsePrice(input.price);
    const title = cleanText(input.title, 80);
    const location = cleanText(input.location, 60);
    const basicReady = title.length >= 2 && title.length <= 80 &&
      price !== null && Boolean(location) && location.length <= 60;
    const readinessStatus = basicReady && input.readinessStatus !== "incomplete"
      ? "ready"
      : "incomplete";
    const requestedScore = Number(input.readinessScore);
    const readinessScore = Number.isFinite(requestedScore)
      ? Math.max(0, Math.min(100, Math.round(requestedScore)))
      : basicReady ? 100 : 0;
    const missingFields = Array.isArray(input.missingFields)
      ? input.missingFields.filter(function (name) {
        return READINESS_FIELDS.includes(name);
      }).slice(0, 10)
      : [];
    const warnings = Array.isArray(input.warnings)
      ? input.warnings.filter(function (name) {
        return READINESS_WARNINGS.includes(name);
      }).slice(0, 10)
      : [];

    return {
      version: 2,
      updatedAt: cleanText(input.updatedAt || input.savedAt, 40) || new Date(0).toISOString(),
      sector: input.sector,
      sectorLabel: SECTORS[input.sector],
      title: title,
      price: price,
      location: location,
      summary: cleanText(input.summary, 280),
      specs: cleanText(input.specs, 240),
      sectorFields: sectorFields,
      photoCount: photoCount,
      photoMetadata: photoMetadata,
      coverImageId: photoMetadata.some(function (item) { return item.imageId === input.coverImageId; }) ? input.coverImageId : (photoMetadata[0] ? photoMetadata[0].imageId : null),
      lastStep: lastStep,
      incomplete: readinessStatus !== "ready",
      readinessStatus: readinessStatus,
      readinessScore: readinessScore,
      readinessUpdatedAt: cleanText(input.readinessUpdatedAt, 40),
      missingFields: missingFields,
      warnings: warnings
    };
  }

  function normalizeDraft(input) {
    return sanitizeDraft(input);
  }

  function readLocalDraft() {
    let raw;
    try {
      raw = window.localStorage.getItem(DRAFT_KEY);
    } catch (error) {
      return { status: "unavailable", draft: null };
    }
    if (!raw) return { status: "empty", draft: null };
    try {
      const draft = normalizeDraft(JSON.parse(raw));
      return draft
        ? { status: "ready", draft: draft }
        : { status: "corrupt", draft: null };
    } catch (error) {
      return { status: "corrupt", draft: null };
    }
  }

  function dispatchDraftChange() {
    if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("vvip:local-draft-changed"));
    }
  }

  function writeLocalDraft(input) {
    const draft = sanitizeDraft(input);
    if (!draft) return false;
    const stored = {
      version: 2,
      updatedAt: new Date().toISOString(),
      sector: draft.sector,
      title: draft.title,
      price: draft.price,
      location: draft.location,
      summary: draft.summary,
      specs: draft.specs,
      sectorFields: draft.sectorFields,
      photoCount: draft.photoCount,
      photoMetadata: draft.photoMetadata,
      coverImageId: draft.coverImageId,
      lastStep: draft.lastStep,
      readinessStatus: draft.readinessStatus,
      readinessScore: draft.readinessScore,
      readinessUpdatedAt: new Date().toISOString(),
      missingFields: draft.missingFields,
      warnings: draft.warnings
    };
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
      dispatchDraftChange();
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearLocalDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
      dispatchDraftChange();
      return true;
    } catch (error) {
      return false;
    }
  }

  function feedback(message) {
    if (window.VVIP_PR30 && typeof window.VVIP_PR30.showFeedback === "function") {
      window.VVIP_PR30.showFeedback(message);
    }
  }

  function makeButton(label, attribute, value) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute(attribute, value || "true");
    return button;
  }

  function draftSpecs(draft) {
    const values = draft.specs.split(/[،,]/).map(function (value) {
      return cleanText(value, 100);
    }).filter(Boolean);
    Object.keys(draft.sectorFields).forEach(function (key) {
      if (draft.sectorFields[key]) values.push(draft.sectorFields[key]);
    });
    return values.slice(0, 10);
  }

  function sessionPreviewUrl() {
    const shell = window.VVIP_PR31_CREATE_LISTING;
    if (!shell || typeof shell.sessionPreview !== "function") return "";
    const preview = shell.sessionPreview();
    return preview && typeof preview.url === "string" && preview.url.startsWith("blob:")
      ? preview.url
      : "";
  }

  function buildVisual(draft, detail) {
    const visual = document.createElement("div");
    visual.className = "vvip-draft-visual vvip-draft-visual--" + draft.sector;
    const previewUrl = sessionPreviewUrl();
    if (previewUrl) {
      const image = document.createElement("img");
      image.src = previewUrl;
      image.alt = "معاينة محلية للمسودة";
      visual.appendChild(image);
    } else {
      const label = document.createElement("span");
      label.textContent = draft.sectorLabel;
      visual.appendChild(label);
    }
    if (!detail) {
      const badge = document.createElement("b");
      badge.textContent = draft.readinessStatus === "ready" ? "مسودة جاهزة" : "تحتاج إكمال";
      visual.appendChild(badge);
    }
    return visual;
  }

  function buildDraftCard(draft) {
    const card = document.createElement("article");
    card.className = "vvip-draft-card";
    card.setAttribute("data-vvip-local-draft-card", "");
    const body = document.createElement("div");
    body.className = "vvip-draft-card__body";
    const meta = document.createElement("p");
    meta.className = "vvip-draft-meta";
    meta.textContent = draft.sectorLabel + " · " + (draft.location || "الموقع غير مكتمل");
    const title = document.createElement("h3");
    title.textContent = draft.title || "مسودة تحتاج عنوانًا";
    const price = document.createElement("strong");
    price.textContent = draft.price === null
      ? "السعر غير مكتمل"
      : draft.price.toLocaleString("ar-SA") + " ر.س";
    const summary = document.createElement("p");
    summary.textContent = draft.summary || "أكمل وصف الإعلان عند متابعة التعديل.";
    const readinessRow = document.createElement("div");
    readinessRow.className = "vvip-draft-readiness-row";
    const readinessBadge = document.createElement("span");
    readinessBadge.className = "vvip-draft-readiness-badge";
    readinessBadge.dataset.readinessState = draft.readinessStatus;
    readinessBadge.textContent = draft.readinessStatus === "ready" ? "مسودة جاهزة" : "تحتاج إكمال";
    const readinessCopy = document.createElement("span");
    readinessCopy.className = "vvip-draft-readiness-copy";
    readinessCopy.textContent = draft.readinessStatus === "ready"
      ? "جاهزة كمسودة محلية"
      : "تحتاج إكمال";
    readinessRow.append(readinessBadge, readinessCopy);
    const chips = document.createElement("div");
    chips.className = "vvip-draft-chips";
    draftSpecs(draft).forEach(function (value) {
      const chip = document.createElement("span");
      chip.textContent = value;
      chips.appendChild(chip);
    });
    const local = document.createElement("p");
    local.className = "vvip-draft-local-copy";
    local.textContent = "هذه المسودة محفوظة محليًا على هذا الجهاز فقط. لم يتم نشر الإعلان بعد.";
    const future = document.createElement("p");
    future.className = "vvip-draft-future-copy";
    future.textContent = "لن تظهر للمستخدمين حتى يتم تفعيل النشر الحقيقي لاحقًا.";
    const actions = document.createElement("div");
    actions.className = "vvip-draft-actions";
    actions.append(
      makeButton("معاينة", "data-draft-preview-open"),
      makeButton("متابعة التعديل", "data-vvip-draft-resume-action"),
      makeButton("فحص الجاهزية", "data-vvip-readiness-open"),
      makeButton("حذف المسودة", "data-vvip-draft-delete-action")
    );
    body.append(meta, title, price, summary, readinessRow, chips, local, future, actions);
    card.append(buildVisual(draft, false), body);
    return card;
  }

  function buildCorruptCard() {
    const card = document.createElement("article");
    card.className = "vvip-draft-card vvip-draft-card--corrupt";
    card.setAttribute("data-vvip-local-draft-card", "");
    const body = document.createElement("div");
    body.className = "vvip-draft-card__body";
    const title = document.createElement("h3");
    title.textContent = "مسودة محلية غير قابلة للقراءة";
    const message = document.createElement("p");
    message.textContent = CORRUPT_MESSAGE;
    const action = makeButton("حذف المسودة المحلية", "data-vvip-draft-delete-action");
    action.className = "vvip-draft-inline-action";
    body.append(title, message, action);
    card.appendChild(body);
    return card;
  }

  function renderDraftPreview() {
    const snapshot = readLocalDraft();
    document.querySelectorAll("[data-vvip-local-draft-preview]").forEach(function (section) {
      const cardHost = section.querySelector("[data-vvip-local-draft-card]");
      const empty = section.querySelector("[data-vvip-draft-empty-state]");
      const isHome = section.dataset.draftContext === "home";
      cardHost.replaceChildren();
      if (snapshot.status === "ready") {
        section.hidden = false;
        empty.hidden = true;
        cardHost.appendChild(buildDraftCard(snapshot.draft));
        return;
      }
      if (snapshot.status === "corrupt") {
        section.hidden = false;
        empty.hidden = true;
        cardHost.appendChild(buildCorruptCard());
        if (!corruptNoticeShown) {
          corruptNoticeShown = true;
          feedback(CORRUPT_MESSAGE);
        }
        return;
      }
      cardHost.replaceChildren();
      if (isHome) {
        section.hidden = true;
      } else {
        section.hidden = false;
        empty.hidden = false;
      }
    });
  }

  function previewMarkup() {
    return `<div class="vvip-draft-sheet-layer" data-vvip-draft-preview-sheet aria-hidden="true" hidden>
      <button class="vvip-draft-sheet-backdrop" type="button" tabindex="-1" data-draft-preview-close aria-label="إغلاق معاينة المسودة"></button>
      <section class="vvip-draft-sheet" role="dialog" aria-modal="true" aria-labelledby="vvip-draft-sheet-title" tabindex="-1">
        <button class="vvip-draft-sheet-close" type="button" data-draft-preview-close aria-label="إغلاق">×</button>
        <span class="vvip-draft-badge" data-draft-sheet-readiness>مسودة محلية</span>
        <h2 id="vvip-draft-sheet-title">معاينة المسودة</h2>
        <div data-draft-sheet-visual></div>
        <p class="vvip-draft-meta" data-draft-sheet-sector></p>
        <h3 data-draft-sheet-listing-title></h3>
        <strong data-draft-sheet-price></strong>
        <p data-draft-sheet-location></p>
        <p data-draft-sheet-summary></p>
        <div class="vvip-draft-chips" data-draft-sheet-specs></div>
        <p data-draft-sheet-photo-count></p>
        <p class="vvip-draft-note">هذه معاينة محلية فقط. لم يتم نشر الإعلان ولم يتم إرسال أي بيانات إلى VVIP TIGER.</p>
        <p class="vvip-draft-disclaimer">VVIP TIGER منصة عرض وتواصل فقط وليست طرفًا في البيع أو الدفع أو التوصيل أو العقود.</p>
        <div class="vvip-draft-actions"><button type="button" data-vvip-draft-resume-action>متابعة التعديل</button><button type="button" data-vvip-readiness-open>فحص الجاهزية</button><button type="button" data-draft-preview-close>إغلاق</button><button type="button" data-vvip-draft-delete-action>حذف المسودة</button></div>
      </section>
    </div>`;
  }

  function buildPreviewSheet() {
    const host = document.createElement("div");
    host.innerHTML = previewMarkup();
    previewLayer = host.firstElementChild;
    previewPanel = previewLayer.querySelector(".vvip-draft-sheet");
    document.body.appendChild(previewLayer);
  }

  function setPreviewText(selector, value) {
    const node = previewLayer.querySelector(selector);
    if (node) node.textContent = value || "—";
  }

  function openDraftPreview() {
    const snapshot = readLocalDraft();
    if (snapshot.status !== "ready") {
      feedback(snapshot.status === "corrupt" ? CORRUPT_MESSAGE : "لا توجد مسودة محلية للمعاينة الآن.");
      return;
    }
    const draft = snapshot.draft;
    const visualHost = previewLayer.querySelector("[data-draft-sheet-visual]");
    visualHost.replaceChildren(buildVisual(draft, true));
    setPreviewText("[data-draft-sheet-sector]", draft.sectorLabel);
    setPreviewText("[data-draft-sheet-listing-title]", draft.title || "مسودة تحتاج عنوانًا");
    setPreviewText("[data-draft-sheet-price]", draft.price === null ? "السعر غير مكتمل" : draft.price.toLocaleString("ar-SA") + " ر.س");
    setPreviewText("[data-draft-sheet-location]", draft.location || "الموقع غير مكتمل");
    setPreviewText("[data-draft-sheet-summary]", draft.summary || "الوصف غير مكتمل.");
    setPreviewText("[data-draft-sheet-photo-count]", "عدد الصور المحلية المسجلة: " + draft.photoCount);
    setPreviewText("[data-draft-sheet-readiness]", draft.readinessStatus === "ready" ? "مسودة جاهزة" : "تحتاج إكمال");
    const specs = previewLayer.querySelector("[data-draft-sheet-specs]");
    specs.replaceChildren();
    draftSpecs(draft).forEach(function (value) {
      const chip = document.createElement("span");
      chip.textContent = value;
      specs.appendChild(chip);
    });
    lastFocusedElement = document.activeElement;
    previewLayer.hidden = false;
    previewLayer.setAttribute("aria-hidden", "false");
    document.body.classList.add("vvip-draft-sheet-open");
    previewPanel.focus();
  }

  function closeDraftPreview() {
    if (!previewLayer || previewLayer.hidden) return;
    previewLayer.hidden = true;
    previewLayer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("vvip-draft-sheet-open");
    if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus();
    lastFocusedElement = null;
  }

  function callShell(method) {
    const shell = window.VVIP_PR31_CREATE_LISTING;
    if (!shell || typeof shell[method] !== "function") {
      feedback("تعذر فتح المسودة مؤقتًا. يمكنك المحاولة مرة أخرى.");
      return;
    }
    shell[method]();
  }

  function trapFocus(event) {
    if (event.key !== "Tab" || previewLayer.hidden) return;
    const focusable = Array.from(previewLayer.querySelectorAll(
      "button:not([disabled]), [tabindex='0']"
    )).filter(function (node) { return node.tabIndex >= 0; });
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

  if (typeof document === "undefined") {
    if (typeof module !== "undefined" && module.exports) {
      module.exports = Object.freeze({
        readLocalDraft: readLocalDraft,
        writeLocalDraft: writeLocalDraft,
        clearLocalDraft: clearLocalDraft,
        normalizeDraft: normalizeDraft,
        sanitizeDraft: sanitizeDraft
      });
    }
    return;
  }

  buildPreviewSheet();
  renderDraftPreview();

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-draft-preview-open]")) {
      openDraftPreview();
      return;
    }
    if (event.target.closest("[data-vvip-draft-resume-action]")) {
      closeDraftPreview();
      callShell("resume");
      return;
    }
    if (event.target.closest("[data-vvip-draft-delete-action]")) {
      closeDraftPreview();
      callShell("requestDelete");
      return;
    }
    if (event.target.closest("[data-draft-preview-close]")) closeDraftPreview();
  });

  document.addEventListener("keydown", function (event) {
    if (previewLayer.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDraftPreview();
      return;
    }
    trapFocus(event);
  });
  window.addEventListener("vvip:local-draft-changed", renderDraftPreview);
  window.addEventListener("storage", function (event) {
    if (event.key === DRAFT_KEY) renderDraftPreview();
  });

  window.VVIP_PR32_DRAFTS = Object.freeze({
    readLocalDraft: readLocalDraft,
    writeLocalDraft: writeLocalDraft,
    clearLocalDraft: clearLocalDraft,
    normalizeDraft: normalizeDraft,
    sanitizeDraft: sanitizeDraft,
    renderDraftPreview: renderDraftPreview,
    openDraftPreview: openDraftPreview,
    draftKey: DRAFT_KEY
  });
})();
