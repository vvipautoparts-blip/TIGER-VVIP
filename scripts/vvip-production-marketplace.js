(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else api.mount();
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const CURRENCY_FRACTIONS = Object.freeze({ JOD: 3, KWD: 3, BHD: 3, OMR: 3, TND: 3, JPY: 0, KRW: 0 });
  const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
  const MAX_IMAGES = 7;
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const MAX_PIXELS = 40_000_000;
  const OUTPUT_WIDTH = 1600;
  const OUTPUT_HEIGHT = 1200;
  const SECTORS = Object.freeze([
    Object.freeze({ value: "automotive", label: "السيارات وقطع الغيار والخدمات" }),
    Object.freeze({ value: "real-estate", label: "العقارات" }),
    Object.freeze({ value: "construction", label: "البناء والمقاولات" }),
    Object.freeze({ value: "professional-services", label: "الخدمات والمهن والحرف" }),
    Object.freeze({ value: "equipment", label: "المعدات والآليات" }),
    Object.freeze({ value: "trade-supply", label: "التجارة والتوريد والأعمال" }),
    Object.freeze({ value: "engineering-consulting", label: "الهندسة والاستشارات والتصميم" })
  ]);

  function uiError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  function cleanText(value, maximum) {
    return String(value == null ? "" : value)
      .replace(/<[^>]*>/g, " ")
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maximum);
  }

  function currencyFraction(currency) {
    return Object.prototype.hasOwnProperty.call(CURRENCY_FRACTIONS, currency)
      ? CURRENCY_FRACTIONS[currency]
      : 2;
  }

  function moneyToMinor(value, currency) {
    const code = cleanText(currency, 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) throw uiError("CURRENCY_INVALID");
    const fraction = currencyFraction(code);
    const normalized = String(value == null ? "" : value)
      .trim()
      .replace(/[٠-٩]/g, function (digit) { return "٠١٢٣٤٥٦٧٨٩".indexOf(digit); })
      .replace(/[۰-۹]/g, function (digit) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(digit); })
      .replace(/[٬,\s]/g, "")
      .replace(/٫/g, ".");
    const pattern = fraction === 0
      ? /^\d+$/
      : new RegExp("^\\d+(?:\\.\\d{1," + fraction + "})?$");
    if (!pattern.test(normalized)) throw uiError("PRICE_INVALID");
    const parts = normalized.split(".");
    const whole = parts[0].replace(/^0+(?=\d)/, "") || "0";
    const decimal = (parts[1] || "").padEnd(fraction, "0");
    const minor = BigInt(whole + decimal);
    if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER)) throw uiError("PRICE_INVALID");
    return Number(minor);
  }

  function formatMoney(minor, currency, locale) {
    const fraction = currencyFraction(currency);
    return new Intl.NumberFormat(locale || "ar", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction
    }).format(Number(minor) / (10 ** fraction));
  }

  function whatsappUrl(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) throw uiError("PHONE_INVALID");
    return "https://wa.me/" + digits;
  }

  function phoneUrl(phone) {
    const source = String(phone || "").trim();
    const normalized = source.replace(/[^+\d]/g, "");
    if (normalized.replace(/\D/g, "").length < 7) throw uiError("PHONE_INVALID");
    return "tel:" + normalized;
  }

  function validateFiles(files) {
    const list = Array.from(files || []);
    if (list.length > MAX_IMAGES) throw uiError("MEDIA_LIMIT_EXCEEDED");
    list.forEach(function (file) {
      if (!ALLOWED_MIME.has(file.type)) throw uiError("MEDIA_MIME_INVALID");
      if (!file.size || file.size > MAX_FILE_BYTES) throw uiError("MEDIA_SIZE_INVALID");
    });
    return list;
  }

  async function processImage(file) {
    if (!root.createImageBitmap || !root.document) throw uiError("MEDIA_PROCESSING_UNAVAILABLE");
    const bitmap = await root.createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > MAX_PIXELS) {
        throw uiError("MEDIA_DIMENSIONS_INVALID");
      }
      const sourceRatio = bitmap.width / bitmap.height;
      const targetRatio = 4 / 3;
      let sx = 0;
      let sy = 0;
      let sw = bitmap.width;
      let sh = bitmap.height;
      if (sourceRatio > targetRatio) {
        sw = Math.round(bitmap.height * targetRatio);
        sx = Math.round((bitmap.width - sw) / 2);
      } else {
        sh = Math.round(bitmap.width / targetRatio);
        sy = Math.round((bitmap.height - sh) / 2);
      }
      const canvas = root.document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw uiError("MEDIA_PROCESSING_UNAVAILABLE");
      context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
      const blob = await new Promise(function (resolve, reject) {
        canvas.toBlob(function (output) {
          if (output) resolve(output);
          else reject(uiError("MEDIA_ENCODE_FAILED"));
        }, "image/webp", 0.86);
      });
      canvas.width = 0;
      canvas.height = 0;
      return Object.freeze({
        blob: blob,
        mimeType: "image/webp",
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
        altText: "صورة الإعلان"
      });
    } finally {
      if (bitmap && typeof bitmap.close === "function") bitmap.close();
    }
  }

  function messageFor(error) {
    const code = error && error.code;
    const messages = {
      AUTH_REQUIRED: "سجّل الدخول أولًا.",
      MARKETPLACE_COUNTRY_NOT_ACTIVE: "هذا السوق غير مفعّل رسميًا بعد.",
      LISTING_CREATE_FAILED: "تعذر حفظ الإعلان. تحقق من السوق والبيانات.",
      MEDIA_LIMIT_EXCEEDED: "يمكن رفع سبع صور كحد أقصى.",
      MEDIA_MIME_INVALID: "الصور المدعومة: JPG وPNG وWebP فقط.",
      MEDIA_SIZE_INVALID: "إحدى الصور تتجاوز الحجم المسموح.",
      MEDIA_DIMENSIONS_INVALID: "أبعاد إحدى الصور غير آمنة للمعالجة.",
      PRICE_INVALID: "أدخل سعرًا صحيحًا وفق العملة المختارة.",
      CURRENCY_INVALID: "رمز العملة غير صحيح.",
      PHONE_INVALID: "رقم التواصل غير صحيح.",
      LISTINGS_READ_FAILED: "تعذر تحميل الإعلانات الآن.",
      ENTITLEMENT_REQUIRED: "اختر خدمة الظهور المناسبة قبل النشر.",
      PUBLICATION_TRANSPORT_UNAVAILABLE: "النشر المدفوع لهذا السوق لم يُفعّل بعد. إعلانك محفوظ بأمان.",
      RUNTIME_BOOT_FAILED: "تعذر تشغيل الاتصال الآمن بالمنصة."
    };
    return messages[code] || "تعذر إكمال العملية بأمان. حاول مرة أخرى.";
  }

  function sectorLabel(value) {
    const match = SECTORS.find(function (sector) { return sector.value === value; });
    return match ? match.label : value;
  }

  function mount() {
    if (!root.document) return;
    const doc = root.document;
    const app = doc.querySelector("[data-vvip-unified-home]");
    const gate = doc.querySelector("[data-vvip-auth-gate]");
    const feed = doc.querySelector("[data-vvip-marketplace-feed]");
    const results = doc.querySelector("[data-results-count]");
    const empty = doc.querySelector("[data-empty-state]");
    const search = doc.querySelector("[data-listing-search]");
    const sheet = doc.querySelector("[data-vvip-listing-detail-sheet]");
    const sheetContent = doc.querySelector("[data-sheet-content]");
    const toast = doc.querySelector("[data-app-toast]");
    const state = {
      sector: "all",
      search: "",
      listings: [],
      favorites: new Set(),
      repository: null,
      runtime: null,
      draftListingId: null,
      selectedPlan: null
    };
    let toastTimer = null;
    let searchTimer = null;
    let modal = null;

    function showToast(message, error) {
      if (!toast) return;
      clearTimeout(toastTimer);
      toast.textContent = message;
      toast.dataset.state = error ? "error" : "success";
      toast.hidden = false;
      toastTimer = setTimeout(function () { toast.hidden = true; }, 4500);
    }

    function setView(home) {
      if (app) app.hidden = !home;
      if (gate) gate.hidden = home;
      doc.body.classList.toggle("is-home", home);
    }

    root.VVIP_PR29 = Object.freeze({
      showHome: function () { setView(true); refresh().catch(report); },
      showGate: function () { setView(false); },
      refresh: function () { return refresh(); }
    });

    function report(error) {
      console.warn("VVIP_MARKETPLACE_RECOVERY", error && error.code);
      showToast(messageFor(error), true);
    }

    function cover(listing) {
      const media = Array.isArray(listing.media) ? listing.media.slice() : [];
      media.sort(function (a, b) { return Number(b.is_cover) - Number(a.is_cover) || a.position - b.position; });
      return media.find(function (item) { return item.url; }) || null;
    }

    function shareListing(listing) {
      const url = root.location ? root.location.href.split("#")[0] + "#listing-" + encodeURIComponent(listing.listing_id) : "";
      const payload = { title: listing.title, text: listing.summary || listing.title, url: url };
      if (root.navigator && typeof root.navigator.share === "function") {
        return root.navigator.share(payload);
      }
      if (root.navigator && root.navigator.clipboard && typeof root.navigator.clipboard.writeText === "function") {
        return root.navigator.clipboard.writeText(url).then(function () {
          showToast("تم نسخ رابط الإعلان.", false);
        });
      }
      showToast("المشاركة غير متاحة على هذا الجهاز حاليًا.", true);
      return Promise.resolve();
    }

    function createCard(listing) {
      const article = doc.createElement("article");
      article.className = "listing-card vvip-production-listing";
      article.dataset.listingCard = listing.listing_id;
      article.id = "listing-" + listing.listing_id;

      const visual = doc.createElement("button");
      visual.type = "button";
      visual.className = "listing-visual";
      visual.dataset.listingDetails = listing.listing_id;
      visual.setAttribute("aria-label", "عرض تفاصيل " + listing.title);
      const image = cover(listing);
      if (image) {
        const img = doc.createElement("img");
        img.src = image.url;
        img.alt = image.alt_text || "صورة الإعلان";
        img.loading = "lazy";
        img.decoding = "async";
        visual.appendChild(img);
      } else {
        const label = doc.createElement("span");
        label.textContent = sectorLabel(listing.sector);
        visual.appendChild(label);
      }

      const body = doc.createElement("div");
      body.className = "listing-card__body";
      const meta = doc.createElement("div");
      meta.className = "vvip-card-meta";
      const sector = doc.createElement("span");
      sector.className = "vvip-card-sector";
      sector.textContent = sectorLabel(listing.sector);
      const location = doc.createElement("span");
      location.className = "listing-location";
      location.textContent = listing.location_label + " · " + listing.active_market_country;
      meta.append(sector, location);

      const title = doc.createElement("h3");
      title.textContent = listing.title;
      const price = doc.createElement("strong");
      price.className = "listing-price";
      price.textContent = formatMoney(listing.price_minor, listing.currency_code, doc.documentElement.lang || "ar");
      const summary = doc.createElement("p");
      summary.className = "listing-summary";
      summary.textContent = listing.summary || "";

      const actions = doc.createElement("div");
      actions.className = "card-actions vvip-card-actions";
      if (listing.contact_phone) {
        const contact = doc.createElement("a");
        contact.className = "button button--primary vvip-card-primary";
        contact.dataset.vvipCardContact = "true";
        contact.href = phoneUrl(listing.contact_phone);
        contact.textContent = "اتصال مباشر";
        actions.appendChild(contact);
      } else {
        const details = doc.createElement("button");
        details.type = "button";
        details.className = "button button--primary vvip-card-primary";
        details.dataset.listingDetails = listing.listing_id;
        details.dataset.vvipCardContact = "true";
        details.textContent = "عرض التفاصيل";
        actions.appendChild(details);
      }

      const favorite = doc.createElement("button");
      favorite.type = "button";
      favorite.className = "button button--quiet vvip-icon-action";
      favorite.dataset.listingFavorite = listing.listing_id;
      favorite.dataset.vvipCardSave = "true";
      favorite.setAttribute("aria-label", "حفظ الإعلان");
      favorite.textContent = state.favorites.has(listing.listing_id) ? "محفوظ ✓" : "حفظ";
      actions.appendChild(favorite);

      const share = doc.createElement("button");
      share.type = "button";
      share.className = "button button--quiet vvip-icon-action";
      share.dataset.listingShare = listing.listing_id;
      share.dataset.vvipCardShare = "true";
      share.setAttribute("aria-label", "مشاركة الإعلان");
      share.textContent = "مشاركة";
      actions.appendChild(share);

      if (listing.whatsapp_enabled && listing.contact_phone) {
        const whatsapp = doc.createElement("a");
        whatsapp.className = "button button--quiet vvip-icon-action";
        whatsapp.href = whatsappUrl(listing.contact_phone);
        whatsapp.target = "_blank";
        whatsapp.rel = "noopener noreferrer";
        whatsapp.textContent = "واتساب";
        actions.appendChild(whatsapp);
      }

      body.append(meta, title, price, summary, actions);
      article.append(visual, body);
      return article;
    }

    function render() {
      if (!feed) return;
      feed.replaceChildren(...state.listings.map(createCard));
      feed.setAttribute("aria-busy", "false");
      if (results) results.textContent = state.listings.length + " إعلانات";
      if (empty) empty.hidden = state.listings.length !== 0;
    }

    async function refresh() {
      if (!state.repository || !root.Clerk || !root.Clerk.isSignedIn) return;
      if (feed) feed.setAttribute("aria-busy", "true");
      state.listings = await state.repository.listPublic({
        sector: state.sector,
        search: state.search,
        countryCode: state.runtime.config.defaultCountryCode,
        limit: 30
      });
      render();
    }

    function openDetails(id) {
      const listing = state.listings.find(function (item) { return item.listing_id === id; });
      if (!listing || !sheet || !sheetContent) return;
      sheetContent.replaceChildren();
      const title = doc.createElement("h2");
      title.id = "sheet-title";
      title.textContent = listing.title;
      const price = doc.createElement("strong");
      price.className = "listing-price";
      price.textContent = formatMoney(listing.price_minor, listing.currency_code, doc.documentElement.lang || "ar");
      const summary = doc.createElement("p");
      summary.textContent = listing.summary || "";
      const location = doc.createElement("p");
      location.textContent = listing.location_label + " · " + listing.active_market_country;
      const disclaimer = doc.createElement("p");
      disclaimer.className = "disclaimer";
      disclaimer.textContent = "VVIP TIGER منصة عرض وتواصل وليست طرفًا في البيع أو الدفع أو العقود.";
      sheetContent.append(title, price, location, summary, disclaimer);
      sheet.hidden = false;
      sheet.setAttribute("aria-hidden", "false");
      doc.body.classList.add("sheet-open");
    }

    function closeDetails() {
      if (!sheet) return;
      sheet.hidden = true;
      sheet.setAttribute("aria-hidden", "true");
      doc.body.classList.remove("sheet-open");
    }

    function sectorOptions() {
      return SECTORS.map(function (sector) {
        return '<option value="' + sector.value + '">' + sector.label + "</option>";
      }).join("");
    }

    function formMarkup(config) {
      const country = cleanText(config.defaultCountryCode, 2);
      return `<div class="vvip-production-modal" data-production-listing-modal aria-hidden="true" hidden>
        <button type="button" class="vvip-production-backdrop" data-production-close aria-label="إغلاق"></button>
        <section role="dialog" aria-modal="true" aria-labelledby="production-listing-title" class="vvip-production-dialog" data-vvip-create-flow>
          <button type="button" class="vvip-production-close" data-production-close aria-label="إغلاق">×</button>
          <div class="vvip-create-heading">
            <span class="vvip-step-kicker">VVIP TIGER STUDIO</span>
            <h2 id="production-listing-title">أنشئ إعلانك بحرية</h2>
            <p>أكمل المحتوى أولًا، راجعه كما سيظهر، ثم اختر خدمة الظهور والدفع المناسبة لسوقك.</p>
          </div>
          <div class="vvip-stepper" aria-label="مراحل إنشاء الإعلان">
            <span data-step-dot="content" class="is-active">1 المحتوى</span>
            <span data-step-dot="preview">2 المعاينة</span>
            <span data-step-dot="plan">3 الظهور</span>
            <span data-step-dot="payment">4 الدفع</span>
          </div>
          <form data-production-listing-form novalidate>
            <section class="vvip-create-step is-active" data-vvip-content-step data-step="content">
              <label>القطاع<select name="sector" required><option value="">اختر القطاع</option>${sectorOptions()}</select></label>
              <label>العنوان<input name="title" required minlength="2" maxlength="80" placeholder="عنوان واضح ومباشر"></label>
              <div class="vvip-production-grid"><label>السعر<input name="price" inputmode="decimal" required placeholder="0"></label><label>العملة<input name="currency" value="JOD" maxlength="3" required></label></div>
              <div class="vvip-production-grid"><label>الدولة<input name="country" value="${country}" maxlength="2" required></label><label>الموقع<input name="location" maxlength="120" required placeholder="المدينة أو المنطقة"></label></div>
              <label>الوصف<textarea name="summary" maxlength="2000" rows="5" placeholder="ما الذي يجب أن يعرفه المهتم؟"></textarea></label>
              <label>رقم التواصل اختياري<input name="phone" inputmode="tel" maxlength="32" placeholder="+962..."></label>
              <label class="vvip-production-check"><input name="whatsapp" type="checkbox"> إظهار رابط واتساب الخارجي عند توفر الرقم</label>
              <label class="vvip-media-drop">الصور — حتى 7 صور آمنة<input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple><small>JPG / PNG / WebP فقط. الفيديو غير مفعل.</small></label>
              <div class="vvip-step-actions"><button class="button button--primary" type="button" data-create-next="preview">معاينة الإعلان</button></div>
            </section>

            <section class="vvip-create-step" data-vvip-preview-step data-step="preview" hidden>
              <div class="vvip-preview-card" data-vvip-preview-card></div>
              <p class="vvip-trust-note">لن تُخصم أي قيمة في هذه المرحلة. يمكنك العودة والتعديل قبل اختيار الظهور.</p>
              <div class="vvip-step-actions"><button class="button button--quiet" type="button" data-create-back="content">تعديل المحتوى</button><button class="button button--primary" type="button" data-save-draft>حفظ ومتابعة</button></div>
            </section>

            <section class="vvip-create-step" data-vvip-plan-step data-step="plan" hidden>
              <div class="vvip-step-intro"><span class="vvip-step-kicker">VISIBILITY</span><h3>اختر قوة الظهور المناسبة</h3><p>الأسعار والكمية تأتي من سياسة السوق المعتمدة؛ لا توجد أسعار عالمية مخفية أو ثابتة داخل الواجهة.</p></div>
              <div class="vvip-plan-grid" data-vvip-plan-options></div>
              <div class="vvip-step-actions"><button class="button button--quiet" type="button" data-create-back="preview">العودة للمعاينة</button><button class="button button--primary" type="button" data-create-next="payment" disabled>متابعة إلى الدفع</button></div>
            </section>

            <section class="vvip-create-step" data-vvip-payment-step data-step="payment" hidden>
              <div class="vvip-payment-shell">
                <span class="vvip-step-kicker">SECURE PAYMENT</span>
                <h3>الدفع الآمن</h3>
                <p data-vvip-payment-summary>سيظهر مزود الدفع المعتمد لهذا السوق بعد اختيار خدمة ظهور صالحة.</p>
                <div class="vvip-security-row"><span>✓ تحقق من الجلسة</span><span>✓ سعر من سياسة الدولة</span><span>✓ لا نجاح وهمي</span></div>
              </div>
              <div class="vvip-step-actions"><button class="button button--quiet" type="button" data-create-back="plan">تغيير الظهور</button><button class="button button--primary" type="button" data-publish-listing>الدفع والنشر</button></div>
            </section>
            <p data-production-progress class="vvip-progress" role="status" aria-live="polite"></p>
          </form>
        </section>
      </div>`;
    }

    function setCreateStep(step) {
      if (!modal) return;
      modal.querySelectorAll("[data-step]").forEach(function (section) {
        const active = section.dataset.step === step;
        section.hidden = !active;
        section.classList.toggle("is-active", active);
      });
      modal.querySelectorAll("[data-step-dot]").forEach(function (dot) {
        dot.classList.toggle("is-active", dot.dataset.stepDot === step);
      });
      const dialog = modal.querySelector(".vvip-production-dialog");
      if (dialog) dialog.scrollTop = 0;
    }

    function listingInput(form) {
      const data = new FormData(form);
      return {
        sector: data.get("sector"),
        title: data.get("title"),
        summary: data.get("summary"),
        location: data.get("location"),
        priceMinor: moneyToMinor(data.get("price"), String(data.get("currency") || "").toUpperCase()),
        currencyCode: String(data.get("currency") || "").toUpperCase(),
        activeMarketCountry: String(data.get("country") || "").toUpperCase(),
        contactPhone: data.get("phone"),
        whatsappEnabled: data.get("whatsapp") === "on"
      };
    }

    function renderPreview(form) {
      if (!form.reportValidity()) return false;
      let input;
      try { input = listingInput(form); } catch (error) { report(error); return false; }
      const node = form.querySelector("[data-vvip-preview-card]");
      if (!node) return false;
      node.replaceChildren();
      const eyebrow = doc.createElement("span");
      eyebrow.className = "vvip-card-sector";
      eyebrow.textContent = sectorLabel(input.sector);
      const title = doc.createElement("h3");
      title.textContent = cleanText(input.title, 80);
      const price = doc.createElement("strong");
      price.className = "listing-price";
      price.textContent = formatMoney(input.priceMinor, input.currencyCode, doc.documentElement.lang || "ar");
      const location = doc.createElement("p");
      location.textContent = cleanText(input.location, 120) + " · " + input.activeMarketCountry;
      const summary = doc.createElement("p");
      summary.textContent = cleanText(input.summary, 2000) || "بدون وصف إضافي";
      const media = doc.createElement("small");
      media.textContent = validateFiles(form.elements.images.files).length + " صور مرفقة";
      node.append(eyebrow, title, price, location, summary, media);
      return true;
    }

    function approvedPlans() {
      const config = state.runtime && state.runtime.config;
      const raw = config && Array.isArray(config.visibilityPlans) ? config.visibilityPlans : [];
      return raw.filter(function (plan) {
        return plan && plan.id && plan.label && Number.isSafeInteger(Number(plan.priceMinor)) && Number(plan.priceMinor) > 0 && /^[A-Z]{3}$/.test(String(plan.currency || ""));
      }).slice(0, 6);
    }

    function renderPlans() {
      if (!modal) return;
      const host = modal.querySelector("[data-vvip-plan-options]");
      const next = modal.querySelector('[data-create-next="payment"]');
      if (!host || !next) return;
      host.replaceChildren();
      state.selectedPlan = null;
      next.disabled = true;
      const plans = approvedPlans();
      if (!plans.length) {
        const emptyPlan = doc.createElement("div");
        emptyPlan.className = "vvip-plan-empty";
        emptyPlan.innerHTML = "<strong>خطط الظهور لم تُفعّل لهذا السوق بعد.</strong><span>إعلانك محفوظ كمسودة ولن نفترض سعرًا أو نخصم أي قيمة.</span>";
        host.appendChild(emptyPlan);
        return;
      }
      plans.forEach(function (plan) {
        const button = doc.createElement("button");
        button.type = "button";
        button.className = "vvip-plan-card";
        button.dataset.planId = String(plan.id);
        const amount = formatMoney(Number(plan.priceMinor), String(plan.currency), doc.documentElement.lang || "ar");
        button.innerHTML = "<span>" + cleanText(plan.label, 80) + "</span><strong>" + amount + "</strong><small>" + cleanText(plan.description || "خدمة ظهور معتمدة لهذا السوق", 160) + "</small>";
        button.addEventListener("click", function () {
          state.selectedPlan = plan;
          host.querySelectorAll(".vvip-plan-card").forEach(function (item) { item.classList.toggle("is-selected", item === button); });
          next.disabled = false;
        });
        host.appendChild(button);
      });
    }

    async function saveDraft(form) {
      const progress = form.querySelector("[data-production-progress]");
      if (!state.repository || typeof state.repository.createDraftWithMedia !== "function") throw uiError("RUNTIME_BOOT_FAILED");
      progress.textContent = "جاري فحص الصور وحفظ مسودتك الآمنة…";
      const files = validateFiles(form.elements.images.files);
      const processed = [];
      for (let index = 0; index < files.length; index += 1) {
        progress.textContent = "معالجة الصورة " + (index + 1) + " من " + files.length;
        const image = await processImage(files[index]);
        processed.push(Object.assign({}, image, { isCover: index === 0 }));
      }
      const result = await state.repository.createDraftWithMedia(listingInput(form), processed);
      state.draftListingId = result.listing_id;
      progress.textContent = "تم حفظ المسودة. اختر الآن خدمة الظهور المناسبة.";
      renderPlans();
      setCreateStep("plan");
    }

    async function preparePublication(form) {
      const progress = form.querySelector("[data-production-progress]");
      if (!state.draftListingId || !state.selectedPlan) throw uiError("ENTITLEMENT_REQUIRED");
      if (!state.repository || typeof state.repository.prepareForPublication !== "function") throw uiError("PUBLICATION_TRANSPORT_UNAVAILABLE");
      progress.textContent = "جاري التحقق من الاستحقاق والدفع…";
      return state.repository.prepareForPublication(state.draftListingId, {
        planId: state.selectedPlan.id,
        entitlementReceipt: null
      });
    }

    function ensureModal() {
      if (modal) return modal;
      const host = doc.createElement("div");
      host.innerHTML = formMarkup(state.runtime.config);
      modal = host.firstElementChild;
      doc.body.appendChild(modal);
      return modal;
    }

    function resetCreateFlow(node) {
      const form = node.querySelector("form");
      if (form) form.reset();
      state.draftListingId = null;
      state.selectedPlan = null;
      const progress = node.querySelector("[data-production-progress]");
      if (progress) progress.textContent = "";
      setCreateStep("content");
    }

    function openCreate() {
      const node = ensureModal();
      node.hidden = false;
      node.setAttribute("aria-hidden", "false");
      setCreateStep("content");
      const focus = node.querySelector("input,select,textarea");
      if (focus) focus.focus();
    }

    function closeCreate() {
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      doc.body.classList.remove("vvip-create-open");
    }

    async function showMyListings() {
      try {
        const rows = await state.repository.listMine();
        const node = ensureModal();
        const dialog = node.querySelector(".vvip-production-dialog");
        dialog.replaceChildren();
        const close = doc.createElement("button");
        close.type = "button";
        close.className = "vvip-production-close";
        close.dataset.productionClose = "true";
        close.textContent = "×";
        const title = doc.createElement("h2");
        title.textContent = "إعلاناتي";
        const list = doc.createElement("div");
        list.className = "vvip-my-listings";
        rows.forEach(function (item) {
          const card = doc.createElement("article");
          const name = doc.createElement("h3");
          name.textContent = item.title;
          const status = doc.createElement("strong");
          status.className = "vvip-status-chip";
          status.textContent = item.status;
          const location = doc.createElement("p");
          location.textContent = item.location_label;
          card.append(name, status, location);
          list.appendChild(card);
        });
        if (!rows.length) {
          const emptyMessage = doc.createElement("p");
          emptyMessage.textContent = "لا توجد إعلانات محفوظة في حسابك.";
          list.appendChild(emptyMessage);
        }
        dialog.append(close, title, list);
        node.hidden = false;
        node.setAttribute("aria-hidden", "false");
      } catch (error) { report(error); }
    }

    function ensureFab() {
      if (doc.querySelector("[data-vvip-fab]")) return;
      const fab = doc.createElement("button");
      fab.type = "button";
      fab.className = "vvip-fab";
      fab.dataset.vvipFab = "true";
      fab.dataset.openCreateListing = "true";
      fab.setAttribute("aria-label", "إنشاء إعلان جديد");
      fab.innerHTML = '<span aria-hidden="true">＋</span><small>إعلان</small>';
      doc.body.appendChild(fab);
    }

    doc.addEventListener("click", function (event) {
      const create = event.target.closest("[data-open-create-listing], [data-vvip-fab]");
      if (create) { event.preventDefault(); event.stopImmediatePropagation(); openCreate(); return; }
      if (event.target.closest("[data-production-close]")) { event.preventDefault(); closeCreate(); return; }
      const details = event.target.closest("[data-listing-details]");
      if (details) { openDetails(details.dataset.listingDetails); return; }
      if (event.target.closest("[data-sheet-close]")) { closeDetails(); return; }

      const favorite = event.target.closest("[data-listing-favorite]");
      if (favorite) {
        const id = favorite.dataset.listingFavorite;
        const next = !state.favorites.has(id);
        state.repository.toggleFavorite(id, next).then(function () {
          if (next) state.favorites.add(id); else state.favorites.delete(id);
          favorite.textContent = next ? "محفوظ ✓" : "حفظ";
        }).catch(report);
        return;
      }

      const share = event.target.closest("[data-listing-share]");
      if (share) {
        const listing = state.listings.find(function (item) { return item.listing_id === share.dataset.listingShare; });
        if (listing) shareListing(listing).catch(report);
        return;
      }

      const next = event.target.closest("[data-create-next]");
      if (next && modal) {
        const form = modal.querySelector("form");
        const target = next.dataset.createNext;
        if (target === "preview") {
          if (renderPreview(form)) setCreateStep("preview");
          return;
        }
        if (target === "payment") {
          if (!state.selectedPlan) { report(uiError("ENTITLEMENT_REQUIRED")); return; }
          const summary = modal.querySelector("[data-vvip-payment-summary]");
          if (summary) summary.textContent = "سيتم توجيهك لمزود الدفع المعتمد لخطة " + cleanText(state.selectedPlan.label, 80) + ". لا يعتبر الإعلان منشورًا قبل تأكيد الدفع من الخادم.";
          setCreateStep("payment");
          return;
        }
      }

      const back = event.target.closest("[data-create-back]");
      if (back) { setCreateStep(back.dataset.createBack); return; }

      const save = event.target.closest("[data-save-draft]");
      if (save && modal) {
        save.disabled = true;
        saveDraft(modal.querySelector("form")).catch(function (error) {
          const progress = modal.querySelector("[data-production-progress]");
          if (progress) progress.textContent = messageFor(error);
          report(error);
        }).finally(function () { save.disabled = false; });
        return;
      }

      const publish = event.target.closest("[data-publish-listing]");
      if (publish && modal) {
        publish.disabled = true;
        preparePublication(modal.querySelector("form")).then(function () {
          showToast("تم تأكيد الاستحقاق والنشر من الخادم.", false);
          resetCreateFlow(modal);
          closeCreate();
          return refresh();
        }).catch(function (error) {
          const progress = modal.querySelector("[data-production-progress]");
          if (progress) progress.textContent = messageFor(error);
          report(error);
        }).finally(function () { publish.disabled = false; });
        return;
      }

      const account = event.target.closest("[data-account-route]");
      if (account) { event.preventDefault(); showMyListings(); }
    }, true);

    doc.querySelectorAll("[data-sector-filter]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.sector = button.dataset.sectorFilter || "all";
        doc.querySelectorAll("[data-sector-filter]").forEach(function (item) {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        refresh().catch(report);
      });
    });

    if (search) search.addEventListener("input", function () {
      clearTimeout(searchTimer);
      state.search = search.value;
      searchTimer = setTimeout(function () { refresh().catch(report); }, 250);
    });

    ensureFab();
    Promise.resolve(root.VVIPRuntimeReady).then(function (runtime) {
      state.runtime = runtime;
      state.repository = root.VVIP_MARKETPLACE_REPOSITORY.createMarketplaceRepository({
        client: runtime.supabase,
        clerk: runtime.clerk,
        config: runtime.config
      });
      if (runtime.clerk.isSignedIn) setView(true);
      return refresh();
    }).catch(report);
  }

  return Object.freeze({
    mount,
    moneyToMinor,
    formatMoney,
    whatsappUrl,
    validateFiles,
    cleanText,
    currencyFraction,
    sectors: SECTORS
  });
});
