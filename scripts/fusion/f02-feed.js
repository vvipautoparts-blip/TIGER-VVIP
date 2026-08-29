(function (root) {
  "use strict";

  const state = {
    items: Object.freeze([]),
    sector: "all",
    query: ""
  };

  function freeze(value) {
    return Object.freeze(value);
  }

  function safeText(value) {
    const node = root.document.createElement("span");
    node.textContent = String(value == null ? "" : value);
    return node.innerHTML;
  }

  function normalizedQuery(value) {
    return String(value || "").trim().toLocaleLowerCase("ar");
  }

  function registry() {
    const source = root.VVIP_FUSION_SECTOR_REGISTRY;
    if (!Array.isArray(source)) return freeze([]);
    const seen = new Set();
    const values = [];
    for (const entry of source) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry) || entry.enabled !== true) continue;
      const key = typeof entry.key === "string" ? entry.key.trim() : "";
      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      if (!key || !label || seen.has(key)) continue;
      seen.add(key);
      values.push(freeze({ key, label }));
    }
    return freeze(values);
  }

  function sectorLabel(key) {
    const match = registry().find((entry) => entry.key === key);
    return match ? match.label : key;
  }

  function intentLabel(value) {
    if (value === "OFFER") return "عرض";
    if (value === "NEED") return "طلب";
    if (value === "SERVICE") return "خدمة";
    if (value === "OPPORTUNITY") return "فرصة";
    return "";
  }

  function currentLivingObjects(items) {
    if (!Array.isArray(items)) return freeze([]);
    return freeze(items.filter((item) => (
      item
      && typeof item.id === "string"
      && typeof item.sectorKey === "string"
      && item.sectorKey.length > 0
      && typeof item.intentClass === "string"
      && ["OFFER", "NEED", "SERVICE", "OPPORTUNITY"].includes(item.intentClass)
    )));
  }

  function visibleItems() {
    const query = normalizedQuery(state.query);
    return state.items.filter((item) => {
      if (state.sector !== "all" && item.sectorKey !== state.sector) return false;
      if (!query) return true;
      const haystack = normalizedQuery([
        item.body,
        item.authorDisplayName,
        sectorLabel(item.sectorKey),
        intentLabel(item.intentClass)
      ].filter(Boolean).join(" "));
      return haystack.includes(query);
    });
  }

  function renderFilters() {
    const host = root.document.querySelector("[data-vvip-sector-filters]");
    if (!host) return;
    const available = new Set(state.items.map((item) => item.sectorKey));
    const controls = [
      '<button class="filter is-active" type="button" data-sector-filter="all" aria-pressed="true">الكل</button>'
    ];
    for (const entry of registry()) {
      if (!available.has(entry.key)) continue;
      controls.push(`<button class="filter" type="button" data-sector-filter="${safeText(entry.key)}" aria-pressed="false">${safeText(entry.label)}</button>`);
    }
    host.innerHTML = controls.join("");
  }

  function cardTemplate(item) {
    const author = item.authorAvailable && item.authorProfileId
      ? `<button class="social-feed-post__author" type="button" data-social-profile-id="${safeText(item.authorProfileId)}">${safeText(item.authorDisplayName)}</button>`
      : `<strong class="social-feed-post__author">${safeText(item.authorDisplayName)}</strong>`;
    return `<article class="social-feed-post nexus-sector-object-card" data-social-post-id="${safeText(item.id)}" data-nexus-sector-key="${safeText(item.sectorKey)}" data-nexus-intent-class="${safeText(item.intentClass)}">
      <header class="social-feed-post__header">
        <span class="social-feed-post__avatar" aria-hidden="true">V</span>
        <div class="social-feed-post__identity">${author}<div class="social-feed-post__details"><span>${safeText(sectorLabel(item.sectorKey))}</span><span aria-hidden="true"> · </span><span>${safeText(intentLabel(item.intentClass))}</span></div></div>
      </header>
      <p class="social-feed-post__body">${safeText(item.body)}</p>
    </article>`;
  }

  function render() {
    const feed = root.document.querySelector("[data-vvip-marketplace-feed]");
    const count = root.document.querySelector("[data-results-count]");
    const empty = root.document.querySelector("[data-empty-state]");
    if (!feed || !count || !empty) return false;

    const items = visibleItems();
    feed.innerHTML = items.map(cardTemplate).join("");
    feed.setAttribute("aria-busy", "false");
    count.textContent = items.length ? `${items.length} فرصة حيّة` : "";
    empty.hidden = items.length !== 0;
    return true;
  }

  function renderFailure() {
    const feed = root.document.querySelector("[data-vvip-marketplace-feed]");
    const count = root.document.querySelector("[data-results-count]");
    const empty = root.document.querySelector("[data-empty-state]");
    if (feed) {
      feed.setAttribute("aria-busy", "false");
      feed.innerHTML = '<p class="social-feed-state" role="status">تعذر تحميل الفرص الحية الآن.</p>';
    }
    if (count) count.textContent = "";
    if (empty) empty.hidden = true;
    return freeze({ ok: false, code: "NEXUS_SECTOR_DISCOVERY_UNAVAILABLE" });
  }

  async function loadLivingObjects() {
    const runtimeApi = root.TIGERSocialRuntime;
    const feedApi = root.TIGERSocialFeed;
    if (!runtimeApi || typeof runtimeApi.createCurrentSocialRuntime !== "function") return renderFailure();
    if (!feedApi || typeof feedApi.createSocialFeedReadModel !== "function") return renderFailure();

    const runtime = runtimeApi.createCurrentSocialRuntime(root);
    const readModel = feedApi.createSocialFeedReadModel({ runtime });
    let result;
    try {
      result = await readModel.load({ limit: 100 });
    } catch (_) {
      return renderFailure();
    }
    if (!result || result.ok !== true || !Array.isArray(result.items)) return renderFailure();

    state.items = currentLivingObjects(result.items);
    renderFilters();
    render();
    return freeze({ ok: true, count: state.items.length });
  }

  function bindControls() {
    const search = root.document.querySelector("[data-listing-search]");
    if (search) {
      search.addEventListener("input", function () {
        state.query = search.value || "";
        render();
      });
    }

    root.document.addEventListener("click", function (event) {
      const filter = event.target && event.target.closest
        ? event.target.closest("[data-sector-filter]")
        : null;
      if (!filter) return;
      const key = filter.getAttribute("data-sector-filter");
      if (key !== "all" && !registry().some((entry) => entry.key === key)) return;
      state.sector = key || "all";
      for (const button of root.document.querySelectorAll("[data-sector-filter]")) {
        const selected = button === filter;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      }
      render();
    });
  }

  let started = false;
  async function start() {
    if (started) return freeze({ installed: true });
    started = true;
    bindControls();
    try {
      if (root.VVIPRuntimeReady && typeof root.VVIPRuntimeReady.then === "function") {
        await root.VVIPRuntimeReady;
      }
    } catch (_) {
      return renderFailure();
    }
    return loadLivingObjects();
  }

  root.TIGERNexusSectorDiscovery = freeze({
    start,
    reload: loadLivingObjects,
    snapshot: function () {
      return freeze({ count: state.items.length, sector: state.sector, query: state.query });
    }
  });

  if (root.document && root.document.readyState === "loading") {
    root.addEventListener("DOMContentLoaded", function () { void start(); }, { once: true });
  } else if (root.document) {
    void start();
  }
})(window);
