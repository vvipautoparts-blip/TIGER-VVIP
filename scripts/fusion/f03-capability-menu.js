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

const HUMAN_LABELS = Object.freeze({
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
  const country = scope.country || scope.countryCode || scope.country_id || null;
  const sector = scope.sector || scope.sectorId || scope.sector_id || null;
  const region = scope.region || scope.regionId || scope.region_id || null;

  if (level === "platform") return "المنصة العالمية";
  if (level === "country" && country) return `الدولة: ${country}`;
  if (level === "sector" && sector) return country ? `القطاع: ${sector} · ${country}` : `القطاع: ${sector}`;
  if (level === "region" && region) return country ? `المنطقة: ${region} · ${country}` : `المنطقة: ${region}`;
  if (country && sector) return `القطاع: ${sector} · ${country}`;
  if (country) return `الدولة: ${country}`;
  return "النطاق المؤكد من الخادم";
}

export function deriveCapabilityPassport(view) {
  if (!isValidatedView(view)) return EMPTY_PASSPORT;
  return Object.freeze({
    ok: true,
    title: "صلاحياتي",
    authorityClass: view.actor.authorityClass,
    scopeLabel: scopeLabel(view.actor.scope),
    status: "نشطة",
    actions: deriveCapabilityMenuEntries(view)
  });
}

function createCommand(root, label, attrs) {
  const node = root.createElement("button");
  node.type = "button";
  node.className = "fusion-capability-entry fusion-capability-command";
  node.textContent = label;
  for (const [name, value] of Object.entries(attrs || {})) {
    node.setAttribute(name, value);
  }
  return node;
}

function renderOrdinaryCommands(root, host) {
  const group = root.createElement("section");
  group.className = "fusion-capability-command-group";
  group.setAttribute("aria-label", "أوامر TIGER");
  group.append(
    createCommand(root, "ملفي", { "data-social-nav": "profile" }),
    createCommand(root, "اكتشاف القطاعات", { "data-social-nav": "marketplace" }),
    createCommand(root, "خزنة الظهور", { "data-nexus-vault-trigger": "" }),
    createCommand(root, "الحساب والإعدادات", { "data-fusion-account-trigger": "" })
  );
  host.append(group);
}

function renderPassport(root, host, passport) {
  const section = root.createElement("section");
  section.className = "fusion-capability-passport";
  section.setAttribute("aria-label", "صلاحياتي");

  const heading = root.createElement("h3");
  heading.textContent = passport.title;
  section.append(heading);

  if (!passport.ok) {
    const empty = root.createElement("p");
    empty.className = "fusion-capability-empty";
    empty.textContent = "لا توجد صلاحيات تشغيلية مؤكدة من الخادم لهذه الجلسة.";
    section.append(empty);
    host.append(section);
    return;
  }

  const identity = root.createElement("div");
  identity.className = "fusion-capability-passport__identity";
  const role = root.createElement("strong");
  role.textContent = passport.authorityClass;
  const scope = root.createElement("span");
  scope.textContent = passport.scopeLabel;
  const status = root.createElement("span");
  status.textContent = `الحالة: ${passport.status}`;
  identity.append(role, scope, status);
  section.append(identity);

  const actions = root.createElement("div");
  actions.className = "fusion-capability-passport__actions";
  for (const entry of passport.actions) {
    const row = root.createElement("div");
    row.className = "fusion-capability-entry";
    row.dataset.capabilityId = entry.id;
    row.textContent = HUMAN_LABELS[entry.id] || entry.label;
    actions.append(row);
  }
  section.append(actions);
  host.append(section);
}

function renderMenu(root, host, view) {
  host.replaceChildren();
  renderOrdinaryCommands(root, host);
  renderPassport(root, host, deriveCapabilityPassport(view));
}

function initialValidatedView(globalObject) {
  const candidates = [
    globalObject && globalObject.VVIPCapabilityViewCurrent,
    globalObject && globalObject.TIGERCapabilityViewCurrent,
    globalObject && globalObject.VVIPFusionCapabilityView
  ];
  return candidates.find(isValidatedView);
}

export function mountCapabilityMenu(view, root = document) {
  const trigger = root.querySelector("[data-fusion-capability-menu]");
  const layer = root.querySelector("[data-fusion-capability-sheet]");
  const host = root.querySelector("[data-fusion-capability-entries]");
  if (!trigger || !layer || !host) return Object.freeze({ mounted: false });

  renderMenu(root, host, view);

  const open = () => {
    layer.hidden = false;
    layer.setAttribute("aria-hidden", "false");
  };
  const close = () => {
    layer.hidden = true;
    layer.setAttribute("aria-hidden", "true");
  };

  trigger.addEventListener("click", open);
  for (const closeButton of root.querySelectorAll("[data-fusion-capability-close]")) {
    closeButton.addEventListener("click", close);
  }
  host.addEventListener("click", (event) => {
    if (event.target.closest("button")) close();
  });

  return Object.freeze({ mounted: true, passport: deriveCapabilityPassport(view) });
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
    renderMenu(root, host, currentView);
    return true;
  };

  globalObject.addEventListener?.("vvip:capability-view-ready", (event) => update(event && event.detail && event.detail.view));
  globalObject.addEventListener?.("tiger:capability-view-ready", (event) => update(event && event.detail && event.detail.view));

  return Object.freeze({ mounted: true, update });
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  const start = () => hydrateCapabilityMenu(document, window);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
