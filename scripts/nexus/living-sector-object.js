const NEXUS_INTENTS = Object.freeze(new Set([
  "OFFER",
  "NEED",
  "SERVICE",
  "OPPORTUNITY"
]));

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function normalizeNexusIntent(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return NEXUS_INTENTS.has(normalized) ? normalized : null;
}

function normalizeSectorId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return IDENTIFIER.test(normalized) ? normalized : null;
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 5000);
}

export function validateLivingSectorDraft(draft) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    return Object.freeze({ ok: false, code: "NEXUS_DRAFT_INVALID" });
  }

  const sectorId = normalizeSectorId(draft.sectorId);
  if (!sectorId) {
    return Object.freeze({ ok: false, code: "NEXUS_SECTOR_REQUIRED" });
  }

  const intent = normalizeNexusIntent(draft.intent);
  if (!intent) {
    return Object.freeze({ ok: false, code: "NEXUS_INTENT_REQUIRED" });
  }

  const text = normalizeText(draft.text);
  if (!text) {
    return Object.freeze({ ok: false, code: "NEXUS_CONTENT_REQUIRED" });
  }

  return Object.freeze({
    ok: true,
    code: "OK",
    value: Object.freeze({ sectorId, intent, text })
  });
}

export const NEXUS_INTENT_CLASSES = Object.freeze([...NEXUS_INTENTS]);
