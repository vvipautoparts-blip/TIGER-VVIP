(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.VVIP_V13_COUNTRY_CATALOG = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const COUNTRY_STATES = Object.freeze([
    "DRAFT",
    "LEGAL_APPROVED",
    "TAX_CONFIGURED",
    "ACTIVE",
    "SUSPENDED"
  ]);

  function safeText(value, maxLength) {
    return String(value == null ? "" : value)
      .normalize("NFKC")
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function normalizeCountryCode(value) {
    const code = String(value == null ? "" : value).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : "";
  }

  function normalizeCurrency(value) {
    const currency = String(value == null ? "" : value).trim().toUpperCase();
    return /^[A-Z]{3}$/.test(currency) ? currency : "";
  }

  function normalizeEntry(input) {
    const source = input && typeof input === "object" ? input : {};
    const code = normalizeCountryCode(source.code);
    const activationState = String(source.activationState || "");
    const currency = normalizeCurrency(source.currency);
    const countrySealVersion = source.countrySealVersion == null
      ? null
      : safeText(source.countrySealVersion, 120);

    if (!code) throw new Error("INVALID_COUNTRY_CODE");
    if (!COUNTRY_STATES.includes(activationState)) {
      throw new Error("INVALID_COUNTRY_ACTIVATION_STATE");
    }
    if (!currency) throw new Error("INVALID_COUNTRY_CURRENCY");
    if (activationState === "ACTIVE" && !countrySealVersion) {
      throw new Error("ACTIVE_COUNTRY_REQUIRES_SEAL");
    }

    return Object.freeze({
      code,
      nameAr: safeText(source.nameAr, 120),
      nameEn: safeText(source.nameEn, 120),
      activationState,
      currency,
      countrySealVersion
    });
  }

  function createCountryCatalog(entries) {
    if (!Array.isArray(entries)) throw new Error("COUNTRY_CATALOG_ARRAY_REQUIRED");

    const byCode = new Map();
    for (const rawEntry of entries) {
      const entry = normalizeEntry(rawEntry);
      if (byCode.has(entry.code)) throw new Error("DUPLICATE_COUNTRY_CODE");
      byCode.set(entry.code, entry);
    }

    function get(code) {
      return byCode.get(normalizeCountryCode(code)) || null;
    }

    function list() {
      return Object.freeze(Array.from(byCode.values()));
    }

    function listActive() {
      return Object.freeze(
        Array.from(byCode.values()).filter(function (entry) {
          return entry.activationState === "ACTIVE" && !!entry.countrySealVersion;
        })
      );
    }

    function requireActive(code) {
      const entry = get(code);
      if (!entry || entry.activationState !== "ACTIVE" || !entry.countrySealVersion) {
        return Object.freeze({ ok: false, error: "COUNTRY_MARKET_NOT_ACTIVE" });
      }
      return Object.freeze({ ok: true, value: entry });
    }

    return Object.freeze({
      get,
      list,
      listActive,
      requireActive,
      isActive(code) {
        return requireActive(code).ok;
      }
    });
  }

  return Object.freeze({
    COUNTRY_STATES,
    normalizeCountryCode,
    createCountryCatalog
  });
});
