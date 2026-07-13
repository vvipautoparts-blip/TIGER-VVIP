(function () {
  "use strict";

  const DRAFT_KEY = "vvip_pr31_create_listing_draft";
  const OPEN_FAILURE =
    "تعذر فتح نموذج الإعلان مؤقتًا. يمكنك متابعة التصفح والعودة لاحقًا.";
  const STORAGE_FAILURE =
    "لا يمكن حفظ المسودة محليًا الآن، لكن يمكنك مراجعة البيانات قبل الإغلاق.";
  const SECTORS = Object.freeze({
    automotive: "قطع وخدمات السيارات",
    materials: "مواد ولوازم",
    "real-estate": "عقارات"
  });
  const SECTOR_FIELD_LABELS = Object.freeze({
    automotive: {
      autoType: "نوع الخدمة/القطعة",
      autoCondition: "حالة القطعة",
      autoCompatibility: "التوافق أو الموديل",
      autoWarranty: "ضمان/فحص"
    },
    materials: {
      materialType: "نوع المادة",
      materialQuantity: "الكمية أو الوحدة",
      materialAvailability: "حالة التوفر",
      materialDelivery: "إمكانية التوصيل"
    },
    "real-estate": {
      estateType: "نوع العقار",
      estateArea: "المساحة",
      estateRooms: "الغرف",
      estateOffer: "نوع العرض"
    }
  });
  const CONFIRMATIONS = Object.freeze({
    delete: {
      title: "حذف المسودة المحلية؟",
      message: "سيتم حذف هذه المسودة من هذا الجهاز فقط. لن يتم حذف أي بيانات من المنصة.",
      cancel: "إلغاء",
      accept: "حذف المسودة",
      destructive: true
    },
    close: {
      title: "إغلاق النموذج؟",
      message: "قد تفقد البيانات غير المحفوظة. يمكنك الرجوع أو حفظها كمسودة محلية.",
      cancel: "متابعة التحرير",
      accept: "إغلاق النموذج",
      destructive: false
    },
    draftChoice: {
      title: "مسودتك المحلية جاهزة",
      message: "يمكنك استكمال المسودة الحالية أو بدء إعلان جديد.",
      cancel: "استكمال المسودة",
      accept: "بدء إعلان جديد",
      destructive: false
    },
    newDraft: {
      title: "بدء إعلان جديد؟",
      message: "سيتم استبدال المسودة المحلية الحالية على هذا الجهاز فقط.",
      cancel: "إلغاء",
      accept: "بدء جديد",
      destructive: false
    }
  });

  let layer;
  let confirmation;
  let form;
  let currentStep = 0;
  let selectedSector = "";
  let localPhotos = [];
  let savedPhotoNames = [];
  let dirty = false;
  let lastFocusedElement = null;
  let confirmationLastFocus = null;
  let pendingConfirmation = "";

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/<[^>]*>/g, " ")
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseSafePrice(value) {
    const normalized = String(value == null ? "" : value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
    const price = Number(normalized);
    return Number.isFinite(price) && price > 0 ? price : null;
  }

  function feedback(message) {
    if (window.VVIP_PR30 && typeof window.VVIP_PR30.showFeedback === "function") {
      window.VVIP_PR30.showFeedback(message);
      return;
    }
    const toast = document.querySelector("[data-app-toast], [data-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.setTimeout(function () { toast.hidden = true; }, 3600);
  }

  function shellMarkup() {
    return `<div class="vvip-create-layer" data-vvip-create-listing-shell aria-hidden="true" hidden>
      <button class="vvip-create-backdrop" type="button" tabindex="-1" data-create-close aria-label="إغلاق نموذج الإعلان"></button>
      <section class="vvip-create-shell" data-vvip-mobile-safe-shell role="dialog" aria-modal="true" aria-labelledby="vvip-create-title" tabindex="-1">
        <header class="vvip-create-header">
          <div><span class="vvip-create-badge">VVIP</span><h2 id="vvip-create-title">إنشاء إعلان</h2><p>هذا النموذج تجريبي آمن ولا ينشر الإعلان الآن.</p></div>
          <button class="vvip-create-close" type="button" data-create-close aria-label="إغلاق">×</button>
        </header>
        <ol class="vvip-create-stepper" data-vvip-create-listing-stepper aria-label="خطوات إنشاء الإعلان">
          <li data-step-indicator="0" aria-current="step"><span>1</span>القطاع</li>
          <li data-step-indicator="1"><span>2</span>التفاصيل</li>
          <li data-step-indicator="2"><span>3</span>الصور</li>
          <li data-step-indicator="3"><span>4</span>المراجعة</li>
        </ol>
        <form class="vvip-create-form" data-vvip-create-listing-safe-draft novalidate>
          <section class="vvip-create-step" data-vvip-create-listing-sector-step data-create-step="0">
            <div class="vvip-create-copy"><h3>اختر قطاع الإعلان</h3><p>اختيار القطاع مطلوب فقط عند إنشاء إعلان.</p><p class="vvip-step-guidance">أكمل الحقول المطلوبة للانتقال.</p></div>
            <div class="vvip-sector-grid" role="radiogroup" aria-label="قطاع الإعلان">
              <button type="button" role="radio" aria-checked="false" data-create-sector="automotive">قطع وخدمات السيارات</button>
              <button type="button" role="radio" aria-checked="false" data-create-sector="materials">مواد ولوازم</button>
              <button type="button" role="radio" aria-checked="false" data-create-sector="real-estate">عقارات</button>
            </div>
            <p class="vvip-create-error vvip-field-error" data-create-error="sector" data-vvip-validation-error="sector" role="alert" hidden></p>
            <div class="vvip-create-actions"><button class="vvip-create-primary" type="button" data-create-next>التالي</button></div>
          </section>

          <section class="vvip-create-step" data-vvip-create-listing-details-step data-create-step="1" hidden>
            <div class="vvip-create-copy"><h3>تفاصيل الإعلان</h3><p>أدخل المعلومات الأساسية بصورة واضحة ومختصرة.</p><p class="vvip-step-guidance">أكمل الحقول المطلوبة للانتقال.</p></div>
            <div class="vvip-field-grid">
              <label><span>اسم الإعلان / العنوان</span><input name="title" maxlength="80" autocomplete="off" required><small class="vvip-field-error" data-vvip-validation-error="title" role="alert" hidden></small></label>
              <label><span>السعر</span><input name="price" type="text" inputmode="decimal" autocomplete="off" required><small class="vvip-field-error" data-vvip-validation-error="price" role="alert" hidden></small></label>
              <label><span>المدينة / المنطقة</span><input name="location" maxlength="60" autocomplete="address-level2" required><small class="vvip-field-error" data-vvip-validation-error="location" role="alert" hidden></small></label>
              <label class="vvip-field-wide"><span>وصف مختصر</span><textarea name="summary" maxlength="280" rows="3"></textarea><small class="vvip-field-error" data-vvip-validation-error="summary" role="status" hidden></small></label>
              <label class="vvip-field-wide"><span>مواصفات أساسية</span><input name="specs" maxlength="240" placeholder="افصل بين المواصفات بفاصلة"></label>
            </div>

            <fieldset class="vvip-sector-fields" data-sector-fields="automotive" hidden disabled>
              <legend>تفاصيل السيارات</legend><div class="vvip-field-grid">
                <label><span>نوع الخدمة/القطعة</span><input name="autoType" maxlength="100"></label>
                <label><span>حالة القطعة</span><input name="autoCondition" maxlength="80"></label>
                <label><span>التوافق أو الموديل إن وجد</span><input name="autoCompatibility" maxlength="120"></label>
                <label><span>ضمان/فحص إن وجد</span><input name="autoWarranty" maxlength="120"></label>
              </div>
            </fieldset>
            <fieldset class="vvip-sector-fields" data-sector-fields="materials" hidden disabled>
              <legend>تفاصيل المواد واللوازم</legend><div class="vvip-field-grid">
                <label><span>نوع المادة</span><input name="materialType" maxlength="100"></label>
                <label><span>الكمية أو الوحدة</span><input name="materialQuantity" maxlength="80"></label>
                <label><span>حالة التوفر</span><input name="materialAvailability" maxlength="80"></label>
                <label><span>إمكانية التوصيل إن وجدت</span><input name="materialDelivery" maxlength="120"></label>
              </div>
            </fieldset>
            <fieldset class="vvip-sector-fields" data-sector-fields="real-estate" hidden disabled>
              <legend>تفاصيل العقار</legend><div class="vvip-field-grid">
                <label><span>نوع العقار</span><input name="estateType" maxlength="100"></label>
                <label><span>المساحة</span><input name="estateArea" maxlength="80"></label>
                <label><span>الغرف إن وجدت</span><input name="estateRooms" maxlength="50"></label>
                <label><span>نوع العرض</span><select name="estateOffer"><option value="">اختر</option><option>بيع</option><option>إيجار</option><option>استثمار</option></select></label>
              </div>
            </fieldset>
            <p class="vvip-create-error" data-create-error="details" role="alert" hidden></p>
            <div class="vvip-create-actions"><button type="button" data-create-back>السابق</button><button class="vvip-create-primary" type="button" data-create-next>التالي</button></div>
          </section>

          <section class="vvip-create-step" data-vvip-create-listing-media-step data-create-step="2" hidden>
            <div class="vvip-create-copy"><h3>الصور والمعاينة</h3><p>المعاينة محلية فقط ولن يتم رفع الصور في هذه المرحلة.</p></div>
            <label class="vvip-file-picker" data-local-file-picker><span>اختيار صور من الجهاز</span><input type="file" accept="image/*" multiple data-create-photo-input></label>
            <p class="vvip-file-fallback" data-file-api-fallback hidden>اختيار الصور غير متاح في هذا المتصفح، ويمكنك متابعة المسودة دون صور.</p>
            <div class="vvip-photo-preview" data-create-photo-preview aria-live="polite"></div>
            <p class="vvip-create-hint">الصور ستُرفع لاحقًا عند تفعيل النشر الحقيقي. يمكنك إضافة صور لاحقًا عند تفعيل الرفع الحقيقي.</p>
            <div class="vvip-create-actions"><button type="button" data-create-back>السابق</button><button class="vvip-create-primary" type="button" data-create-next>مراجعة المسودة</button></div>
          </section>

          <section class="vvip-create-step" data-vvip-create-listing-review-step data-vvip-publishing-readiness-layer data-create-step="3" hidden>
            <div class="vvip-create-copy"><h3>مراجعة المسودة</h3><p>راجع البيانات قبل حفظها محليًا على هذا الجهاز.</p></div>
            <article class="vvip-draft-review">
              <span data-review-sector></span><h3 data-review-title></h3><strong data-review-price></strong><p data-review-location></p><p data-review-summary></p>
              <div class="vvip-review-specs" data-review-specs></div><p data-review-photo-count></p>
            </article>
            <section class="vvip-readiness-panel" data-vvip-pr33-readiness>
              <h3>جاهزية الإعلان</h3>
              <span class="vvip-readiness-status" data-vvip-readiness-status>فحص البيانات...</span>
              <ul class="vvip-readiness-checks">
                <li data-readiness-check="sector" data-readiness-label="القطاع"></li>
                <li data-readiness-check="title" data-readiness-label="الاسم"></li>
                <li data-readiness-check="price" data-readiness-label="السعر"></li>
                <li data-readiness-check="location" data-readiness-label="الموقع"></li>
              </ul>
              <p class="vvip-readiness-note">الصور اختيارية الآن، والنشر الحقيقي قيد التجهيز.</p>
              <button type="button" data-vvip-readiness-open>فحص جاهزية الإعلان</button>
            </section>
            <p class="vvip-create-disclaimer">VVIP TIGER منصة عرض وتواصل فقط وليست طرفًا في البيع أو الدفع أو التوصيل أو العقود.</p>
            <div class="vvip-create-actions vvip-create-actions--review"><button class="vvip-create-primary" type="button" data-save-local-draft>حفظ المسودة المحلية</button><button type="button" data-vvip-safe-publish-action data-vvip-publish-disabled aria-disabled="true">النشر الحقيقي لاحقًا</button><button type="button" data-create-back data-edit-details>رجوع للتعديل</button><button type="button" data-create-close>إغلاق</button></div>
          </section>
        </form>
      </section>
    </div>
    <div class="vvip-create-confirmation" data-vvip-create-confirmation aria-hidden="true" hidden>
      <button class="vvip-create-confirmation__backdrop" type="button" tabindex="-1" data-create-confirm-cancel aria-label="إلغاء التأكيد"></button>
      <section class="vvip-create-confirmation__card" role="alertdialog" aria-modal="true" aria-labelledby="vvip-create-confirm-title" aria-describedby="vvip-create-confirm-message" tabindex="-1">
        <span class="vvip-create-badge">VVIP TIGER</span>
        <h3 id="vvip-create-confirm-title" data-create-confirm-title></h3>
        <p id="vvip-create-confirm-message" data-create-confirm-message></p>
        <div class="vvip-create-confirmation__actions">
          <button type="button" data-create-confirm-cancel></button>
          <button class="vvip-create-confirmation__accept" type="button" data-create-confirm-accept></button>
        </div>
      </section>
    </div>`;
  }

  function buildShell() {
    const host = document.createElement("div");
    host.innerHTML = shellMarkup();
    layer = host.firstElementChild;
    confirmation = layer.nextElementSibling;
    document.body.append(layer, confirmation);
    form = layer.querySelector("form");
  }

  function field(name) {
    return form && form.elements.namedItem(name);
  }

  function readinessApi() {
    return window.VVIP_PR33_READINESS || null;
  }

  function validationInput() {
    const sectorDetails = {};
    const labels = SECTOR_FIELD_LABELS[selectedSector] || {};
    Object.keys(labels).forEach(function (name) {
      sectorDetails[name] = cleanField(name, 140);
    });
    return {
      sector: selectedSector,
      title: field("title") ? field("title").value : "",
      price: field("price") ? field("price").value : "",
      location: field("location") ? field("location").value : "",
      summary: field("summary") ? field("summary").value : "",
      specs: field("specs") ? field("specs").value : "",
      sectorDetails: sectorDetails,
      selectedLocalPhotoCount: currentPhotoNames().length
    };
  }

  function currentValidation() {
    const api = readinessApi();
    return api && typeof api.validateListingDraft === "function"
      ? api.validateListingDraft(validationInput())
      : null;
  }

  function setError(name, message) {
    const node = layer.querySelector(`[data-create-error="${name}"]`);
    if (!node) return;
    node.textContent = message || "";
    node.hidden = !message;
  }

  function selectSector(sector) {
    if (!Object.prototype.hasOwnProperty.call(SECTORS, sector)) return false;
    selectedSector = sector;
    layer.querySelectorAll("[data-create-sector]").forEach(function (button) {
      const active = button.dataset.createSector === sector;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-checked", String(active));
    });
    layer.querySelectorAll("[data-sector-fields]").forEach(function (fieldset) {
      const active = fieldset.dataset.sectorFields === sector;
      fieldset.hidden = !active;
      fieldset.disabled = !active;
    });
    setError("sector", "");
    const api = readinessApi();
    if (api) api.setFieldError("sector", "");
    return true;
  }

  function cleanField(name, limit) {
    const input = field(name);
    return escapeText(input ? input.value : "").slice(0, limit);
  }

  function collectDetails() {
    const sectorDetails = {};
    const labels = SECTOR_FIELD_LABELS[selectedSector] || {};
    Object.keys(labels).forEach(function (name) {
      sectorDetails[name] = cleanField(name, 140);
    });
    return {
      sector: selectedSector,
      sectorLabel: SECTORS[selectedSector] || "",
      title: cleanField("title", 80),
      price: readinessApi() && typeof readinessApi().validatePrice === "function"
        ? readinessApi().validatePrice(field("price") && field("price").value).value
        : parseSafePrice(field("price") && field("price").value),
      location: cleanField("location", 60),
      summary: cleanField("summary", 280),
      specs: cleanField("specs", 240),
      sectorDetails: sectorDetails
    };
  }

  function validateDetails() {
    const api = readinessApi();
    const validation = currentValidation();
    if (api && validation) {
      const detailErrors = {};
      ["title", "price", "location", "summary"].forEach(function (name) {
        if (validation.errors[name]) detailErrors[name] = validation.errors[name];
      });
      api.renderValidationErrors(detailErrors);
      if (validation.warnings.includes("summary")) {
        api.setFieldError("summary", "أضف وصفًا مختصرًا يساعد المستخدمين على فهم الإعلان.");
      }
      const firstBlocker = validation.blockers.find(function (name) {
        return name === "title" || name === "price" || name === "location" || name === "summary";
      });
      if (firstBlocker) {
        const focusTarget = field(firstBlocker);
        if (focusTarget) focusTarget.focus();
        setError("details", "أكمل الحقول المطلوبة للانتقال.");
        return false;
      }
      setError("details", "");
      return true;
    }
    const details = collectDetails();
    let message = "";
    let focusTarget = null;
    if (!details.title) {
      message = "اسم الإعلان مطلوب.";
      focusTarget = field("title");
    } else if (details.price === null) {
      message = "أدخل سعرًا رقميًا أكبر من صفر.";
      focusTarget = field("price");
    } else if (!details.location) {
      message = "المدينة أو المنطقة مطلوبة.";
      focusTarget = field("location");
    }
    setError("details", message);
    if (focusTarget) focusTarget.focus();
    return !message;
  }

  function reviewText(selector, value) {
    const node = layer.querySelector(selector);
    if (node) node.textContent = value || "—";
  }

  function currentPhotoNames() {
    if (localPhotos.length) {
      return localPhotos.map(function (entry) {
        return escapeText(entry.file.name).slice(0, 180);
      });
    }
    return savedPhotoNames.slice();
  }

  function renderReview() {
    const details = collectDetails();
    reviewText("[data-review-sector]", details.sectorLabel);
    reviewText("[data-review-title]", details.title);
    reviewText("[data-review-price]", details.price === null ? "" : details.price.toLocaleString("ar-SA") + " ر.س");
    reviewText("[data-review-location]", details.location);
    reviewText("[data-review-summary]", details.summary || "لا يوجد وصف مختصر.");
    const specsHost = layer.querySelector("[data-review-specs]");
    specsHost.replaceChildren();
    const values = details.specs.split(/[،,]/).map(escapeText).filter(Boolean);
    const labels = SECTOR_FIELD_LABELS[selectedSector] || {};
    Object.keys(labels).forEach(function (name) {
      const value = details.sectorDetails[name];
      if (value) values.push(labels[name] + ": " + value);
    });
    values.slice(0, 10).forEach(function (value) {
      const chip = document.createElement("span");
      chip.textContent = value;
      specsHost.appendChild(chip);
    });
    reviewText("[data-review-photo-count]", "الصور المحلية المحددة: " + currentPhotoNames().length);
    const api = readinessApi();
    if (api && typeof api.updateReadinessStatus === "function") {
      api.updateReadinessStatus(validationInput());
    }
  }

  function setStep(nextStep) {
    currentStep = Math.max(0, Math.min(3, nextStep));
    layer.querySelectorAll("[data-create-step]").forEach(function (step) {
      step.hidden = Number(step.dataset.createStep) !== currentStep;
    });
    layer.querySelectorAll("[data-step-indicator]").forEach(function (indicator) {
      const active = Number(indicator.dataset.stepIndicator) === currentStep;
      indicator.classList.toggle("is-current", active);
      if (active) indicator.setAttribute("aria-current", "step");
      else indicator.removeAttribute("aria-current");
    });
    if (currentStep === 3) renderReview();
    const heading = layer.querySelector(`[data-create-step="${currentStep}"] h3`);
    if (heading) heading.focus({ preventScroll: true });
  }

  function nextStep() {
    if (currentStep === 0 && !selectedSector) {
      const api = readinessApi();
      if (api) api.setFieldError("sector", "اختر قطاع الإعلان.");
      else setError("sector", "اختر قطاع الإعلان.");
      return;
    }
    if (currentStep === 1 && !validateDetails()) return;
    if (currentStep === 2 && !currentPhotoNames().length) {
      feedback("يمكنك إضافة صور لاحقًا عند تفعيل الرفع الحقيقي.");
    }
    setStep(currentStep + 1);
  }

  function previousStep(editDetails) {
    setStep(editDetails ? 1 : currentStep - 1);
  }

  function revokePhotoUrls() {
    localPhotos.forEach(function (entry) {
      window.URL.revokeObjectURL(entry.url);
    });
    localPhotos = [];
  }

  function renderPhotoPreview() {
    const host = layer.querySelector("[data-create-photo-preview]");
    host.replaceChildren();
    if (!localPhotos.length) {
      const empty = document.createElement("p");
      empty.textContent = savedPhotoNames.length
        ? "المسودة تذكر " + savedPhotoNames.length + " ملفات سابقة دون حفظ الصور نفسها."
        : "لم يتم اختيار صور محلية.";
      host.appendChild(empty);
      return;
    }
    localPhotos.forEach(function (entry) {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      const caption = document.createElement("figcaption");
      image.src = entry.url;
      image.alt = "معاينة محلية: " + escapeText(entry.file.name);
      caption.textContent = escapeText(entry.file.name);
      figure.append(image, caption);
      host.appendChild(figure);
    });
  }

  function handlePhotos(input) {
    revokePhotoUrls();
    savedPhotoNames = [];
    Array.from(input.files || []).forEach(function (file) {
      if (!file.type || !file.type.startsWith("image/")) return;
      localPhotos.push({ file: file, url: window.URL.createObjectURL(file) });
    });
    dirty = true;
    renderPhotoPreview();
  }

  function fileApiAvailable() {
    return Boolean(window.File && window.URL &&
      typeof window.URL.createObjectURL === "function" &&
      typeof window.URL.revokeObjectURL === "function");
  }

  function configureFilePicker() {
    const picker = layer.querySelector("[data-local-file-picker]");
    const input = layer.querySelector("[data-create-photo-input]");
    const fallback = layer.querySelector("[data-file-api-fallback]");
    const available = fileApiAvailable();
    picker.hidden = !available;
    fallback.hidden = available;
    input.disabled = !available;
  }

  function draftPayload() {
    const details = collectDetails();
    const photoNames = currentPhotoNames();
    const validation = currentValidation();
    const readiness = validation || {
      ready: Boolean(details.sector && details.title && details.price !== null && details.location),
      score: 0,
      missing: [],
      warnings: []
    };
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      sector: details.sector,
      sectorLabel: details.sectorLabel,
      title: details.title,
      price: details.price,
      location: details.location,
      summary: details.summary,
      specs: details.specs,
      sectorDetails: details.sectorDetails,
      photoNames: photoNames,
      selectedLocalPhotoCount: photoNames.length,
      lastStep: currentStep,
      readinessStatus: readiness.ready ? "ready" : "incomplete",
      readinessScore: readiness.score,
      readinessUpdatedAt: new Date().toISOString(),
      missingFields: readiness.missing.slice(0, 10),
      warnings: readiness.warnings.slice(0, 10)
    };
  }

  function draftSnapshot() {
    const drafts = window.VVIP_PR32_DRAFTS;
    if (drafts && typeof drafts.readLocalDraft === "function") {
      return drafts.readLocalDraft();
    }
    return { status: "empty", draft: null };
  }

  function readDraft() {
    const snapshot = draftSnapshot();
    if (snapshot.status !== "ready") return null;
    const draft = snapshot.draft;
    return {
      version: draft.version,
      sector: draft.sector,
      sectorLabel: draft.sectorLabel,
      title: draft.title,
      price: draft.price,
      location: draft.location,
      summary: draft.summary,
      specs: draft.specs,
      sectorDetails: draft.sectorFields,
      photoNames: draft.photoFileNames,
      selectedLocalPhotoCount: draft.photoCount,
      lastStep: draft.lastStep,
      incomplete: draft.incomplete,
      readinessStatus: draft.readinessStatus,
      readinessScore: draft.readinessScore,
      readinessUpdatedAt: draft.readinessUpdatedAt,
      missingFields: draft.missingFields,
      warnings: draft.warnings
    };
  }

  function fillField(name, value) {
    const input = field(name);
    if (input) input.value = value == null ? "" : String(value);
  }

  function hydrateDraft(draft) {
    if (!draft) return;
    selectSector(draft.sector);
    fillField("title", draft.title);
    fillField("price", draft.price);
    fillField("location", draft.location);
    fillField("summary", draft.summary);
    fillField("specs", draft.specs);
    Object.keys(SECTOR_FIELD_LABELS[draft.sector] || {}).forEach(function (name) {
      fillField(name, escapeText(draft.sectorDetails[name]).slice(0, 140));
    });
    savedPhotoNames = draft.photoNames.slice();
    renderPhotoPreview();
    dirty = false;
  }

  function saveDraft() {
    if (!selectedSector) {
      setStep(0);
      const api = readinessApi();
      if (api) api.setFieldError("sector", "اختر قطاع الإعلان.");
      else setError("sector", "اختر قطاع الإعلان.");
      return;
    }
    const draft = draftPayload();
    const drafts = window.VVIP_PR32_DRAFTS;
    const saved = drafts && typeof drafts.writeLocalDraft === "function"
      ? drafts.writeLocalDraft(draft)
      : false;
    if (!saved) {
      feedback(STORAGE_FAILURE);
      return;
    }
    dirty = false;
    savedPhotoNames = draft.photoNames.slice();
    feedback(draft.readinessStatus === "ready"
      ? "تم حفظ المسودة المحلية وهي جاهزة للمراجعة لاحقًا."
      : "تم حفظ المسودة محليًا، وتحتاج إلى إكمال بعض الحقول.");
  }

  function clearDraftStorage() {
    const drafts = window.VVIP_PR32_DRAFTS;
    if (drafts && typeof drafts.clearLocalDraft === "function") {
      return drafts.clearLocalDraft();
    }
    try {
      window.localStorage.removeItem(DRAFT_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeDraft() {
    if (!clearDraftStorage()) {
      feedback(STORAGE_FAILURE);
      return false;
    }
    feedback("تم حذف المسودة المحلية من هذا الجهاز.");
    return true;
  }

  function resetShell() {
    revokePhotoUrls();
    savedPhotoNames = [];
    form.reset();
    selectedSector = "";
    dirty = false;
    layer.querySelectorAll("[data-create-sector]").forEach(function (button) {
      button.classList.remove("is-selected");
      button.setAttribute("aria-checked", "false");
    });
    layer.querySelectorAll("[data-sector-fields]").forEach(function (fieldset) {
      fieldset.hidden = true;
      fieldset.disabled = true;
    });
    setError("sector", "");
    setError("details", "");
    const api = readinessApi();
    if (api && typeof api.clearValidationErrors === "function") api.clearValidationErrors();
    renderPhotoPreview();
    setStep(0);
    const drafts = window.VVIP_PR32_DRAFTS;
    if (drafts && typeof drafts.renderDraftPreview === "function") {
      drafts.renderDraftPreview();
    }
  }

  function openShell(mode) {
    try {
      resetShell();
      const draft = mode === "new" ? null : readDraft();
      if (draft) hydrateDraft(draft);
      lastFocusedElement = document.activeElement;
      layer.hidden = false;
      layer.setAttribute("aria-hidden", "false");
      document.body.classList.add("vvip-create-open");
      setStep(draft ? draft.lastStep || 1 : 0);
      if (draft && draft.incomplete) {
        feedback("تم فتح المسودة، قد تحتاج لإكمال بعض الحقول.");
      }
      window.setTimeout(function () {
        layer.querySelector(".vvip-create-shell").focus();
      }, 0);
    } catch (error) {
      feedback(OPEN_FAILURE);
    }
  }

  function requestOpenShell() {
    const snapshot = draftSnapshot();
    if (snapshot.status === "ready") {
      openConfirmation("draftChoice");
      return;
    }
    if (snapshot.status === "corrupt") {
      feedback("تعذر قراءة المسودة المحلية. يمكنك حذفها أو إنشاء مسودة جديدة.");
      openConfirmation("newDraft");
      return;
    }
    openShell("new");
  }

  function resumeDraft() {
    const snapshot = draftSnapshot();
    if (snapshot.status !== "ready") {
      feedback(snapshot.status === "corrupt"
        ? "تعذر قراءة المسودة المحلية. يمكنك حذفها أو إنشاء مسودة جديدة."
        : "لا توجد مسودة محلية لاستكمالها الآن.");
      return;
    }
    openShell("resume");
  }

  function requestDeleteDraft() {
    openConfirmation("delete");
  }

  function requestNewDraft() {
    const snapshot = draftSnapshot();
    if (snapshot.status === "ready" || snapshot.status === "corrupt") {
      openConfirmation("newDraft");
      return;
    }
    openShell("new");
  }

  function openConfirmation(type) {
    const content = CONFIRMATIONS[type];
    if (!content || !confirmation) return;
    pendingConfirmation = type;
    confirmationLastFocus = document.activeElement;
    confirmation.querySelector("[data-create-confirm-title]").textContent = content.title;
    confirmation.querySelector("[data-create-confirm-message]").textContent = content.message;
    const cancel = confirmation.querySelector("[data-create-confirm-cancel]:not(.vvip-create-confirmation__backdrop)");
    const accept = confirmation.querySelector("[data-create-confirm-accept]");
    cancel.textContent = content.cancel;
    accept.textContent = content.accept;
    accept.classList.toggle("vvip-create-danger", content.destructive);
    confirmation.hidden = false;
    confirmation.setAttribute("aria-hidden", "false");
    document.body.classList.add("vvip-confirm-open");
    window.setTimeout(function () { cancel.focus(); }, 0);
  }

  function closeConfirmation(restoreFocus) {
    if (!confirmation || confirmation.hidden) return;
    confirmation.hidden = true;
    confirmation.setAttribute("aria-hidden", "true");
    document.body.classList.remove("vvip-confirm-open");
    pendingConfirmation = "";
    if (restoreFocus !== false && confirmationLastFocus &&
      document.contains(confirmationLastFocus)) {
      confirmationLastFocus.focus();
    }
    confirmationLastFocus = null;
  }

  function transitionConfirmation(type) {
    const origin = confirmationLastFocus;
    closeConfirmation(false);
    openConfirmation(type);
    confirmationLastFocus = origin;
  }

  function cancelConfirmation() {
    const action = pendingConfirmation;
    if (action === "draftChoice") {
      const origin = confirmationLastFocus;
      closeConfirmation(false);
      openShell("resume");
      lastFocusedElement = origin;
      return;
    }
    closeConfirmation(true);
  }

  function performCloseShell() {
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    layer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("vvip-create-open");
    resetShell();
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  function requestCloseShell() {
    if (!layer || layer.hidden) return;
    if (dirty) {
      openConfirmation("close");
      return;
    }
    performCloseShell();
  }

  function acceptConfirmation() {
    const action = pendingConfirmation;
    if (action === "delete") {
      removeDraft();
      closeConfirmation(false);
      return;
    }
    if (action === "close") {
      closeConfirmation(false);
      performCloseShell();
      return;
    }
    if (action === "draftChoice") {
      transitionConfirmation("newDraft");
      return;
    }
    if (action === "newDraft") {
      const origin = confirmationLastFocus;
      if (!clearDraftStorage()) {
        feedback(STORAGE_FAILURE);
        return;
      }
      closeConfirmation(false);
      openShell("new");
      lastFocusedElement = origin;
    }
  }

  function renderAccountDraft() {
    const host = document.querySelector("[data-vvip-local-draft-list]");
    if (!host) return;
    host.replaceChildren();
    const draft = readDraft();
    if (!draft) return;

    const card = document.createElement("article");
    card.className = "managed-card vvip-local-draft-card";
    const visual = document.createElement("div");
    visual.className = "managed-visual vvip-local-draft-visual";
    const sector = document.createElement("span");
    sector.textContent = draft.sectorLabel;
    visual.appendChild(sector);

    const body = document.createElement("div");
    const status = document.createElement("span");
    status.className = "listing-state";
    status.textContent = "مسودة محلية";
    const title = document.createElement("h3");
    title.textContent = draft.title || "مسودة بدون عنوان";
    const price = document.createElement("strong");
    price.textContent = draft.price === null ? "سعر غير مكتمل" : draft.price.toLocaleString("ar-SA") + " ر.س";
    const actions = document.createElement("div");
    actions.className = "managed-actions";
    const preview = document.createElement("button");
    preview.type = "button";
    preview.dataset.previewLocalDraft = "true";
    preview.textContent = "معاينة";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.deleteLocalDraft = "true";
    remove.textContent = "حذف المسودة محليًا";
    actions.append(preview, remove);
    body.append(status, title, price, actions);
    card.append(visual, body);
    host.appendChild(card);
  }

  function trapFocus(event, root) {
    if (event.key !== "Tab" || !root || root.hidden) return;
    const focusable = Array.from(root.querySelectorAll(
      "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex='0']"
    )).filter(function (node) {
      return node.tabIndex >= 0 && !node.closest("[hidden]");
    });
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
        escapeText: escapeText,
        parseSafePrice: parseSafePrice
      });
    }
    return;
  }

  buildShell();
  configureFilePicker();
  renderPhotoPreview();

  document.addEventListener("click", function (event) {
    const open = event.target.closest("[data-open-create-listing]");
    if (open) {
      event.preventDefault();
      requestOpenShell();
      return;
    }
    const sector = event.target.closest("[data-create-sector]");
    if (sector) {
      selectSector(sector.dataset.createSector);
      dirty = true;
      return;
    }
    if (event.target.closest("[data-create-next]")) {
      nextStep();
      return;
    }
    const back = event.target.closest("[data-create-back]");
    if (back) {
      previousStep(back.hasAttribute("data-edit-details"));
      return;
    }
    if (event.target.closest("[data-save-local-draft]")) {
      saveDraft();
      return;
    }
    if (event.target.closest("[data-preview-local-draft]")) {
      resumeDraft();
      return;
    }
    if (event.target.closest("[data-delete-local-draft]")) {
      requestDeleteDraft();
      return;
    }
    const confirmationCancel = event.target.closest("[data-create-confirm-cancel]");
    if (confirmationCancel) {
      if (confirmationCancel.classList.contains("vvip-create-confirmation__backdrop")) {
        closeConfirmation(true);
      } else {
        cancelConfirmation();
      }
      return;
    }
    if (event.target.closest("[data-create-confirm-accept]")) {
      acceptConfirmation();
      return;
    }
    if (event.target.closest("[data-create-close]")) requestCloseShell();
  });

  form.addEventListener("input", function (event) {
    dirty = true;
    const api = readinessApi();
    if (api && event.target && event.target.name) {
      api.setFieldError(event.target.name, "");
      setError("details", "");
    }
  });
  layer.querySelector("[data-create-photo-input]").addEventListener("change", function (event) {
    handlePhotos(event.target);
  });
  document.addEventListener("keydown", function (event) {
    if (!confirmation.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeConfirmation(true);
        return;
      }
      trapFocus(event, confirmation);
      return;
    }
    if (layer.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      requestCloseShell();
      return;
    }
    trapFocus(event, layer);
  });

  window.VVIP_PR31_CREATE_LISTING = Object.freeze({
    open: requestOpenShell,
    resume: resumeDraft,
    startNew: requestNewDraft,
    requestDelete: requestDeleteDraft,
    sessionPreview: function () {
      return localPhotos.length
        ? { url: localPhotos[0].url, count: localPhotos.length }
        : { url: "", count: savedPhotoNames.length };
    },
    currentDraft: function () {
      return layer && !layer.hidden ? draftPayload() : null;
    },
    close: requestCloseShell,
    escapeText: escapeText,
    parseSafePrice: parseSafePrice,
    draftKey: DRAFT_KEY
  });
})();
