(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.VVIP_V13_COUNTRY_CONTEXT_REPOSITORY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const LOCAL_STORAGE_KEY = "vvip:v13:country-context-selection:v1";
  const LOCAL_FIELDS = Object.freeze([
    "schemaVersion",
    "identityCountry",
    "activeMarketCountry",
    "revision",
    "updatedAt"
  ]);

  function ok(value) {
    return Object.freeze({ ok: true, value });
  }

  function fail(error) {
    return Object.freeze({ ok: false, error });
  }

  function normalizeCountryCode(value, nullable) {
    if (nullable && (value == null || String(value).trim() === "")) return null;
    const code = String(value == null ? "" : value).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : "";
  }

  function validTimestamp(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
  }

  function hasStorageInterface(storage) {
    return !!(
      storage &&
      typeof storage.getItem === "function" &&
      typeof storage.setItem === "function" &&
      typeof storage.removeItem === "function"
    );
  }

  function projectSelection(context) {
    const identityCountry = normalizeCountryCode(context && context.identityCountry, false);
    const activeMarketCountry = normalizeCountryCode(
      context && context.activeMarketCountry,
      true
    );
    const revision = context && context.revision;
    const updatedAt = context && context.updatedAt;

    if (!identityCountry) return fail("INVALID_IDENTITY_COUNTRY");
    if (activeMarketCountry === "") return fail("INVALID_ACTIVE_MARKET_COUNTRY");
    if (!Number.isInteger(revision) || revision < 1) return fail("INVALID_REVISION");
    if (!validTimestamp(updatedAt)) return fail("INVALID_TIMESTAMP");

    return ok(Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      identityCountry,
      activeMarketCountry,
      revision,
      updatedAt: new Date(updatedAt).toISOString()
    }));
  }

  function sanitizeStoredSelection(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const keys = Object.keys(value).sort();
    const expected = Array.from(LOCAL_FIELDS).sort();
    if (keys.length !== expected.length) return null;
    for (let index = 0; index < keys.length; index += 1) {
      if (keys[index] !== expected[index]) return null;
    }
    if (value.schemaVersion !== SCHEMA_VERSION) return null;

    const projected = projectSelection(value);
    return projected.ok ? projected.value : null;
  }

  function createLocalPreviewRepository(storage) {
    const storageAvailable = hasStorageInterface(storage);

    function saveSelection(context) {
      if (!storageAvailable) return fail("LOCAL_STORAGE_UNAVAILABLE");
      const projected = projectSelection(context);
      if (!projected.ok) return projected;
      try {
        storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projected.value));
        return projected;
      } catch (error) {
        return fail("LOCAL_STORAGE_WRITE_FAILED");
      }
    }

    function loadSelection() {
      if (!storageAvailable) return fail("LOCAL_STORAGE_UNAVAILABLE");
      try {
        const raw = storage.getItem(LOCAL_STORAGE_KEY);
        if (raw == null) return ok(null);
        const parsed = sanitizeStoredSelection(JSON.parse(raw));
        if (!parsed) {
          try {
            storage.removeItem(LOCAL_STORAGE_KEY);
          } catch (removeError) {
            return fail("LOCAL_STORAGE_INVALID_DRAFT_REMOVE_FAILED");
          }
          return fail("LOCAL_STORAGE_INVALID_DRAFT");
        }
        return ok(parsed);
      } catch (error) {
        return fail("LOCAL_STORAGE_READ_FAILED");
      }
    }

    function clearSelection() {
      if (!storageAvailable) return fail("LOCAL_STORAGE_UNAVAILABLE");
      try {
        storage.removeItem(LOCAL_STORAGE_KEY);
        return ok(null);
      } catch (error) {
        return fail("LOCAL_STORAGE_REMOVE_FAILED");
      }
    }

    return Object.freeze({
      storageKey: LOCAL_STORAGE_KEY,
      saveSelection,
      loadSelection,
      clearSelection
    });
  }

  function validAccountId(value) {
    return typeof value === "string" &&
      value.length >= 3 &&
      value.length <= 200 &&
      /^[A-Za-z0-9_-]+$/.test(value);
  }

  function confirmedAdapterResult(result) {
    if (!result || typeof result !== "object" || typeof result.ok !== "boolean") {
      return fail("BACKEND_UNCONFIRMED");
    }
    if (result.ok !== true) {
      return fail(typeof result.error === "string" && result.error
        ? result.error
        : "BACKEND_REJECTED");
    }
    return ok(Object.prototype.hasOwnProperty.call(result, "value") ? result.value : null);
  }

  function createProductionRepository(adapter) {
    const available = !!(
      adapter &&
      typeof adapter.loadContext === "function" &&
      typeof adapter.saveActiveMarket === "function"
    );

    function loadContext(accountId) {
      if (!available) return fail("BACKEND_UNAVAILABLE");
      if (!validAccountId(accountId)) return fail("INVALID_ACCOUNT_ID");
      try {
        const result = adapter.loadContext(accountId);
        if (result && typeof result.then === "function") {
          return fail("BACKEND_ASYNC_BOUNDARY_REQUIRED");
        }
        return confirmedAdapterResult(result);
      } catch (error) {
        return fail("BACKEND_FAILURE");
      }
    }

    function saveActiveMarket(command) {
      if (!available) return fail("BACKEND_UNAVAILABLE");
      const source = command && typeof command === "object" ? command : {};
      const accountId = String(source.accountId || "");
      const requestedActiveMarketCountry = normalizeCountryCode(
        source.requestedActiveMarketCountry,
        false
      );
      const expectedRevision = source.expectedRevision;

      if (!validAccountId(accountId)) return fail("INVALID_ACCOUNT_ID");
      if (!requestedActiveMarketCountry) return fail("INVALID_ACTIVE_MARKET_COUNTRY");
      if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
        return fail("INVALID_EXPECTED_REVISION");
      }

      const safeCommand = Object.freeze({
        accountId,
        requestedActiveMarketCountry,
        expectedRevision
      });

      try {
        const result = adapter.saveActiveMarket(safeCommand);
        if (result && typeof result.then === "function") {
          return fail("BACKEND_ASYNC_BOUNDARY_REQUIRED");
        }
        return confirmedAdapterResult(result);
      } catch (error) {
        return fail("BACKEND_FAILURE");
      }
    }

    return Object.freeze({ loadContext, saveActiveMarket });
  }

  return Object.freeze({
    SCHEMA_VERSION,
    LOCAL_STORAGE_KEY,
    LOCAL_FIELDS,
    createLocalPreviewRepository,
    createProductionRepository
  });
});
