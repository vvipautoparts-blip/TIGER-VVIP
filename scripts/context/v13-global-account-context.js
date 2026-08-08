(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.VVIP_V13_GLOBAL_ACCOUNT_CONTEXT = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const CONSTITUTION_ID = "V13.1";
  const SERVER_CONTROLLED_FIELDS = Object.freeze([
    "legalEntityCountry",
    "dataResidencyRegion",
    "billingCountry",
    "taxCountry"
  ]);

  function ok(value) {
    return Object.freeze({ ok: true, value });
  }

  function fail(error) {
    return Object.freeze({ ok: false, error });
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function normalizeCountryCode(value) {
    const code = String(value == null ? "" : value).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : "";
  }

  function safeText(value, maxLength) {
    return String(value == null ? "" : value)
      .normalize("NFKC")
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function validIdentifier(value, maxLength) {
    return typeof value === "string" &&
      value.length >= 3 &&
      value.length <= maxLength &&
      /^[A-Za-z0-9_-]+$/.test(value);
  }

  function resolveNow(value) {
    const candidate = value == null ? new Date().toISOString() : String(value);
    if (Number.isNaN(Date.parse(candidate))) return null;
    return new Date(candidate).toISOString();
  }

  function validateCatalog(catalog) {
    return !!(catalog && typeof catalog.requireActive === "function");
  }

  function transactionContextFrom(entry) {
    return Object.freeze({
      marketCountry: entry.code,
      currency: entry.currency,
      countrySealVersion: entry.countrySealVersion
    });
  }

  function serverContextFrom(options) {
    const source = options && options.serverResolvedContext;
    if (source == null) {
      return ok(Object.freeze({
        legalEntityCountry: null,
        dataResidencyRegion: null
      }));
    }
    if (typeof source !== "object" || Array.isArray(source)) {
      return fail("INVALID_SERVER_CONTEXT");
    }

    const legalEntityCountry = source.legalEntityCountry == null
      ? null
      : normalizeCountryCode(source.legalEntityCountry);
    if (source.legalEntityCountry != null && !legalEntityCountry) {
      return fail("INVALID_SERVER_CONTEXT");
    }

    const dataResidencyRegion = source.dataResidencyRegion == null
      ? null
      : safeText(source.dataResidencyRegion, 120);
    if (source.dataResidencyRegion != null && !dataResidencyRegion) {
      return fail("INVALID_SERVER_CONTEXT");
    }

    return ok(Object.freeze({ legalEntityCountry, dataResidencyRegion }));
  }

  function createGlobalAccountContext(input, options) {
    const source = input && typeof input === "object" && !Array.isArray(input)
      ? input
      : {};

    for (const field of SERVER_CONTROLLED_FIELDS) {
      if (hasOwn(source, field)) return fail("UNTRUSTED_SERVER_CONTROLLED_FIELD");
    }

    const catalog = options && options.catalog;
    if (!validateCatalog(catalog)) return fail("COUNTRY_CATALOG_REQUIRED");

    const accountId = String(source.accountId || "");
    if (!validIdentifier(accountId, 200)) return fail("INVALID_ACCOUNT_ID");

    const identityCountry = normalizeCountryCode(source.identityCountry);
    if (!identityCountry) return fail("INVALID_IDENTITY_COUNTRY");

    const now = resolveNow(options && options.now);
    if (!now) return fail("INVALID_TIMESTAMP");

    const resolvedServer = serverContextFrom(options);
    if (!resolvedServer.ok) return resolvedServer;

    let activeMarketCountry = null;
    let transactionContext = null;
    if (source.activeMarketCountry != null && String(source.activeMarketCountry).trim() !== "") {
      const active = catalog.requireActive(source.activeMarketCountry);
      if (!active.ok) return fail(active.error);
      activeMarketCountry = active.value.code;
      transactionContext = transactionContextFrom(active.value);
    }

    const revision = Number.isInteger(source.revision) && source.revision >= 1
      ? source.revision
      : 1;

    return ok(Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      constitutionId: CONSTITUTION_ID,
      accountId,
      identityCountry,
      activeMarketCountry,
      legalEntityCountry: resolvedServer.value.legalEntityCountry,
      dataResidencyRegion: resolvedServer.value.dataResidencyRegion,
      transactionContext,
      revision,
      createdAt: now,
      updatedAt: now
    }));
  }

  function changeActiveMarket(context, requestedCountry, options) {
    if (!context || typeof context !== "object") return fail("INVALID_ACCOUNT_CONTEXT");
    const catalog = options && options.catalog;
    if (!validateCatalog(catalog)) return fail("COUNTRY_CATALOG_REQUIRED");

    const active = catalog.requireActive(requestedCountry);
    if (!active.ok) return fail(active.error);

    if (context.activeMarketCountry === active.value.code) return ok(context);

    const now = resolveNow(options && options.now);
    if (!now) return fail("INVALID_TIMESTAMP");

    const revision = Number.isInteger(context.revision) && context.revision >= 1
      ? context.revision + 1
      : 1;

    return ok(Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      constitutionId: CONSTITUTION_ID,
      accountId: context.accountId,
      identityCountry: context.identityCountry,
      activeMarketCountry: active.value.code,
      legalEntityCountry: context.legalEntityCountry == null ? null : context.legalEntityCountry,
      dataResidencyRegion: context.dataResidencyRegion == null ? null : context.dataResidencyRegion,
      transactionContext: transactionContextFrom(active.value),
      revision,
      createdAt: context.createdAt,
      updatedAt: now
    }));
  }

  function createListingMarketSnapshot(context, input, options) {
    if (!context || typeof context !== "object") return fail("INVALID_ACCOUNT_CONTEXT");
    if (!context.activeMarketCountry || !context.transactionContext) {
      return fail("ACTIVE_MARKET_REQUIRED");
    }

    const listingId = String(input && input.listingId || "");
    if (!validIdentifier(listingId, 200)) return fail("INVALID_LISTING_ID");

    const capturedAt = resolveNow(options && options.now);
    if (!capturedAt) return fail("INVALID_TIMESTAMP");

    const transaction = context.transactionContext;
    if (
      transaction.marketCountry !== context.activeMarketCountry ||
      !/^[A-Z]{3}$/.test(String(transaction.currency || "")) ||
      !safeText(transaction.countrySealVersion, 120)
    ) {
      return fail("INVALID_TRANSACTION_CONTEXT");
    }

    return ok(Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      constitutionId: CONSTITUTION_ID,
      listingId,
      marketCountry: transaction.marketCountry,
      currency: transaction.currency,
      countrySealVersion: transaction.countrySealVersion,
      accountContextRevision: context.revision,
      capturedAt
    }));
  }

  return Object.freeze({
    SCHEMA_VERSION,
    CONSTITUTION_ID,
    SERVER_CONTROLLED_FIELDS,
    createGlobalAccountContext,
    changeActiveMarket,
    createListingMarketSnapshot
  });
});
