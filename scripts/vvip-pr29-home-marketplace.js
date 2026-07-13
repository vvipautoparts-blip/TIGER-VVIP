(function () {
  "use strict";

  const listings = [
    { id: "auto-engine-care", sector: "automotive", sectorLabel: "قطع وخدمات السيارات", title: "صيانة محرك شاملة", price: "ابتداءً من 850 ر.س", location: "الرياض", summary: "فحص وصيانة متكاملة بأجهزة تشخيص حديثة.", specs: ["فحص إلكتروني", "ضمان خدمة", "موعد مسبق"], visualClass: "visual--engine", contactLabel: "تواصل مع المركز" },
    { id: "auto-brake-kit", sector: "automotive", sectorLabel: "قطع وخدمات السيارات", title: "طقم فرامل أصلي", price: "1,240 ر.س", location: "جدة", summary: "طقم أمامي أصلي متوافق مع عدة فئات حديثة.", specs: ["أصلي", "تركيب متاح", "ضمان سنة"], visualClass: "visual--brakes", contactLabel: "استفسر عن التوافق" },
    { id: "auto-detailing", sector: "automotive", sectorLabel: "قطع وخدمات السيارات", title: "حماية وتلميع احترافي", price: "650 ر.س", location: "الدمام", summary: "عناية خارجية وداخلية بطبقة حماية طويلة الأثر.", specs: ["سيراميك", "عناية داخلية", "6 ساعات"], visualClass: "visual--detail", contactLabel: "احجز موعدًا" },
    { id: "materials-marble", sector: "materials", sectorLabel: "مواد ولوازم", title: "ألواح رخام طبيعي", price: "320 ر.س / م²", location: "الرياض", summary: "ألواح مختارة للمشاريع السكنية والتجارية الفاخرة.", specs: ["طبيعي", "قص حسب الطلب", "توريد مشاريع"], visualClass: "visual--marble", contactLabel: "اطلب عينة" },
    { id: "materials-lighting", sector: "materials", sectorLabel: "مواد ولوازم", title: "إنارة معمارية داخلية", price: "من 180 ر.س", location: "جدة", summary: "حلول إنارة هادئة للمنازل والمتاجر والمكاتب.", specs: ["LED", "ضمان سنتين", "تركيب متاح"], visualClass: "visual--lighting", contactLabel: "اطلب عرضًا" },
    { id: "materials-tools", sector: "materials", sectorLabel: "مواد ولوازم", title: "عدة احترافية متكاملة", price: "2,450 ر.س", location: "الخبر", summary: "مجموعة أدوات للورش والمقاولين بحقيبة مقاومة للصدمات.", specs: ["108 قطع", "جودة صناعية", "شحن محلي"], visualClass: "visual--tools", contactLabel: "تحقق من التوفر" },
    { id: "real-villa", sector: "real-estate", sectorLabel: "عقارات", title: "فيلا عصرية مستقلة", price: "2,850,000 ر.س", location: "الرياض — حطين", summary: "تصميم عصري ومساحات رحبة في حي متكامل الخدمات.", specs: ["420 م²", "5 غرف", "موقفان"], visualClass: "visual--villa", contactLabel: "رتّب معاينة" },
    { id: "real-office", sector: "real-estate", sectorLabel: "عقارات", title: "مكتب جاهز للأعمال", price: "145,000 ر.س / سنة", location: "جدة — الروضة", summary: "مكتب مجهز في موقع مركزي مع خدمات تشغيل مشتركة.", specs: ["180 م²", "مؤثث", "دخول ذكي"], visualClass: "visual--office", contactLabel: "اطلب التفاصيل" },
    { id: "real-land", sector: "real-estate", sectorLabel: "عقارات", title: "أرض سكنية مميزة", price: "1,190,000 ر.س", location: "الدمام — الشاطئ", summary: "قطعة سكنية على شارعين وقريبة من المرافق الرئيسية.", specs: ["600 م²", "شارعان", "صك إلكتروني"], visualClass: "visual--land", contactLabel: "تواصل للاستفسار" }
  ];

  const state = {
    sector: "all",
    query: "",
    activeId: null,
    interests: new Set()
  };

  const app = document.querySelector("[data-vvip-unified-home]");
  const gate = document.querySelector("[data-vvip-auth-gate]");
  const feed = document.querySelector("[data-vvip-marketplace-feed]");
  const resultsCount = document.querySelector("[data-results-count]");
  const emptyState = document.querySelector("[data-empty-state]");
  const searchInput = document.querySelector("[data-listing-search]");
  const sheet = document.querySelector("[data-vvip-listing-detail-sheet]");
  const sheetPanel = sheet && sheet.querySelector(".detail-sheet");
  const sheetContent = document.querySelector("[data-sheet-content]");
  const toast = document.querySelector("[data-app-toast]");
  const SEARCH_DEBOUNCE_MS = 180;

  let toastTimer;
  let searchTimer;
  let lastFocusedElement = null;
  let initialRendered = false;

  function safeText(value) {
    const span = document.createElement("span");
    span.textContent = String(value);
    return span.innerHTML;
  }

  function previewAllowed() {
    const preview = new URLSearchParams(location.search).get("preview");
    const isLocalHost = location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "::1" ||
      location.hostname === "[::1]" ||
      location.hostname === "0.0.0.0";
    return isLocalHost && preview === "home";
  }

  function applyLocalPreviewRoutes() {
    if (!previewAllowed()) return;
    document.querySelectorAll("[data-account-route]").forEach(function (link) {
      link.href = "private-profile-p03.html?preview=account";
    });
  }

  function signedIn() {
    return Boolean(window.Clerk && window.Clerk.isSignedIn);
  }

  function setView(showHome) {
    if (!app || !gate) return;
    app.hidden = !showHome;
    gate.hidden = showHome;
    document.body.classList.toggle("is-home", showHome);
  }

  function showToast(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message || "هذه الميزة قيد التجهيز ضمن VVIP TIGER.";
    toast.hidden = false;
    toastTimer = setTimeout(function () {
      toast.hidden = true;
    }, 3200);
  }

  function cardTemplate(item) {
    const chips = item.specs.map(function (spec) {
      return `<span>${safeText(spec)}</span>`;
    }).join("");
    const interested = state.interests.has(item.id);

    return `<article class="listing-card" data-listing-card="${item.id}">
      <button class="listing-visual ${item.visualClass}" type="button" data-listing-details="${item.id}" aria-label="عرض تفاصيل ${safeText(item.title)}">
        <span>${safeText(item.sectorLabel)}</span>
      </button>
      <div class="listing-card__body">
        <p class="listing-location">${safeText(item.sectorLabel)} · ${safeText(item.location)}</p>
        <h3>${safeText(item.title)}</h3>
        <strong class="listing-price">${safeText(item.price)}</strong>
        <p class="listing-summary">${safeText(item.summary)}</p>
        <div class="spec-chips">${chips}</div>
        <div class="card-actions">
          <button class="button button--primary" type="button" data-listing-details="${item.id}">تفاصيل</button>
          <button class="button button--quiet${interested ? " is-interested" : ""}" type="button" data-listing-interest="${item.id}" aria-pressed="${interested}">${interested ? "مهتم" : "اهتمام"}</button>
          <button class="button button--quiet" type="button" data-listing-contact="${item.id}">تواصل</button>
          <button class="button button--quiet" type="button" data-listing-private-share="${item.id}">مشاركة خاصة</button>
        </div>
      </div>
    </article>`;
  }

  function visibleListings() {
    const query = state.query.trim().toLowerCase();
    return listings.filter(function (item) {
      const matchesSector = state.sector === "all" || item.sector === state.sector;
      const searchable = [item.title, item.location, item.summary, item.sectorLabel]
        .concat(item.specs)
        .join(" ")
        .toLowerCase();
      return matchesSector && (!query || searchable.includes(query));
    });
  }

  function render() {
    if (!feed || !resultsCount || !emptyState) return;
    const visible = visibleListings();
    feed.innerHTML = visible.map(cardTemplate).join("");
    feed.setAttribute("aria-busy", "false");
    resultsCount.textContent = visible.length + " إعلانات";
    emptyState.hidden = visible.length !== 0;
    initialRendered = true;
  }

  function ensureInitialRender() {
    if (!initialRendered) render();
  }

  function resetListings() {
    state.sector = "all";
    state.query = "";
    if (searchInput) searchInput.value = "";
    document.querySelectorAll("[data-sector-filter]").forEach(function (button) {
      const active = button.dataset.sectorFilter === "all";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    render();
    if (searchInput) searchInput.focus({ preventScroll: true });
  }

  function setSheetVisibility(visible) {
    if (!sheet) return;
    sheet.hidden = !visible;
    if (visible) {
      sheet.setAttribute("aria-hidden", "false");
    } else {
      sheet.setAttribute("aria-hidden", "true");
    }
    document.body.classList.toggle("sheet-open", visible);
  }

  function sheetTemplate(item) {
    const interested = state.interests.has(item.id);
    const chips = item.specs.map(function (spec) {
      return `<span>${safeText(spec)}</span>`;
    }).join("");

    return `<div class="sheet-visual listing-visual ${item.visualClass}" aria-hidden="true"><span>${safeText(item.sectorLabel)}</span></div>
      <p class="listing-location">${safeText(item.sectorLabel)} · ${safeText(item.location)}</p>
      <h2 id="sheet-title">${safeText(item.title)}</h2>
      <strong class="listing-price">${safeText(item.price)}</strong>
      <p class="sheet-summary">${safeText(item.summary)}</p>
      <div class="spec-chips">${chips}</div>
      <p class="disclaimer">VVIP TIGER منصة عرض وتواصل فقط وليست طرفًا في البيع أو الدفع أو التوصيل أو العقود.</p>
      <div class="sheet-actions">
        <button class="button button--primary${interested ? " is-interested" : ""}" type="button" data-listing-interest="${item.id}" aria-pressed="${interested}">${interested ? "مهتم" : "اهتمام"}</button>
        <button class="button button--quiet" type="button" data-listing-contact="${item.id}">${safeText(item.contactLabel)}</button>
        <button class="button button--quiet" type="button" data-listing-private-share="${item.id}">مشاركة خاصة</button>
        <button class="button button--quiet" type="button" data-sheet-close>إغلاق</button>
      </div>`;
  }

  function openSheet(id) {
    const item = listings.find(function (entry) {
      return entry.id === id;
    });
    if (!item || !sheetContent || !sheetPanel) return;

    lastFocusedElement = document.activeElement;
    state.activeId = id;
    sheetContent.innerHTML = sheetTemplate(item);
    setSheetVisibility(true);

    if (location.hash !== "#listing-" + id) {
      history.pushState({ listing: id }, "", "#listing-" + id);
    }

    sheetPanel.focus();
  }

  function closeSheet(fromHistory) {
    if (!sheet || sheet.hidden) return;
    setSheetVisibility(false);
    state.activeId = null;

    if (!fromHistory && location.hash.indexOf("#listing-") === 0) {
      history.back();
    }

    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  function updateInterestButtons(id, interested) {
    document.querySelectorAll("[data-listing-interest]").forEach(function (button) {
      if (button.dataset.listingInterest !== id) return;
      button.textContent = interested ? "مهتم" : "اهتمام";
      button.classList.toggle("is-interested", interested);
      button.setAttribute("aria-pressed", String(interested));
    });
  }

  function markInterest(id) {
    const interested = !state.interests.has(id);
    if (interested) {
      state.interests.add(id);
    } else {
      state.interests.delete(id);
    }
    updateInterestButtons(id, interested);
    showToast(interested
      ? "تم تسجيل اهتمامك مبدئيًا."
      : "تم إلغاء الاهتمام.");
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-reset-listings]")) {
      resetListings();
      return;
    }

    const filter = event.target.closest("[data-sector-filter]");
    if (filter) {
      state.sector = filter.dataset.sectorFilter;
      document.querySelectorAll("[data-sector-filter]").forEach(function (button) {
        const active = button === filter;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      render();
      return;
    }

    const details = event.target.closest("[data-listing-details]");
    if (details) {
      openSheet(details.dataset.listingDetails);
      return;
    }

    if (event.target.closest("[data-sheet-close]")) {
      closeSheet(false);
      return;
    }

    const interest = event.target.closest("[data-listing-interest]");
    if (interest) {
      markInterest(interest.dataset.listingInterest);
      return;
    }

    if (event.target.closest("[data-listing-contact]")) {
      showToast("التواصل الرسمي داخل VVIP TIGER قيد التجهيز.");
      return;
    }

    if (event.target.closest("[data-listing-private-share]")) {
      showToast("المشاركة الخاصة قيد التجهيز داخل المنصة.");
      return;
    }

    if (event.target.closest("[data-coming-soon]")) {
      showToast("هذه الميزة قيد التجهيز ضمن VVIP TIGER.");
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", function (event) {
      state.query = event.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, SEARCH_DEBOUNCE_MS);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeSheet(false);
  });

  window.addEventListener("popstate", function () {
    closeSheet(true);
  });

  window.VVIP_PR29 = Object.freeze({
    showHome: function () {
      setView(true);
      ensureInitialRender();
    },
    showGate: function () {
      setView(false);
    },
    listings: listings.slice()
  });

  applyLocalPreviewRoutes();
  setView(previewAllowed() || signedIn());
  ensureInitialRender();
})();
