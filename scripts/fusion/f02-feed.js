(function (root) {
  "use strict";

  const F02_PREVIEW_LISTINGS = Object.freeze([
    Object.freeze({ id: "demo-tech-001", syntheticDemo: true, sector: "technology", sectorLabel: "التكنولوجيا", sellerName: "VVIP Showcase", title: "حلول تقنية للأعمال", price: "مثال توضيحي", location: "سوق عالمي", summary: "نموذج توضيحي لا يمثل شركة أو عرضًا حقيقيًا.", specs: ["تقنية", "B2B", "توضيحي"], timeLabel: "الآن" }),
    Object.freeze({ id: "demo-realestate-001", syntheticDemo: true, sector: "real-estate", sectorLabel: "العقارات", sellerName: "VVIP Showcase", title: "عقار نموذجي للمعاينة", price: "مثال توضيحي", location: "سوق عالمي", summary: "بطاقة تجريبية لاستخدامها في اختبار شكل المنشور فقط.", specs: ["عقار", "عرض", "توضيحي"], timeLabel: "الآن" }),
    Object.freeze({ id: "demo-health-001", syntheticDemo: true, sector: "healthcare", sectorLabel: "الرعاية الصحية", sellerName: "VVIP Showcase", title: "خدمة صحية نموذجية", price: "تواصل", location: "سوق عالمي", summary: "بيانات اصطناعية مخصصة للمعاينة المحلية ولا تُعرض كحقيقة إنتاجية.", specs: ["خدمة", "صحي", "توضيحي"], timeLabel: "الآن" }),
    Object.freeze({ id: "demo-auto-001", syntheticDemo: true, sector: "automotive", sectorLabel: "السيارات", sellerName: "VVIP Showcase", title: "مركبة نموذجية للعرض", price: "مثال توضيحي", location: "سوق عالمي", summary: "مثال بصري محلي فقط وسيستبدله F08 ببيانات Showcase موثقة.", specs: ["سيارات", "صورة", "توضيحي"], timeLabel: "الآن" })
  ]);

  const state = { listings: [], sector: "all", query: "", saved: new Set(), activeId: null };
  let searchFabric = null;
  let searchLoadError = false;
  let searchTimer = null;
  let toastTimer = null;
  let lastFocusedElement = null;

  function previewAllowed() {
    const params = new URLSearchParams(root.location.search);
    const local = ["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"].includes(root.location.hostname);
    return local && params.get("preview") === "home";
  }

  function safeText(value) {
    const span = root.document.createElement("span");
    span.textContent = String(value == null ? "" : value);
    return span.innerHTML;
  }

  function normalizeListing(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    if (typeof item.id !== "string" || !item.id || typeof item.title !== "string" || !item.title) return null;
    const syntheticDemo = item.syntheticDemo === true;
    return Object.freeze({
      id: item.id,
      syntheticDemo,
      sector: typeof item.sector === "string" && item.sector ? item.sector : "general",
      sectorLabel: typeof item.sectorLabel === "string" && item.sectorLabel ? item.sectorLabel : "عام",
      sellerName: typeof item.sellerName === "string" && item.sellerName ? item.sellerName : "VVIP TIGER",
      title: item.title,
      price: typeof item.price === "string" ? item.price : "",
      location: typeof item.location === "string" ? item.location : "",
      countryCode: typeof item.countryCode === "string" ? item.countryCode : "",
      category: typeof item.category === "string" ? item.category : "",
      brand: typeof item.brand === "string" ? item.brand : "",
      model: typeof item.model === "string" ? item.model : "",
      year: Number.isInteger(Number(item.year)) ? Number(item.year) : null,
      summary: typeof item.summary === "string" ? item.summary : "",
      specs: Array.isArray(item.specs) ? item.specs.filter((value) => typeof value === "string").slice(0, 12) : [],
      searchAliases: Array.isArray(item.searchAliases) ? item.searchAliases.filter((value) => typeof value === "string").slice(0, 20) : [],
      searchEligible: item.syntheticDemo === true || item.searchEligible === true,
      policyEligible: item.syntheticDemo === true || item.policyEligible === true,
      timeLabel: typeof item.timeLabel === "string" ? item.timeLabel : ""
    });
  }

  function readListings() {
    if (previewAllowed()) return F02_PREVIEW_LISTINGS.map(normalizeListing).filter(Boolean);
    const source = root.VVIP_FUSION_PUBLIC_LISTINGS;
    return Array.isArray(source) ? source.slice(0, 100).map(normalizeListing).filter(Boolean) : [];
  }

  async function loadSearchFabric() {
    try {
      const loaded = await import("./f04-search-fabric.js");
      if (!loaded || typeof loaded.searchListings !== "function") throw new Error("F04_SEARCH_CONTRACT_MISSING");
      searchFabric = loaded;
      searchLoadError = false;
    } catch (error) {
      searchFabric = null;
      searchLoadError = true;
      if (root.console && typeof root.console.error === "function") root.console.error("F04_SEARCH_LOAD_FAILED", error);
    }
  }

  function showToast(message) {
    const toast = root.document.querySelector("[data-app-toast]");
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(function () { toast.hidden = true; }, 2600);
  }

  function emptySearchResult() {
    return Object.freeze({
      results: Object.freeze([]),
      rescue: Object.freeze({ spelling: Object.freeze([]), locations: Object.freeze([]), relaxedFilters: Object.freeze([]), adjacentCategories: Object.freeze([]), aliases: Object.freeze([]) })
    });
  }

  function currentSearchResult() {
    if (!searchFabric) return emptySearchResult();
    const candidates = state.listings.map(function (item) {
      const sectorEligible = state.sector === "all" || item.sector === state.sector;
      return Object.freeze({ ...item, searchEligible: item.searchEligible === true && sectorEligible });
    });
    const dictionaries = root.VVIP_FUSION_SEARCH_DICTIONARIES && typeof root.VVIP_FUSION_SEARCH_DICTIONARIES === "object"
      ? root.VVIP_FUSION_SEARCH_DICTIONARIES : {};
    const semanticScores = root.VVIP_FUSION_SEARCH_SEMANTIC_SCORES && typeof root.VVIP_FUSION_SEARCH_SEMANTIC_SCORES === "object"
      ? root.VVIP_FUSION_SEARCH_SEMANTIC_SCORES : {};
    const activeMarketCountry = previewAllowed() ? "" : (typeof root.VVIP_ACTIVE_MARKET_COUNTRY === "string" ? root.VVIP_ACTIVE_MARKET_COUNTRY : "");
    return searchFabric.searchListings({
      query: state.query,
      listings: candidates,
      dictionaries,
      activeMarketCountry,
      semanticScores
    });
  }

  function renderFilters() {
    const host = root.document.querySelector("[data-vvip-sector-filters]");
    if (!host) return;
    const sectors = new Map();
    state.listings.forEach(function (item) { sectors.set(item.sector, item.sectorLabel); });
    const controls = ['<button class="filter is-active" type="button" data-sector-filter="all" aria-pressed="true">الكل</button>'];
    sectors.forEach(function (label, key) {
      controls.push(`<button class="filter" type="button" data-sector-filter="${safeText(key)}" aria-pressed="false">${safeText(label)}</button>`);
    });
    host.innerHTML = controls.join("");
  }

  function renderRescue(rescue) {
    const host = root.document.querySelector("[data-search-rescue]");
    if (!host) return;
    if (searchLoadError) {
      host.textContent = "البحث غير متاح مؤقتًا. لم يتم عرض نتائج غير موثوقة.";
      host.hidden = false;
      return;
    }
    if (!state.query.trim() || !rescue || typeof rescue !== "object") {
      host.textContent = "";
      host.hidden = true;
      return;
    }
    const suggestions = [];
    for (const value of Array.isArray(rescue.spelling) ? rescue.spelling : []) suggestions.push(`هل تقصد: ${value}`);
    for (const value of Array.isArray(rescue.aliases) ? rescue.aliases : []) suggestions.push(`اسم معروف: ${value}`);
    for (const value of Array.isArray(rescue.locations) ? rescue.locations : []) suggestions.push(`موقع: ${value}`);
    for (const value of Array.isArray(rescue.adjacentCategories) ? rescue.adjacentCategories : []) suggestions.push(`فئة: ${value}`);
    host.innerHTML = suggestions.slice(0, 12).map(function (value) { return `<span>${safeText(value)}</span>`; }).join(" · ");
    host.hidden = suggestions.length === 0;
  }

  function cardTemplate(item) {
    const saved = state.saved.has(item.id);
    const chips = item.specs.map(function (spec) { return `<span>${safeText(spec)}</span>`; }).join("");
    return `<article class="listing-card" data-listing-card="${safeText(item.id)}">
      <header class="fusion-card-header">
        <span class="fusion-card-avatar" aria-hidden="true">V</span>
        <div class="fusion-card-identity"><strong>${safeText(item.sellerName)}</strong><small>${safeText([item.location, item.sectorLabel, item.timeLabel].filter(Boolean).join(" · "))}</small></div>
        <button class="fusion-icon-button" type="button" data-listing-more="${safeText(item.id)}" aria-label="خيارات الإعلان">⋮</button>
      </header>
      <button class="listing-visual" type="button" data-listing-details="${safeText(item.id)}" aria-label="عرض ${safeText(item.title)}"><span>${safeText(item.sectorLabel)}</span></button>
      <div class="listing-card__body">
        ${item.syntheticDemo ? '<span class="fusion-demo-badge">مثال توضيحي</span>' : ""}
        <button class="fusion-title-button" type="button" data-listing-details="${safeText(item.id)}"><h3>${safeText(item.title)}</h3></button>
        <strong class="listing-price">${safeText(item.price)}</strong>
        <p class="listing-summary">${safeText(item.summary)}</p>
        <div class="spec-chips">${chips}</div>
        <div class="fusion-card-actions">
          <button class="button${saved ? " is-saved" : ""}" type="button" data-listing-save="${safeText(item.id)}" aria-pressed="${saved}">${saved ? "محفوظ" : "حفظ"}</button>
          <button class="button" type="button" data-listing-contact="${safeText(item.id)}">تواصل</button>
          <button class="button" type="button" data-listing-share="${safeText(item.id)}">مشاركة</button>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const feed = root.document.querySelector("[data-vvip-marketplace-feed]");
    const count = root.document.querySelector("[data-results-count]");
    const empty = root.document.querySelector("[data-empty-state]");
    if (!feed || !count || !empty) return;
    const searchResult = currentSearchResult();
    const visible = searchResult.results;
    renderRescue(searchResult.rescue);
    feed.innerHTML = visible.map(cardTemplate).join("");
    feed.setAttribute("aria-busy", "false");
    count.textContent = visible.length ? `${visible.length} نتائج` : "";
    empty.hidden = visible.length !== 0;
  }

  function openDetails(id) {
    const item = state.listings.find(function (entry) { return entry.id === id; });
    const layer = root.document.querySelector("[data-vvip-listing-detail-sheet]");
    const content = root.document.querySelector("[data-sheet-content]");
    const panel = layer && layer.querySelector(".detail-sheet");
    if (!item || !layer || !content || !panel) return;
    lastFocusedElement = root.document.activeElement;
    state.activeId = id;
    const chips = item.specs.map(function (spec) { return `<span>${safeText(spec)}</span>`; }).join("");
    content.innerHTML = `<div class="sheet-visual listing-visual" aria-hidden="true"><span>${safeText(item.sectorLabel)}</span></div>
      ${item.syntheticDemo ? '<span class="fusion-demo-badge">مثال توضيحي</span>' : ""}
      <h2 id="sheet-title">${safeText(item.title)}</h2><strong class="listing-price">${safeText(item.price)}</strong>
      <p class="sheet-summary">${safeText(item.summary)}</p><div class="spec-chips">${chips}</div>
      <p class="disclaimer">VVIP TIGER منصة عرض وتواصل، وليست طرفًا في البيع أو الدفع أو التوصيل.</p>
      <div class="sheet-actions fusion-card-actions"><button class="button" type="button" data-listing-save="${safeText(item.id)}">${state.saved.has(item.id) ? "محفوظ" : "حفظ"}</button><button class="button" type="button" data-listing-contact="${safeText(item.id)}">تواصل</button><button class="button" type="button" data-listing-share="${safeText(item.id)}">مشاركة</button></div>`;
    layer.hidden = false;
    layer.setAttribute("aria-hidden", "false");
    root.document.body.classList.add("sheet-open");
    panel.focus();
  }

  function closeDetails() {
    const layer = root.document.querySelector("[data-vvip-listing-detail-sheet]");
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    layer.setAttribute("aria-hidden", "true");
    root.document.body.classList.remove("sheet-open");
    state.activeId = null;
    if (lastFocusedElement && root.document.contains(lastFocusedElement)) lastFocusedElement.focus();
    lastFocusedElement = null;
  }

  function toggleSaved(id) {
    if (state.saved.has(id)) state.saved.delete(id); else state.saved.add(id);
    render();
    if (state.activeId) openDetails(state.activeId);
  }

  function shareListing(id) {
    const item = state.listings.find(function (entry) { return entry.id === id; });
    if (!item) return;
    if (root.navigator && typeof root.navigator.share === "function") {
      root.navigator.share({ title: item.title, text: item.summary, url: root.location.href }).catch(function () {});
      return;
    }
    showToast("المشاركة متاحة من خيارات جهازك عند دعمها.");
  }

  function setCapabilitySheet(open) {
    const layer = root.document.querySelector("[data-fusion-capability-sheet]");
    if (!layer) return;
    layer.hidden = !open;
    layer.setAttribute("aria-hidden", String(!open));
  }

  function applyNetworkMode() {
    const app = root.document.querySelector("[data-vvip-unified-home]");
    const connection = root.navigator && (root.navigator.connection || root.navigator.mozConnection || root.navigator.webkitConnection);
    if (!app || !connection) return;
    const weak = connection.saveData === true || connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
    app.classList.toggle("is-data-saver", weak);
  }

  function bindEvents() {
    const search = root.document.querySelector("[data-listing-search]");
    if (search) search.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { state.query = search.value || ""; render(); }, 160);
    });

    root.document.addEventListener("click", function (event) {
      const filter = event.target.closest("[data-sector-filter]");
      if (filter) {
        state.sector = filter.dataset.sectorFilter || "all";
        root.document.querySelectorAll("[data-sector-filter]").forEach(function (button) {
          const active = button === filter;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        render();
        return;
      }
      const details = event.target.closest("[data-listing-details]");
      if (details) { openDetails(details.dataset.listingDetails); return; }
      const save = event.target.closest("[data-listing-save]");
      if (save) { toggleSaved(save.dataset.listingSave); return; }
      if (event.target.closest("[data-listing-contact]")) { showToast(previewAllowed() ? "هذا مثال توضيحي؛ لا توجد جهة اتصال حقيقية." : "التواصل الآمن سيُربط بمصدر الإعلان في المرحلة المخصصة."); return; }
      const share = event.target.closest("[data-listing-share]");
      if (share) { shareListing(share.dataset.listingShare); return; }
      if (event.target.closest("[data-listing-more]")) { showToast("خيارات الإعلان تظهر حسب حالته وسياق الحساب."); return; }
      if (event.target.closest("[data-sheet-close]")) { closeDetails(); return; }
      if (event.target.closest("[data-fusion-capability-menu]")) { setCapabilitySheet(true); return; }
      if (event.target.closest("[data-fusion-capability-close]")) { setCapabilitySheet(false); }
    });

    root.document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { closeDetails(); setCapabilitySheet(false); }
    });
  }

  async function start() {
    state.listings = readListings();
    applyNetworkMode();
    renderFilters();
    await loadSearchFabric();
    render();
    bindEvents();
  }

  root.VVIP_FUSION_F02_FEED = Object.freeze({ start, previewAllowed, safeText, normalizeListing, readListings });
  root.addEventListener("DOMContentLoaded", start, { once: true });
})(typeof window !== "undefined" ? window : globalThis);
