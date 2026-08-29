const ALLOWED_ENTRY_IDS = Object.freeze(new Set([
  "my-capabilities",
  "capability-assignments",
  "delegation",
  "partners",
  "audit-history",
  "countries",
  "country-governance",
  "country-operations"
]));

const EMPTY_ENTRIES = Object.freeze([]);
const EMPTY_PASSPORT = Object.freeze({
  ok: false,
  title: "صلاحياتي",
  authorityClass: null,
  scopeLabel: null,
  status: "غير متاحة",
  actions: EMPTY_ENTRIES
});

const HUMAN_ENTRY_LABELS = Object.freeze({
  "my-capabilities": "صلاحياتي",
  "capability-assignments": "إدارة الصلاحيات",
  delegation: "التفويض",
  partners: "الشركاء",
  "audit-history": "سجل القرارات والتدقيق",
  countries: "الدول",
  "country-governance": "حوكمة الدولة",
  "country-operations": "عمليات الدولة"
});

function isValidatedView(view) {
  return Boolean(
    view && typeof view === "object" && Object.isFrozen(view)
    && view.ok === true && view.code === "OK"
    && view.actor && typeof view.actor === "object" && Object.isFrozen(view.actor)
    && Array.isArray(view.entries) && Object.isFrozen(view.entries)
    && view.entries.every((entry) => entry && typeof entry === "object"
      && Object.isFrozen(entry)
      && typeof entry.id === "string" && ALLOWED_ENTRY_IDS.has(entry.id)
      && typeof entry.label === "string" && entry.label.length > 0 && entry.label.length <= 80)
  );
}

export function deriveCapabilityMenuEntries(view) {
  if (!isValidatedView(view)) return EMPTY_ENTRIES;
  const ids = view.entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) return EMPTY_ENTRIES;
  return Object.freeze(view.entries.map((entry) => Object.freeze({ id: entry.id, label: entry.label })));
}

function scopeLabel(scope) {
  if (!scope || typeof scope !== "object") return "النطاق المؤكد من الخادم";
  const level = String(scope.level || scope.scopeLevel || "").toLowerCase();
  if (level === "platform") return "المنصة العالمية";

  const country = scope.country || scope.countryCode || scope.country_id || null;
  const sector = scope.sector || scope.sectorId || scope.sector_id || null;
  const region = scope.region || scope.regionId || scope.region_id || null;

  if (level === "country" && country) return `الدولة: ${country}`;
  if (level === "sector" && sector) return country ? `القطاع: ${sector} · ${country}` : `القطاع: ${sector}`;
  if (level === "region" && region) return country ? `المنطقة: ${region} · ${country}` : `المنطقة: ${region}`;
  if (country && sector) return `القطاع: ${sector} · ${country}`;
  if (country) return `الدولة: ${country}`;
  return "النطاق المؤكد من الخادم";
}

export function deriveCapabilityPassport(view) {
  if (!isValidatedView(view)) return EMPTY_PASSPORT;
  const actions = deriveCapabilityMenuEntries(view);
  return Object.freeze({
    ok: true,
    title: "صلاحياتي",
    authorityClass: view.actor.authorityClass,
    scopeLabel: scopeLabel(view.actor.scope),
    status: "نشطة",
    actions
  });
}

function button(label, attributes = {}) {
  const control = document.createElement("button");
  control.type = "button";
  control.className = "fusion-capability-entry fusion-capability-command";
  control.textContent = label;
  for (const [name, value] of Object.entries(attributes)) {
    if (value === "") control.setAttribute(name, "");
    else control.setAttribute(name, value);
  }
  return control;
}

function renderOrdinaryCommands(host) {
  const group = document.createElement("section");
  group.className = "fusion-capability-command-group";
  group.setAttribute("aria-label", "أوامر TIGER");
  group.append(
    button("ملفي", { "data-social-nav": "profile" }),
    button("اكتشاف القطاعات", { "data-social-nav": "marketplace" }),
    button("خزنة الظهور", { "data-nexus-vault-trigger": "" }),
    button("الحساب والإعدادات", { "data-fusion-account-trigger": "" })
  );
  host.append(group);
}

function renderPassport(host, passport) {
  const section = document.createElement("section");
  section.className = "fusion-capability-passport";
  section.setAttribute("aria-label", "صلاحياتي");

  const heading = document.createElement("h3");
  heading.textContent = passport.title;
  section.append(heading);

  if (!passport.ok) {
    const unavailable = document.createElement("p");
    unavailable.className = "fusion-capability-empty";
    unavailable.textContent = "لا توجد صلاحيات تشغيلية مؤكدة من الخادم لهذه الجلسة.";
    section.append(unavailable);
    host.append(section);
    return;
  }

  const identity = document.createElement("div");
  identity.className = "fusion-capability-passport__identity";
  identity.innerHTML = `<strong>${passport.authorityClass}</strong><span>${passport.scopeLabel}</span><span>الحالة: ${passport.status}</span>`;
  section.append(identity);

  const actions = document.createElement("div");
  actions.className = "fusion-capability-passport__actions";
  for (const entry of passport.actions) {
    const row = document.createElement("div");
    row.className = "fusion-capability-entry";
    row.dataset.capabilityId = entry.id;
    row.textContent = HUMAN_ENTRY_LABELS[entry.id] || entry.label;
    actions.append(row);
  }
  section.append(actions);
  host.append(section);
}

function renderMenu(host, view) {
  host.replaceChildren();
  renderOrdinaryCommands(host);
  renderPassport(host, deriveCapabilityPassport(view));
}

export function mountCapabilityMenu(view, root = document) {
  const trigger = root.querySelector("[data-fusion-capability-menu]");
  const layer = root.querySelector("[data-fusion-capability-sheet]");
  const host = root.querySelector("[data-fusion-capability-entries]");
  if (!trigger || !layer || !host) return Object.freeze({ mounted: false });

  renderMenu(host, view);
  const open = () => { layer.hidden = false; layer.setAttribute("aria-hidden", "false"); };
  const close = () => { layer.hidden = true; layer.setAttribute("aria-hidden", "true"); };
  trigger.addEventListener("click", open);
  for (const closeButton of root.querySelectorAll("[data-fusion-capability-close]")) closeButton.addEventListener("click", close);

  return Object.freeze({ mounted: true, passport: deriveCapabilityPassport(view) });
}

function initialValidatedView(globalObject) {
  const candidates = [
    globalObject?.VVIPCapabilityViewCurrent,
    globalObject?.TIGERCapabilityViewCurrent,
    globalObject?.VVIPFusionCapabilityView
  ];
  return candidates.find(isValidatedView) || undefined;
}

export function hydrateCapabilityMenu(root = document, globalObject = window) {
  let currentView = initialValidatedView(globalObject);
  const mounted = mountCapabilityMenu(currentView, root);
  if (!mounted.mounted) return mounted;

  const update = (view) => {
    if (!isValidatedView(view)) return false;
    currentView = view;
    const host = root.querySelector("[data-fusion-capability-entries]");
    if (!host) return false;
    renderMenu(host, currentView);
    return true;
  };

  globalObject.addEventListener?.("vvip:capability-view-ready", (event) => {
    update(event?.detail?.view);
  });
  globalObject.addEventListener?.("tiger:capability-view-ready", (event) => {
    update(event?.detail?.view);
  });

  return Object.freeze({ mounted: true, update });
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  const start = () => hydrateCapabilityMenu(document, window);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
