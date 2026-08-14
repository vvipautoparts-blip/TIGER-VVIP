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

export { deepFreeze };
