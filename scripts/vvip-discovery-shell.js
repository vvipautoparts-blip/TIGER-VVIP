/* VVIP_DISCOVERY_EXPERIENCE */
(() => {
  "use strict";

  const CONFIG = window.VVIP_DISCOVERY_CONFIG || {};
  const STORAGE_KEY = CONFIG.storageKey || "vvip.discovery.filters.v1";
  const PAGE_SIZE = Number(CONFIG.pageSize) || 12;
  const DEBOUNCE_MS = Number(CONFIG.debounceMs) || 220;

  const CARD_SELECTORS = [
    "[data-vvip-listing]",
    "[data-listing-card]",
    ".listing-card",
    ".post-card",
    ".product-card",
    ".market-card",
  ];

  const DEFAULT_STATE = Object.freeze({
    query: "",
    sector: CONFIG.defaultSector || "all",
    city: "",
    area: "",
    priceMin: "",
    priceMax: "",
    condition: "",
    accountType: "",
    sort: "latest",
    autoItemKind: "",
    autoVehicleClass: "",
    autoBrand: "",
    autoModel: "",
    autoYear: "",
    autoFuel: "",
    autoState: "",
    autoAvailability: "",
    realTransaction: "",
    realPropertyType: "",
    realGovernorate: "",
    realSizeMin: "",
    realSizeMax: "",
    realRooms: "",
    realBathrooms: "",
    realAvailability: "",
    materialType: "",
    materialSupplier: "",
    materialTradeMode: "",
    materialUnit: "",
    materialMoq: "",
    materialAvailability: "",
    materialFulfillment: "",
    materialState: "",
    page: 1,
  });

  let state = { ...DEFAULT_STATE };
  let root = null;
  let discoveredItems = [];
  let externalItems = null;
  let debounceTimer = null;
  let lastFocusedElement = null;

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function normalizeSector(value) {
    const normalized = normalizeText(value);

    if (normalized.includes("سيار") || normalized.includes("قطع") || normalized === "auto") {
      return "auto";
    }

    if (normalized.includes("عقار") || normalized === "realestate" || normalized === "real-estate") {
      return "realestate";
    }

    if (normalized.includes("مواد") || normalized.includes("تموين") || normalized.includes("مستلزمات") || normalized === "materials") {
      return "materials";
    }

    return normalized || "unknown";
  }

  function parseNumber(value) {
    const normalized = String(value ?? "")
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/,/g, "")
      .match(/-?\d+(?:\.\d+)?/);

    return normalized ? Number(normalized[0]) : null;
  }

  function getText(element, selectors) {
    for (const selector of selectors) {
      const found = element.querySelector(selector);
      if (found?.textContent?.trim()) {
        return found.textContent.trim();
      }
    }

    return "";
  }

  function datasetValue(element, names) {
    for (const name of names) {
      const value = element.dataset?.[name];
      if (value !== undefined && value !== "") {
        return value;
      }
    }

    return "";
  }

  function itemFromElement(element, index) {
    const title =
      datasetValue(element, ["title", "name"]) ||
      getText(element, ["[data-title]", ".listing-title", ".post-title", ".product-title", ".title", "h1", "h2", "h3", "h4"]) ||
      `إعلان ${index + 1}`;

    const priceText =
      datasetValue(element, ["price"]) ||
      getText(element, ["[data-price]", ".listing-price", ".post-price", ".product-price", ".price"]);

    const sector = normalizeSector(
      datasetValue(element, ["sector", "categorySector"]) ||
      getText(element, ["[data-sector-label]", ".sector", ".category"])
    );

    const createdAt =
      datasetValue(element, ["createdAt", "date"]) ||
      element.querySelector("time")?.getAttribute("datetime") ||
      "";

    const rawValues = {
      title,
      priceText,
      sector,
      city: datasetValue(element, ["city"]),
      area: datasetValue(element, ["area", "region"]),
      condition: datasetValue(element, ["condition", "state"]),
      accountType: datasetValue(element, ["accountType", "sellerType"]),
      category: datasetValue(element, ["category", "subcategory"]),
      brand: datasetValue(element, ["brand"]),
      model: datasetValue(element, ["model"]),
      year: datasetValue(element, ["year"]),
      fuel: datasetValue(element, ["fuel", "energy"]),
      itemKind: datasetValue(element, ["itemKind", "listingType"]),
      vehicleClass: datasetValue(element, ["vehicleClass"]),
      availability: datasetValue(element, ["availability"]),
      transaction: datasetValue(element, ["transaction"]),
      propertyType: datasetValue(element, ["propertyType"]),
      governorate: datasetValue(element, ["governorate"]),
      size: datasetValue(element, ["size"]),
      rooms: datasetValue(element, ["rooms"]),
      bathrooms: datasetValue(element, ["bathrooms"]),
      materialType: datasetValue(element, ["materialType"]),
      supplier: datasetValue(element, ["supplier", "vendor"]),
      tradeMode: datasetValue(element, ["tradeMode"]),
      unit: datasetValue(element, ["unit"]),
      moq: datasetValue(element, ["moq", "minimumOrder"]),
      fulfillment: datasetValue(element, ["fulfillment"]),
      createdAt,
    };

    const searchText = normalizeText([element.textContent, ...Object.values(rawValues)].join(" "));

    return {
      id: datasetValue(element, ["id", "listingId"]) || `dom-${index + 1}`,
      element,
      sourceIndex: index,
      originalHidden: Boolean(element.hidden),
      title,
      price: parseNumber(priceText),
      priceText,
      sector,
      city: rawValues.city,
      area: rawValues.area,
      condition: rawValues.condition,
      accountType: rawValues.accountType,
      category: rawValues.category,
      brand: rawValues.brand,
      model: rawValues.model,
      year: rawValues.year,
      fuel: rawValues.fuel,
      itemKind: rawValues.itemKind,
      vehicleClass: rawValues.vehicleClass,
      availability: rawValues.availability,
      transaction: rawValues.transaction,
      propertyType: rawValues.propertyType,
      governorate: rawValues.governorate,
      size: parseNumber(rawValues.size),
      rooms: parseNumber(rawValues.rooms),
      bathrooms: parseNumber(rawValues.bathrooms),
      materialType: rawValues.materialType,
      supplier: rawValues.supplier,
      tradeMode: rawValues.tradeMode,
      unit: rawValues.unit,
      moq: parseNumber(rawValues.moq),
      fulfillment: rawValues.fulfillment,
      createdAt: rawValues.createdAt,
      searchText,
    };
  }

  function discoverItems() {
    const seen = new Set();
    const cards = [];

    for (const selector of CARD_SELECTORS) {
      document.querySelectorAll(selector).forEach((element) => {
        if (root?.contains(element) || seen.has(element) || element.closest("[data-vvip-discovery-root]")) {
          return;
        }

        seen.add(element);
        cards.push(element);
      });
    }

    discoveredItems = cards.map(itemFromElement);
  }

  function createField({ name, label, type = "text", options = [], placeholder = "", inputMode = "" }) {
    const field = document.createElement("div");
    field.className = "vvip-discovery__field";

    const labelElement = document.createElement("label");
    labelElement.className = "vvip-discovery__label";
    labelElement.htmlFor = `vvip-filter-${name}`;
    labelElement.textContent = label;

    let control;

    if (type === "select") {
      control = document.createElement("select");
      control.className = "vvip-discovery__select";

      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "الكل";
      control.append(emptyOption);

      for (const option of options) {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        control.append(optionElement);
      }
    } else {
      control = document.createElement("input");
      control.className = "vvip-discovery__input";
      control.type = type;
      control.placeholder = placeholder;

      if (inputMode) {
        control.inputMode = inputMode;
      }

      if (type === "number") {
        control.min = "0";
      }
    }

    control.id = `vvip-filter-${name}`;
    control.name = name;
    control.dataset.filter = name;

    field.append(labelElement, control);
    return field;
  }

  function buildSectorFields(sector) {
    const container = document.createElement("div");
    container.className = "vvip-discovery__sector-fields";
    container.dataset.sectorFields = sector;

    const fieldSets = {
      auto: [
        { name: "autoItemKind", label: "نوع الإعلان", type: "select", options: [{ value: "part", label: "قطعة" }, { value: "supply", label: "مستلزم" }, { value: "service", label: "خدمة" }] },
        { name: "autoVehicleClass", label: "فئة المركبة", placeholder: "سيدان، SUV، شاحنة..." },
        { name: "autoBrand", label: "الماركة", placeholder: "مثال: Hyundai" },
        { name: "autoModel", label: "الموديل", placeholder: "مثال: Kona" },
        { name: "autoYear", label: "سنة الصنع", type: "number", inputMode: "numeric" },
        { name: "autoFuel", label: "نوع الطاقة", type: "select", options: [{ value: "electric", label: "كهرباء" }, { value: "petrol", label: "بنزين" }, { value: "diesel", label: "ديزل" }, { value: "hybrid", label: "هايبرد" }] },
        { name: "autoState", label: "جديد أو مستعمل", type: "select", options: [{ value: "new", label: "جديد" }, { value: "used", label: "مستعمل" }] },
        { name: "autoAvailability", label: "التوفر", type: "select", options: [{ value: "available", label: "متوفر" }, { value: "on-request", label: "حسب الطلب" }] },
      ],
      realestate: [
        { name: "realTransaction", label: "نوع المعاملة", type: "select", options: [{ value: "sale", label: "بيع" }, { value: "rent", label: "إيجار" }] },
        { name: "realPropertyType", label: "نوع العقار", type: "select", options: [{ value: "house", label: "منزل" }, { value: "apartment", label: "شقة" }, { value: "land", label: "أرض" }, { value: "villa", label: "فيلا" }, { value: "shop", label: "محل" }, { value: "office", label: "مكتب" }, { value: "warehouse", label: "مستودع" }, { value: "farm", label: "مزرعة" }, { value: "commercial", label: "عقار تجاري" }] },
        { name: "realGovernorate", label: "المحافظة", placeholder: "مثال: عمّان" },
        { name: "realSizeMin", label: "المساحة من", type: "number", inputMode: "decimal" },
        { name: "realSizeMax", label: "المساحة إلى", type: "number", inputMode: "decimal" },
        { name: "realRooms", label: "عدد الغرف", type: "number", inputMode: "numeric" },
        { name: "realBathrooms", label: "عدد الحمامات", type: "number", inputMode: "numeric" },
        { name: "realAvailability", label: "التوفر", type: "select", options: [{ value: "available", label: "متاح" }, { value: "reserved", label: "محجوز" }] },
      ],
      materials: [
        { name: "materialType", label: "نوع المادة أو المنتج", placeholder: "اكتب النوع" },
        { name: "materialSupplier", label: "المورد أو الماركة", placeholder: "اسم المورد أو العلامة" },
        { name: "materialTradeMode", label: "طريقة البيع", type: "select", options: [{ value: "wholesale", label: "جملة" }, { value: "retail", label: "تجزئة" }, { value: "both", label: "جملة وتجزئة" }] },
        { name: "materialUnit", label: "وحدة البيع", placeholder: "قطعة، كرتونة، طن..." },
        { name: "materialMoq", label: "الحد الأدنى للطلب", type: "number", inputMode: "decimal" },
        { name: "materialAvailability", label: "التوفر", type: "select", options: [{ value: "available", label: "متوفر" }, { value: "on-request", label: "حسب الطلب" }] },
        { name: "materialFulfillment", label: "التسليم", type: "select", options: [{ value: "delivery", label: "توصيل" }, { value: "pickup", label: "استلام" }, { value: "both", label: "توصيل أو استلام" }] },
        { name: "materialState", label: "الحالة عند انطباقها", type: "select", options: [{ value: "new", label: "جديد" }, { value: "used", label: "مستعمل" }] },
      ],
    };

    for (const definition of fieldSets[sector] || []) {
      container.append(createField(definition));
    }

    return container;
  }

  function buildRoot() {
    root = document.createElement("section");
    root.id = "vvip-discovery";
    root.className = "vvip-discovery";
    root.dataset.vvipDiscoveryRoot = "true";
    root.setAttribute("aria-labelledby", "vvip-discovery-title");

    const panel = document.createElement("div");
    panel.className = "vvip-discovery__panel";
    panel.innerHTML = `
      <header class="vvip-discovery__header">
        <p class="vvip-discovery__eyebrow">VVIP TIGER DISCOVERY</p>
        <h2 class="vvip-discovery__title" id="vvip-discovery-title">ابحث بسهولة، واختر بدقة</h2>
        <p class="vvip-discovery__subtitle">تجربة مألوفة وسريعة، مع فلاتر منظمة لكل قطاع.</p>
      </header>
      <div class="vvip-discovery__body">
        <div class="vvip-discovery__quick-row">
          <div class="vvip-discovery__search-wrap">
            <span class="vvip-discovery__search-icon" aria-hidden="true">⌕</span>
            <label class="vvip-discovery__sr-only" for="vvip-discovery-query">البحث في الإعلانات</label>
            <input class="vvip-discovery__input" id="vvip-discovery-query" type="search" autocomplete="off" placeholder="ابحث باسم القطعة أو المادة أو العقار...">
          </div>
          <button class="vvip-discovery__button vvip-discovery__button--gold" type="button" data-action="toggle-advanced" aria-expanded="false" aria-controls="vvip-discovery-advanced">البحث المتقدم</button>
        </div>
        <div class="vvip-discovery__sectors" role="group" aria-label="قطاعات البحث">
          <button class="vvip-discovery__sector" type="button" data-sector="all" aria-pressed="true">الكل</button>
          <button class="vvip-discovery__sector" type="button" data-sector="auto" aria-pressed="false">السيارات والخدمات</button>
          <button class="vvip-discovery__sector" type="button" data-sector="materials" aria-pressed="false">المواد والمستلزمات</button>
          <button class="vvip-discovery__sector" type="button" data-sector="realestate" aria-pressed="false">العقارات</button>
        </div>
        <div class="vvip-discovery__advanced" id="vvip-discovery-advanced">
          <div class="vvip-discovery__filters" data-common-filters></div>
        </div>
        <div class="vvip-discovery__chips" data-active-chips aria-live="polite"></div>
        <div class="vvip-discovery__skeleton" aria-hidden="true"><div class="vvip-discovery__skeleton-line"></div><div class="vvip-discovery__skeleton-line"></div></div>
        <div class="vvip-discovery__status-row">
          <p class="vvip-discovery__status" data-results-status role="status" aria-live="polite">يتم تجهيز البحث...</p>
          <div class="vvip-discovery__pagination" aria-label="صفحات النتائج">
            <button class="vvip-discovery__button vvip-discovery__button--ghost" type="button" data-action="previous-page">السابق</button>
            <span class="vvip-discovery__page-label" data-page-label>1 / 1</span>
            <button class="vvip-discovery__button vvip-discovery__button--ghost" type="button" data-action="next-page">التالي</button>
          </div>
        </div>
        <div class="vvip-discovery__empty" data-empty-state>
          <strong>لا توجد نتائج مطابقة</strong>
          <p>جرّب تخفيف بعض الفلاتر أو البحث بكلمات أخرى.</p>
          <button class="vvip-discovery__button vvip-discovery__button--ghost" type="button" data-action="reset">مسح الفلاتر</button>
        </div>
        <div class="vvip-discovery__error" data-error-state>
          <strong>تعذر تشغيل البحث بصورة صحيحة</strong>
          <p data-error-message>أعد المحاولة دون فقدان الصفحة.</p>
          <button class="vvip-discovery__button" type="button" data-action="retry">إعادة المحاولة</button>
        </div>
        <div class="vvip-discovery__external-grid" data-external-grid hidden></div>
      </div>
    `;

    root.append(panel);

    const commonFilters = root.querySelector("[data-common-filters]");

    const commonDefinitions = [
      { name: "city", label: "المدينة", placeholder: "مثال: عمّان" },
      { name: "area", label: "المنطقة", placeholder: "مثال: الجبيهة" },
      { name: "priceMin", label: "السعر من", type: "number", inputMode: "decimal" },
      { name: "priceMax", label: "السعر إلى", type: "number", inputMode: "decimal" },
      { name: "condition", label: "الحالة", type: "select", options: [{ value: "new", label: "جديد" }, { value: "used", label: "مستعمل" }] },
      { name: "accountType", label: "نوع المعلن", type: "select", options: [{ value: "individual", label: "فرد" }, { value: "business", label: "نشاط تجاري" }, { value: "supplier", label: "مورد" }, { value: "service-provider", label: "مزود خدمة" }, { value: "office", label: "مكتب" }] },
      { name: "sort", label: "ترتيب النتائج", type: "select", options: [{ value: "latest", label: "الأحدث" }, { value: "price-asc", label: "الأقل سعرًا" }, { value: "price-desc", label: "الأعلى سعرًا" }, { value: "region", label: "حسب المنطقة" }] },
    ];

    for (const definition of commonDefinitions) {
      commonFilters.append(createField(definition));
    }

    commonFilters.append(buildSectorFields("auto"), buildSectorFields("materials"), buildSectorFields("realestate"));

    const actions = document.createElement("div");
    actions.className = "vvip-discovery__actions";
    actions.innerHTML = `
      <button class="vvip-discovery__button vvip-discovery__button--ghost" type="button" data-action="reset">مسح جميع الفلاتر</button>
      <button class="vvip-discovery__button" type="button" data-action="apply">عرض النتائج</button>
    `;

    commonFilters.append(actions);

    const header = document.querySelector("body > header, header");
    const main = document.querySelector("main");

    if (header) {
      header.insertAdjacentElement("afterend", root);
    } else if (main) {
      main.prepend(root);
    } else {
      document.body.prepend(root);
    }
  }

  function restoreState() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);
      state = { ...DEFAULT_STATE, ...parsed, page: 1 };
    } catch {
      state = { ...DEFAULT_STATE };
    }
  }

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, page: 1 }));
    } catch {
      // التخزين اختياري ولا يجب أن يعطل البحث.
    }
  }

  function syncControlsFromState() {
    const queryInput = root.querySelector("#vvip-discovery-query");
    if (queryInput) {
      queryInput.value = state.query;
    }

    root.querySelectorAll("[data-filter]").forEach((control) => {
      const key = control.dataset.filter;
      if (key in state) {
        control.value = state[key] ?? "";
      }
    });

    root.querySelectorAll("[data-sector]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.sector === state.sector));
    });

    updateSectorFields();
  }

  function updateStateFromControls() {
    state.query = root.querySelector("#vvip-discovery-query")?.value || "";
    root.querySelectorAll("[data-filter]").forEach((control) => {
      state[control.dataset.filter] = control.value;
    });
  }

  function updateSectorFields() {
    root.querySelectorAll("[data-sector-fields]").forEach((group) => {
      const active = group.dataset.sectorFields === state.sector;
      group.classList.toggle("is-active", active);
    });
  }

  function matchesText(itemValue, selectedValue, partial = true) {
    if (!selectedValue) {
      return true;
    }

    const itemNormalized = normalizeText(itemValue);
    const selectedNormalized = normalizeText(selectedValue);

    if (!itemNormalized) {
      return false;
    }

    return partial ? itemNormalized.includes(selectedNormalized) : itemNormalized === selectedNormalized;
  }

  function matchesNumberRange(value, minValue, maxValue) {
    if (!minValue && !maxValue) {
      return true;
    }

    if (value === null || value === undefined) {
      return false;
    }

    const min = minValue === "" ? null : Number(minValue);
    const max = maxValue === "" ? null : Number(maxValue);

    if (min !== null && Number.isFinite(min) && value < min) {
      return false;
    }

    if (max !== null && Number.isFinite(max) && value > max) {
      return false;
    }

    return true;
  }

  function matchesItem(item) {
    const query = normalizeText(state.query);

    if (query && !item.searchText.includes(query)) {
      return false;
    }

    if (state.sector !== "all" && item.sector !== state.sector) {
      return false;
    }

    if (!matchesText(item.city, state.city)) {
      return false;
    }

    if (!matchesText(item.area, state.area)) {
      return false;
    }

    if (!matchesNumberRange(item.price, state.priceMin, state.priceMax)) {
      return false;
    }

    if (!matchesText(item.condition, state.condition, false)) {
      return false;
    }

    if (!matchesText(item.accountType, state.accountType, false)) {
      return false;
    }

    if (state.sector === "auto") {
      return matchesText(item.itemKind, state.autoItemKind, false) && matchesText(item.vehicleClass, state.autoVehicleClass) && matchesText(item.brand, state.autoBrand) && matchesText(item.model, state.autoModel) && matchesText(item.year, state.autoYear, false) && matchesText(item.fuel, state.autoFuel, false) && matchesText(item.condition, state.autoState, false) && matchesText(item.availability, state.autoAvailability, false);
    }

    if (state.sector === "realestate") {
      return matchesText(item.transaction, state.realTransaction, false) && matchesText(item.propertyType, state.realPropertyType, false) && matchesText(item.governorate, state.realGovernorate) && matchesNumberRange(item.size, state.realSizeMin, state.realSizeMax) && (!state.realRooms || item.rooms === Number(state.realRooms)) && (!state.realBathrooms || item.bathrooms === Number(state.realBathrooms)) && matchesText(item.availability, state.realAvailability, false);
    }

    if (state.sector === "materials") {
      if (state.materialMoq && (item.moq === null || item.moq > Number(state.materialMoq))) {
        return false;
      }

      return matchesText(item.materialType, state.materialType) && matchesText(item.supplier, state.materialSupplier) && matchesText(item.tradeMode, state.materialTradeMode, false) && matchesText(item.unit, state.materialUnit) && matchesText(item.availability, state.materialAvailability, false) && matchesText(item.fulfillment, state.materialFulfillment, false) && matchesText(item.condition, state.materialState, false);
    }

    return true;
  }

  function sortItems(items) {
    const sorted = [...items];

    if (state.sort === "price-asc") {
      sorted.sort((a, b) => {
        const left = a.price ?? Number.POSITIVE_INFINITY;
        const right = b.price ?? Number.POSITIVE_INFINITY;
        return left - right;
      });
    } else if (state.sort === "price-desc") {
      sorted.sort((a, b) => {
        const left = a.price ?? Number.NEGATIVE_INFINITY;
        const right = b.price ?? Number.NEGATIVE_INFINITY;
        return right - left;
      });
    } else if (state.sort === "region") {
      sorted.sort((a, b) => `${a.city} ${a.area}`.localeCompare(`${b.city} ${b.area}`, "ar"));
    } else {
      sorted.sort((a, b) => {
        const left = Date.parse(a.createdAt || "") || 0;
        const right = Date.parse(b.createdAt || "") || 0;
        if (left !== right) {
          return right - left;
        }

        return a.sourceIndex - b.sourceIndex;
      });
    }

    return sorted;
  }

  function currentItems() {
    return Array.isArray(externalItems) ? externalItems : discoveredItems;
  }

  function hideAllDomItems() {
    discoveredItems.forEach((item) => {
      if (!item.element) {
        return;
      }

      if (item.element.dataset.vvipOriginalHidden === undefined) {
        item.element.dataset.vvipOriginalHidden = item.originalHidden ? "true" : "false";
      }

      if (!item.element.dataset.vvipOriginalDisplay) {
        item.element.dataset.vvipOriginalDisplay = item.element.style.display || "__default__";
      }

      item.element.hidden = true;
    });
  }

  function showDomItem(item) {
    if (!item.element) {
      return;
    }

    const originalHidden = item.element.dataset.vvipOriginalHidden === "true";
    const previous = item.element.dataset.vvipOriginalDisplay;

    item.element.hidden = originalHidden;

    if (!originalHidden && previous && previous !== "__default__") {
      item.element.style.display = previous;
    } else if (!originalHidden) {
      item.element.style.removeProperty("display");
    }
  }

  function renderExternalCards(items) {
    const grid = root.querySelector("[data-external-grid]");
    grid.replaceChildren();

    if (!Array.isArray(externalItems)) {
      grid.hidden = true;
      return;
    }

    grid.hidden = false;
    const fragment = document.createDocumentFragment();

    for (const item of items) {
      const article = document.createElement("article");
      article.className = "vvip-discovery-card";
      article.dataset.vvipListing = "true";

      if (item.imageUrl) {
        const image = document.createElement("img");
        image.className = "vvip-discovery-card__image";
        image.loading = "lazy";
        image.decoding = "async";
        image.alt = item.title || "صورة الإعلان";
        image.src = item.imageUrl;
        article.append(image);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "vvip-discovery-card__placeholder";
        placeholder.textContent = "لا توجد صورة";
        article.append(placeholder);
      }

      const body = document.createElement("div");
      body.className = "vvip-discovery-card__body";

      const title = document.createElement("h3");
      title.className = "vvip-discovery-card__title";
      title.textContent = item.title || "إعلان";

      const price = document.createElement("p");
      price.className = "vvip-discovery-card__price";
      price.textContent = item.priceText || (item.price !== null && item.price !== undefined ? `${item.price} د.أ` : "السعر غير محدد");

      const meta = document.createElement("p");
      meta.className = "vvip-discovery-card__meta";
      meta.textContent = [item.city, item.area, item.category].filter(Boolean).join(" • ");

      body.append(title, price, meta);
      article.append(body);
      fragment.append(article);
    }

    grid.append(fragment);
  }

  function renderChips() {
    const container = root.querySelector("[data-active-chips]");
    container.replaceChildren();

    const labels = {
      query: "بحث",
      city: "مدينة",
      area: "منطقة",
      priceMin: "سعر من",
      priceMax: "سعر إلى",
      condition: "حالة",
      accountType: "معلن",
      autoBrand: "ماركة",
      autoModel: "موديل",
      autoYear: "سنة",
      autoFuel: "طاقة",
      realTransaction: "معاملة",
      realPropertyType: "عقار",
      realGovernorate: "محافظة",
      materialType: "مادة",
      materialSupplier: "مورد",
      materialTradeMode: "بيع",
      materialUnit: "وحدة",
      materialMoq: "حد طلب",
      materialAvailability: "توفر",
      materialFulfillment: "تسليم",
    };

    for (const [key, label] of Object.entries(labels)) {
      const value = state[key];
      if (!value) {
        continue;
      }

      const chip = document.createElement("span");
      chip.className = "vvip-discovery__chip";
      chip.textContent = `${label}: ${value}`;
      container.append(chip);
    }
  }

  function render() {
    try {
      updateStateFromControls();
      const filtered = sortItems(currentItems().filter(matchesItem));
      const totalResults = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

      state.page = Math.min(Math.max(1, Number(state.page) || 1), totalPages);
      const start = (state.page - 1) * PAGE_SIZE;
      const pageItems = filtered.slice(start, start + PAGE_SIZE);

      hideAllDomItems();

      if (!Array.isArray(externalItems)) {
        pageItems.forEach(showDomItem);
      }

      renderExternalCards(pageItems);
      renderChips();
      saveState();

      const status = root.querySelector("[data-results-status]");
      const pageLabel = root.querySelector("[data-page-label]");
      const empty = root.querySelector("[data-empty-state]");
      const error = root.querySelector("[data-error-state]");
      const previous = root.querySelector('[data-action="previous-page"]');
      const next = root.querySelector('[data-action="next-page"]');

      error.classList.remove("is-visible");

      if (currentItems().length === 0) {
        status.textContent = "واجهة البحث جاهزة، ولا توجد إعلانات مرتبطة بعد.";
      } else {
        status.textContent = totalResults === 0 ? "لم نجد نتائج مطابقة." : `تم العثور على ${totalResults} نتيجة.`;
      }

      pageLabel.textContent = `${state.page} / ${totalPages}`;
      previous.disabled = state.page <= 1;
      next.disabled = state.page >= totalPages;
      empty.classList.toggle("is-visible", totalResults === 0);
      root.classList.add("is-ready");

      window.dispatchEvent(new CustomEvent("vvip:discovery-change", { detail: { state: { ...state }, totalResults, page: state.page, totalPages } }));
    } catch (error) {
      showError(error);
    }
  }

  function scheduleRender() {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      state.page = 1;
      render();
    }, DEBOUNCE_MS);
  }

  function resetFilters() {
    state = { ...DEFAULT_STATE };
    syncControlsFromState();
    render();
  }

  function showError(error) {
    const errorState = root?.querySelector("[data-error-state]");
    const message = root?.querySelector("[data-error-message]");

    if (!errorState || !message) {
      return;
    }

    message.textContent = "حدث خلل في واجهة البحث. أعد المحاولة، ولن تتأثر بيانات حسابك.";
    errorState.classList.add("is-visible");

    console.error("[VVIP Discovery] Safe error:", error instanceof Error ? error.message : "Unknown error");
  }

  function showToast(message) {
    document.querySelectorAll(".vvip-discovery-toast").forEach((toast) => toast.remove());
    const toast = document.createElement("div");
    toast.className = "vvip-discovery-toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  function createMobileNavigation() {
    const existingNav = document.querySelector(["[data-vvip-bottom-nav]", ".vvip-mobile-nav", ".bottom-nav", ".mobile-nav", "nav[aria-label='التنقل الرئيسي للهاتف']"].join(","));
    if (existingNav || !Array.isArray(CONFIG.nav)) {
      return;
    }

    const nav = document.createElement("nav");
    nav.className = "vvip-mobile-nav";
    nav.dataset.vvipBottomNav = "true";
    nav.setAttribute("aria-label", "التنقل الرئيسي للهاتف");

    document.body.dataset.vvipDiscoveryMobileNav = "true";

    for (const item of CONFIG.nav) {
      let control;
      if (item.enabled && item.href) {
        control = document.createElement("a");
        control.href = item.href;
        if (item.id === "home" && (location.pathname === "/" || location.pathname.endsWith("/index.html") || location.pathname.endsWith("index.html"))) {
          control.setAttribute("aria-current", "page");
        } else if (item.id === "search" && location.hash === "#vvip-discovery") {
          control.setAttribute("aria-current", "page");
        }
      } else {
        control = document.createElement("button");
        control.type = "button";
        control.setAttribute("aria-disabled", "true");
        control.addEventListener("click", () => {
          showToast(`${item.label}: هذه الصفحة ستُفعل بعد اكتمال مرحلتها.`);
        });
      }

      control.className = "vvip-mobile-nav__item";
      control.dataset.navItem = item.id;

      const icon = document.createElement("span");
      icon.className = "vvip-mobile-nav__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = item.icon || "•";

      const label = document.createElement("span");
      label.className = "vvip-mobile-nav__label";
      label.textContent = item.label;

      control.append(icon, label);
      nav.append(control);
    }

    document.body.append(nav);
  }

  function bindEvents() {
    root.addEventListener("input", (event) => {
      if (event.target.matches("#vvip-discovery-query, [data-filter]")) {
        scheduleRender();
      }
    });

    root.addEventListener("change", (event) => {
      if (event.target.matches("[data-filter]")) {
        state.page = 1;
        render();
      }
    });

    root.addEventListener("click", (event) => {
      const sectorButton = event.target.closest("[data-sector]");
      if (sectorButton) {
        state.sector = sectorButton.dataset.sector;
        state.page = 1;
        root.querySelectorAll("[data-sector]").forEach((button) => {
          button.setAttribute("aria-pressed", String(button === sectorButton));
        });
        updateSectorFields();
        render();
        return;
      }

      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.action;
      if (action === "toggle-advanced") {
        const panel = root.querySelector("#vvip-discovery-advanced");
        const opening = !panel.classList.contains("is-open");
        panel.classList.toggle("is-open", opening);
        actionButton.setAttribute("aria-expanded", String(opening));

        if (opening) {
          lastFocusedElement = actionButton;
          panel.querySelector("input, select")?.focus();
        } else {
          lastFocusedElement?.focus();
        }
      } else if (action === "reset") {
        resetFilters();
      } else if (action === "apply") {
        state.page = 1;
        render();
        root.querySelector("[data-results-status]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (action === "previous-page") {
        state.page = Math.max(1, state.page - 1);
        render();
      } else if (action === "next-page") {
        state.page += 1;
        render();
      } else if (action === "retry") {
        discoverItems();
        render();
      }
    });
  }

  function normalizeExternalItem(item, index) {
    const safeItem = item && typeof item === "object" ? item : {};
    const title = String(safeItem.title || safeItem.name || "إعلان");
    const priceText = String(safeItem.priceText || "");
    const price = typeof safeItem.price === "number" ? safeItem.price : parseNumber(safeItem.price ?? priceText);

    const normalized = {
      ...safeItem,
      id: String(safeItem.id || `external-${index + 1}`),
      sourceIndex: index,
      title,
      price,
      priceText,
      sector: normalizeSector(safeItem.sector),
      city: String(safeItem.city || ""),
      area: String(safeItem.area || safeItem.region || ""),
      condition: String(safeItem.condition || safeItem.state || ""),
      accountType: String(safeItem.accountType || ""),
      category: String(safeItem.category || ""),
      brand: String(safeItem.brand || ""),
      model: String(safeItem.model || ""),
      year: String(safeItem.year || ""),
      fuel: String(safeItem.fuel || safeItem.energy || ""),
      itemKind: String(safeItem.itemKind || ""),
      vehicleClass: String(safeItem.vehicleClass || ""),
      availability: String(safeItem.availability || ""),
      transaction: String(safeItem.transaction || ""),
      propertyType: String(safeItem.propertyType || ""),
      governorate: String(safeItem.governorate || ""),
      size: parseNumber(safeItem.size),
      rooms: parseNumber(safeItem.rooms),
      bathrooms: parseNumber(safeItem.bathrooms),
      materialType: String(safeItem.materialType || ""),
      supplier: String(safeItem.supplier || ""),
      tradeMode: String(safeItem.tradeMode || ""),
      unit: String(safeItem.unit || ""),
      moq: parseNumber(safeItem.moq),
      fulfillment: String(safeItem.fulfillment || ""),
      createdAt: String(safeItem.createdAt || ""),
      imageUrl: String(safeItem.imageUrl || ""),
    };

    normalized.searchText = normalizeText(Object.values(normalized).join(" "));
    return normalized;
  }

  function clearExternalItems() {
    externalItems = null;
    discoverItems();
    state.page = 1;
    render();
  }

  function setItems(items) {
    if (items === null) {
      clearExternalItems();
      return;
    }

    if (!Array.isArray(items)) {
      throw new TypeError("VVIPDiscovery.setItems expects an array or null.");
    }

    externalItems = items.map(normalizeExternalItem);
    state.page = 1;
    render();
  }

  function initialize() {
    try {
      restoreState();
      buildRoot();
      syncControlsFromState();
      discoverItems();
      bindEvents();
      createMobileNavigation();

      window.requestAnimationFrame(() => {
        render();
      });

      window.VVIPDiscovery = Object.freeze({
        version: "1.0.0",
        refresh() {
          discoverItems();
          render();
        },
        reset: resetFilters,
        clearExternalItems,
        setItems,
        getState() {
          return { ...state };
        },
        getVisibleCount() {
          return currentItems().filter(matchesItem).length;
        },
      });

      window.dispatchEvent(new CustomEvent("vvip:discovery-ready", { detail: { version: "1.0.0", mode: discoveredItems.length > 0 ? "dom" : "empty-ready" } }));
    } catch (error) {
      if (!root) {
        buildRoot();
      }

      showError(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
