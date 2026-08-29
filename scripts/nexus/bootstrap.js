import { derivePulseVault, PULSE_VAULT_MODES } from "./pulse-vault.js";

const INTENTS = Object.freeze([
  Object.freeze({ value: "OFFER", label: "أعرض" }),
  Object.freeze({ value: "NEED", label: "أبحث / أحتاج" }),
  Object.freeze({ value: "SERVICE", label: "أقدم خدمة" }),
  Object.freeze({ value: "OPPORTUNITY", label: "فرصة" })
]);

let installed = false;
let vaultLayer = null;
let vaultSnapshot = null;

function enabledSectors(root) {
  const source = root.VVIP_FUSION_SECTOR_REGISTRY;
  if (!Array.isArray(source)) return [];
  return source
    .filter((entry) => entry && typeof entry === "object" && entry.enabled === true
      && typeof entry.key === "string" && entry.key.trim()
      && typeof entry.label === "string" && entry.label.trim())
    .slice(0, 100)
    .map((entry) => Object.freeze({ key: entry.key.trim(), label: entry.label.trim() }));
}

function option(documentObject, value, label) {
  const node = documentObject.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
}

function hydrateSectorOptions(root, sector) {
  if (!sector) return false;
  const current = typeof sector.value === "string" ? sector.value : "";
  const documentObject = root.document;
  const sectors = enabledSectors(root);
  sector.replaceChildren(option(documentObject, "", "اختر القطاع"));
  for (const entry of sectors) sector.append(option(documentObject, entry.key, entry.label));
  if (current && sectors.some((entry) => entry.key === current)) sector.value = current;
  return sectors.length > 0;
}

function ensureComposerFields(root) {
  const documentObject = root.document;
  const trigger = documentObject.querySelector("[data-social-post-trigger]");
  if (trigger) trigger.textContent = "ماذا تعرض أو تحتاج؟";

  const sheet = documentObject.querySelector("[data-social-post-sheet]");
  if (!sheet) return false;

  const title = sheet.querySelector("#social-post-title");
  if (title) title.textContent = "عرض أو طلب قطاعي";

  const draft = sheet.querySelector("[data-social-post-draft]");
  if (draft) {
    draft.placeholder = "صف ما تعرضه أو تحتاجه باختصار…";
    const label = sheet.querySelector('label[for="social-post-draft"]');
    if (label) label.textContent = "التفاصيل";
  }

  let sector = sheet.querySelector("[data-nexus-sector]");
  let intent = sheet.querySelector("[data-nexus-intent]");

  if (!sector || !intent) {
    const audienceLabel = sheet.querySelector('label[for="social-post-audience"]');
    const anchor = audienceLabel || draft;
    if (!anchor || !anchor.parentNode) return false;

    const group = documentObject.createElement("div");
    group.className = "nexus-composer-classification";
    group.setAttribute("data-nexus-classification", "");

    if (!sector) {
      const sectorLabel = documentObject.createElement("label");
      sectorLabel.setAttribute("for", "nexus-sector");
      sectorLabel.textContent = "القطاع";
      sector = documentObject.createElement("select");
      sector.id = "nexus-sector";
      sector.setAttribute("data-nexus-sector", "");
      sector.required = true;
      sectorLabel.append(sector);
      group.append(sectorLabel);
    }

    if (!intent) {
      const intentLabel = documentObject.createElement("label");
      intentLabel.setAttribute("for", "nexus-intent");
      intentLabel.textContent = "ماذا تريد؟";
      intent = documentObject.createElement("select");
      intent.id = "nexus-intent";
      intent.setAttribute("data-nexus-intent", "");
      intent.required = true;
      intent.append(option(documentObject, "", "اختر الغرض"));
      for (const entry of INTENTS) intent.append(option(documentObject, entry.value, entry.label));
      intentLabel.append(intent);
      group.append(intentLabel);
    }

    anchor.parentNode.insertBefore(group, anchor);
  }

  hydrateSectorOptions(root, sector);
  return true;
}

function normalizeCommand(root) {
  const trigger = root.document.querySelector("[data-fusion-capability-menu]");
  if (trigger) trigger.setAttribute("aria-label", "TIGER Command");

  for (const dead of root.document.querySelectorAll(".social-nav-item--inactive")) dead.remove();
}

function candidateVaultSnapshot(root) {
  const candidates = [
    root.TIGERPulseVaultCurrent,
    root.VVIPPulseVaultCurrent,
    root.TIGERNexusPulseVault
  ];
  for (const candidate of candidates) {
    const derived = derivePulseVault(candidate);
    if (derived.ok) return candidate;
  }
  return null;
}

function vaultText(documentObject, className, text) {
  const node = documentObject.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

function renderVault(root) {
  if (!vaultLayer) return;
  const host = vaultLayer.querySelector("[data-nexus-pulse-vault-content]");
  if (!host) return;
  host.replaceChildren();

  const derived = derivePulseVault(vaultSnapshot);
  if (!derived.ok) {
    const state = root.document.createElement("p");
    state.className = "nexus-vault-empty";
    state.textContent = "لا يوجد رصيد ظهور مؤكد من الخادم لهذه الجلسة.";
    host.append(state);
    return;
  }

  const balance = root.document.createElement("div");
  balance.className = "nexus-vault-balance";
  balance.append(
    vaultText(root.document, "nexus-vault-balance__number", derived.remaining.toLocaleString("ar")),
    vaultText(root.document, "nexus-vault-balance__label", " ظهور موثق متبقٍ"),
    vaultText(root.document, "nexus-vault-balance__expiry", "لا تنتهي")
  );

  const metrics = root.document.createElement("div");
  metrics.className = "nexus-vault-metrics";
  const delivered = root.document.createElement("p");
  delivered.textContent = `تم تسليمه: ${derived.consumed.toLocaleString("ar")}`;
  const available = root.document.createElement("p");
  available.textContent = `متاح للتخصيص: ${derived.available.toLocaleString("ar")}`;
  metrics.append(delivered, available);

  const modes = root.document.createElement("div");
  modes.className = "nexus-vault-modes";
  modes.setAttribute("aria-label", "إيقاع توزيع الظهور");
  const commander = root.TIGERNexusPulseCommands;
  for (const mode of PULSE_VAULT_MODES) {
    const button = root.document.createElement("button");
    button.type = "button";
    button.setAttribute("data-nexus-pulse-mode", mode);
    button.textContent = mode === "NOW" ? "⚡ الآن" : mode === "SMART" ? "🧠 ذكي" : "🎯 دقيق";
    button.setAttribute("aria-pressed", String(derived.mode === mode));
    const executable = commander && typeof commander.setMode === "function";
    button.disabled = !executable;
    if (executable) {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const next = await commander.setMode(mode);
          const normalized = derivePulseVault(next);
          if (normalized.ok) {
            vaultSnapshot = next;
            renderVault(root);
          }
        } finally {
          if (button.isConnected) button.disabled = false;
        }
      });
    }
    modes.append(button);
  }

  host.append(balance, metrics, modes);
}

function bindVaultCloseControls(layer) {
  if (!layer || layer.getAttribute("data-nexus-vault-bound") === "true") return;
  const closeLayer = () => {
    layer.hidden = true;
    layer.setAttribute("aria-hidden", "true");
  };
  for (const control of layer.querySelectorAll("[data-nexus-vault-close]")) {
    control.addEventListener("click", closeLayer);
  }
  layer.setAttribute("data-nexus-vault-bound", "true");
}

function ensureVaultLayer(root) {
  if (vaultLayer && vaultLayer.isConnected) return vaultLayer;
  const documentObject = root.document;
  const existing = documentObject.querySelector("[data-nexus-pulse-vault]");
  if (existing) {
    vaultLayer = existing;
    bindVaultCloseControls(existing);
    return existing;
  }

  const layer = documentObject.createElement("div");
  layer.className = "fusion-capability-layer nexus-vault-layer";
  layer.setAttribute("data-nexus-pulse-vault", "");
  layer.setAttribute("aria-hidden", "true");
  layer.hidden = true;

  const backdrop = documentObject.createElement("button");
  backdrop.type = "button";
  backdrop.className = "fusion-capability-backdrop";
  backdrop.setAttribute("data-nexus-vault-close", "");
  backdrop.setAttribute("aria-label", "إغلاق خزنة الظهور");

  const panel = documentObject.createElement("section");
  panel.className = "fusion-capability-panel nexus-vault-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "nexus-vault-title");

  const heading = documentObject.createElement("header");
  heading.className = "fusion-account-heading";
  const copy = documentObject.createElement("div");
  const eyebrow = documentObject.createElement("span");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "TIGER PULSE VAULT";
  const title = documentObject.createElement("h2");
  title.id = "nexus-vault-title";
  title.textContent = "خزنة الظهور";
  const promise = documentObject.createElement("p");
  promise.textContent = "ظهورك يبقى لك حتى يُستهلك.";
  copy.append(eyebrow, title, promise);
  const close = documentObject.createElement("button");
  close.type = "button";
  close.className = "fusion-icon-button";
  close.setAttribute("data-nexus-vault-close", "");
  close.setAttribute("aria-label", "إغلاق");
  close.textContent = "×";
  heading.append(copy, close);

  const content = documentObject.createElement("div");
  content.setAttribute("data-nexus-pulse-vault-content", "");
  panel.append(heading, content);
  layer.append(backdrop, panel);
  documentObject.body.append(layer);

  vaultLayer = layer;
  bindVaultCloseControls(layer);
  return layer;
}

function openVault(root) {
  const layer = ensureVaultLayer(root);
  vaultSnapshot = candidateVaultSnapshot(root) || vaultSnapshot;
  renderVault(root);
  layer.hidden = false;
  layer.setAttribute("aria-hidden", "false");
}

function bindVault(root) {
  root.document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-nexus-vault-trigger]")) return;
    event.preventDefault();
    openVault(root);
  });

  root.addEventListener("tiger:pulse-vault-ready", (event) => {
    const candidate = event && event.detail && event.detail.snapshot;
    if (derivePulseVault(candidate).ok) {
      vaultSnapshot = candidate;
      if (vaultLayer && !vaultLayer.hidden) renderVault(root);
    }
  });
}

export function installNexus(root = window) {
  if (installed || !root || !root.document) return Object.freeze({ installed });
  installed = true;
  normalizeCommand(root);
  ensureComposerFields(root);
  ensureVaultLayer(root);
  bindVault(root);
  return Object.freeze({ installed: true });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => installNexus(window), { once: true });
  else installNexus(window);
}
