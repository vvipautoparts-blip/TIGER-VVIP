const MAX_QUERY_LENGTH = 512;
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu;
const TATWEEL = /\u0640/gu;
const ARABIC_LETTERS = /[\u0600-\u06FF]/u;
const LATIN_LETTERS = /[A-Za-z]/u;
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizeDigits(value) {
  return value.replace(/[٠-٩۰-۹]/gu, (digit) => {
    const arabicIndex = ARABIC_INDIC.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);
    return String(PERSIAN_DIGITS.indexOf(digit));
  });
}

function normalizeArabicLetters(value) {
  return value
    .replace(/[إأآٱ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ؤ/gu, "و")
    .replace(/ئ/gu, "ي");
}

export function normalizeSearchQuery(input) {
  const raw = typeof input === "string" ? input.slice(0, MAX_QUERY_LENGTH) : "";
  const normalized = normalizeArabicLetters(
    normalizeDigits(raw.normalize("NFKC").replace(TATWEEL, "").replace(ARABIC_DIACRITICS, ""))
  )
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ")
    .slice(0, MAX_QUERY_LENGTH)
    .trim();

  const tokens = normalized ? normalized.split(" ").filter(Boolean) : [];
  const scriptHints = [];
  if (ARABIC_LETTERS.test(normalized)) scriptHints.push("arabic");
  if (LATIN_LETTERS.test(normalized)) scriptHints.push("latin");

  return deepFreeze({ raw, normalized, tokens, scriptHints });
}

const INTENT_FIELDS = Object.freeze([
  Object.freeze({ source: "locations", field: "location" }),
  Object.freeze({ source: "makes", field: "make" }),
  Object.freeze({ source: "categories", field: "category" })
]);
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

function buildIntentAliases(dictionaries) {
  const aliases = [];
  for (const { source, field } of INTENT_FIELDS) {
    const entries = Array.isArray(dictionaries?.[source]) ? dictionaries[source] : [];
    for (const entry of entries) {
      if (!entry || typeof entry.value !== "string" || !Array.isArray(entry.aliases)) continue;
      for (const alias of entry.aliases) {
        const normalized = normalizeSearchQuery(alias).tokens;
        if (!normalized.length || normalized.length > 6) continue;
        aliases.push({ field, value: entry.value, tokens: normalized });
      }
    }
  }
  return aliases.sort((a, b) => b.tokens.length - a.tokens.length || a.field.localeCompare(b.field) || a.value.localeCompare(b.value));
}

export function extractSearchIntent(normalizedQuery, dictionaries = {}) {
  const tokens = Array.isArray(normalizedQuery?.tokens) ? normalizedQuery.tokens.slice(0, 64) : [];
  const aliases = buildIntentAliases(dictionaries);
  const filters = {};
  const textTokens = [];
  const recognized = [];

  for (let index = 0; index < tokens.length;) {
    const token = tokens[index];
    if (/^\d{4}$/u.test(token)) {
      const year = Number(token);
      if (year >= MIN_YEAR && year <= MAX_YEAR && filters.year === undefined) {
        filters.year = year;
        recognized.push("year");
        index += 1;
        continue;
      }
    }

    let match = null;
    for (const candidate of aliases) {
      if (filters[candidate.field] !== undefined) continue;
      if (candidate.tokens.length > tokens.length - index) continue;
      let equal = true;
      for (let offset = 0; offset < candidate.tokens.length; offset += 1) {
        if (tokens[index + offset] !== candidate.tokens[offset]) {
          equal = false;
          break;
        }
      }
      if (equal) {
        match = candidate;
        break;
      }
    }

    if (match) {
      filters[match.field] = match.value;
      recognized.push(match.field);
      index += match.tokens.length;
      continue;
    }

    textTokens.push(token);
    index += 1;
  }

  return deepFreeze({ textTokens, filters, recognized });
}

export { deepFreeze };
