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

function renderEntries(host, entries) {
  host.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "fusion-capability-empty";
    empty.textContent = "لا توجد صلاحيات مؤكدة من الخادم لهذه الجلسة.";
    host.append(empty);
    return;
  }
  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = "fusion-capability-entry";
    row.dataset.capabilityId = entry.id;
    const label = document.createElement("span");
    label.textContent = entry.label;
    row.append(label);
    host.append(row);
  }
}

export function mountCapabilityMenu(view = null, root = document) {
  const trigger = root.querySelector("[data-fusion-capability-menu]");
  const layer = root.querySelector("[data-fusion-capability-sheet]");
  const host = root.querySelector("[data-fusion-capability-entries]");
  if (!trigger || !layer || !host) return Object.freeze({ mounted: false });

  const entries = deriveCapabilityMenuEntries(view);
  renderEntries(host, entries);
  const open = () => { layer.hidden = false; layer.setAttribute("aria-hidden", "false"); };
  const close = () => { layer.hidden = true; layer.setAttribute("aria-hidden", "true"); };
  trigger.addEventListener("click", open);
  for (const closeButton of root.querySelectorAll("[data-fusion-capability-close]")) closeButton.addEventListener("click", close);
  return Object.freeze({ mounted: true, entries });
}

if (typeof document !== "undefined") {
  const start = () => mountCapabilityMenu(null, document);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
