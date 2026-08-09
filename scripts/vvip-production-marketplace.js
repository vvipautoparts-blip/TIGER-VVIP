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
      LISTING_CREATE_FAILED: "تعذر إنشاء الإعلان. تحقق من السوق والبيانات.",
      LISTING_SUBMIT_FAILED: "حُفظ الإعلان لكن تعذر إرساله للمراجعة.",
      MEDIA_LIMIT_EXCEEDED: "يمكن رفع سبع صور كحد أقصى.",
      MEDIA_MIME_INVALID: "الصور المدعومة: JPG وPNG وWebP فقط.",
      MEDIA_SIZE_INVALID: "إحدى الصور تتجاوز الحجم المسموح.",
      MEDIA_DIMENSIONS_INVALID: "أبعاد إحدى الصور غير آمنة للمعالجة.",
      PRICE_INVALID: "أدخل سعرًا صحيحًا وفق العملة المختارة.",
      CURRENCY_INVALID: "رمز العملة غير صحيح.",
      PHONE_INVALID: "رقم التواصل غير صحيح.",
      LISTINGS_READ_FAILED: "تعذر تحميل الإعلانات الآن.",
      RUNTIME_BOOT_FAILED: "تعذر تشغيل الاتصال الآمن بالمنصة."
    };
    return messages[code] || "تعذر إكمال العملية بأمان. حاول مرة أخرى.";
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
    const state = { sector: "all", search: "", listings: [], favorites: new Set(), repository: null, runtime: null };
    let toastTimer = null;
    let searchTimer = null;

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

    function createCard(listing) {
      const article = doc.createElement("article");
      article.className = "listing-card vvip-production-listing";
      article.dataset.listingCard = listing.listing_id;
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
        label.textContent = listing.sector;
        visual.appendChild(label);
      }
      const body = doc.createElement("div");
      body.className = "listing-card__body";
      const location = doc.createElement("p");
      location.className = "listing-location";
      location.textContent = listing.location_label + " · " + listing.active_market_country;
      const title = doc.createElement("h3");
      title.textContent = listing.title;
      const price = doc.createElement("strong");
      price.className = "listing-price";
      price.textContent = formatMoney(listing.price_minor, listing.currency_code, doc.documentElement.lang || "ar");
      const summary = doc.createElement("p");
      summary.className = "listing-summary";
      summary.textContent = listing.summary || "";
      const actions = doc.createElement("div");
      actions.className = "card-actions";
      const details = doc.createElement("button");
      details.type = "button";
      details.className = "button button--primary";
      details.dataset.listingDetails = listing.listing_id;
      details.textContent = "تفاصيل";
      const favorite = doc.createElement("button");
      favorite.type = "button";
      favorite.className = "button button--quiet";
      favorite.dataset.listingFavorite = listing.listing_id;
      favorite.textContent = state.favorites.has(listing.listing_id) ? "محفوظ" : "حفظ";
      actions.append(details, favorite);
      if (listing.whatsapp_enabled && listing.contact_phone) {
        const contact = doc.createElement("a");
        contact.className = "button button--quiet";
        contact.href = whatsappUrl(listing.contact_phone);
        contact.target = "_blank";
        contact.rel = "noopener noreferrer";
        contact.textContent = "واتساب";
        actions.appendChild(contact);
      }
      body.append(location, title, price, summary, actions);
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

    function formMarkup(config) {
      const country = cleanText(config.defaultCountryCode, 2);
      return `<div class="vvip-production-modal" data-production-listing-modal aria-hidden="true" hidden>
        <button type="button" class="vvip-production-backdrop" data-production-close aria-label="إغلاق"></button>
        <section role="dialog" aria-modal="true" aria-labelledby="production-listing-title" class="vvip-production-dialog">
          <button type="button" class="vvip-production-close" data-production-close aria-label="إغلاق">×</button>
          <h2 id="production-listing-title">إنشاء إعلان حقيقي</h2>
          <p>سيُحفظ الإعلان ويُرسل للمراجعة. لن يظهر للعامة قبل الاعتماد.</p>
          <form data-production-listing-form>
            <label>القطاع<select name="sector" required><option value="">اختر</option><option value="automotive">قطع وخدمات السيارات</option><option value="materials">مواد ولوازم</option><option value="real-estate">عقارات</option></select></label>
            <label>العنوان<input name="title" required minlength="2" maxlength="80"></label>
            <div class="vvip-production-grid"><label>السعر<input name="price" inputmode="decimal" required></label><label>العملة<input name="currency" value="JOD" maxlength="3" required></label></div>
            <div class="vvip-production-grid"><label>الدولة<input name="country" value="${country}" maxlength="2" required></label><label>الموقع<input name="location" maxlength="120" required></label></div>
            <label>الوصف<textarea name="summary" maxlength="2000" rows="4"></textarea></label>
            <label>رقم واتساب اختياري<input name="phone" inputmode="tel" maxlength="32"></label>
            <label class="vvip-production-check"><input name="whatsapp" type="checkbox"> إظهار زر واتساب الخارجي</label>
            <label>الصور — حتى 7<input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>
            <p data-production-progress role="status" aria-live="polite"></p>
            <button class="button button--primary" type="submit">حفظ وإرسال للمراجعة</button>
          </form>
        </section>
      </div>`;
    }

    let modal = null;
    function ensureModal() {
      if (modal) return modal;
      const host = doc.createElement("div");
      host.innerHTML = formMarkup(state.runtime.config);
      modal = host.firstElementChild;
      doc.body.appendChild(modal);
      modal.querySelector("form").addEventListener("submit", submitListing);
      return modal;
    }

    function openCreate() {
      const node = ensureModal();
      node.hidden = false;
      node.setAttribute("aria-hidden", "false");
      node.querySelector("input,select,textarea").focus();
    }

    function closeCreate() {
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    }

    async function submitListing(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const progress = form.querySelector("[data-production-progress]");
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      try {
        const data = new FormData(form);
        progress.textContent = "جاري التحقق من الصور…";
        const files = validateFiles(form.elements.images.files);
        const processed = [];
        for (let index = 0; index < files.length; index += 1) {
          progress.textContent = "معالجة الصورة " + (index + 1) + " من " + files.length;
          const image = await processImage(files[index]);
          processed.push(Object.assign({}, image, { isCover: index === 0 }));
        }
        progress.textContent = "جاري حفظ الإعلان ورفع الصور…";
        const result = await state.repository.createAndSubmit({
          sector: data.get("sector"),
          title: data.get("title"),
          summary: data.get("summary"),
          location: data.get("location"),
          priceMinor: moneyToMinor(data.get("price"), String(data.get("currency") || "").toUpperCase()),
          currencyCode: String(data.get("currency") || "").toUpperCase(),
          activeMarketCountry: String(data.get("country") || "").toUpperCase(),
          contactPhone: data.get("phone"),
          whatsappEnabled: data.get("whatsapp") === "on"
        }, processed);
        progress.textContent = "تم إرسال الإعلان للمراجعة برقم " + result.listing_id;
        form.reset();
        showToast("تم حفظ الإعلان وإرساله للمراجعة.", false);
        setTimeout(closeCreate, 1200);
      } catch (error) {
        progress.textContent = messageFor(error);
        report(error);
      } finally {
        button.disabled = false;
      }
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

    doc.addEventListener("click", function (event) {
      const create = event.target.closest("[data-open-create-listing]");
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
          favorite.textContent = next ? "محفوظ" : "حفظ";
        }).catch(report);
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
    currencyFraction
  });
});
