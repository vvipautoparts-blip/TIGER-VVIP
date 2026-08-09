"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const modulePaths = Object.freeze({
  catalog: "scripts/context/v13-country-catalog.js",
  context: "scripts/context/v13-global-account-context.js",
  repository: "scripts/context/v13-country-context-repository.js",
  controller: "scripts/context/v13-country-context-controller.js"
});

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function loadModules() {
  for (const relativePath of Object.values(modulePaths)) {
    assert.ok(
      fs.existsSync(absolute(relativePath)),
      `required V13.1 country-context module is missing: ${relativePath}`
    );
  }

  for (const relativePath of Object.values(modulePaths)) {
    delete require.cache[require.resolve(absolute(relativePath))];
  }

  return {
    catalogApi: require(absolute(modulePaths.catalog)),
    contextApi: require(absolute(modulePaths.context)),
    repositoryApi: require(absolute(modulePaths.repository)),
    controllerApi: require(absolute(modulePaths.controller))
  };
}

function createFixtureCatalog(catalogApi) {
  return catalogApi.createCountryCatalog([
    {
      code: "JO",
      nameAr: "الأردن",
      nameEn: "Jordan",
      activationState: "ACTIVE",
      currency: "JOD",
      countrySealVersion: "JO-TEST-SEAL-1"
    },
    {
      code: "AE",
      nameAr: "الإمارات",
      nameEn: "United Arab Emirates",
      activationState: "ACTIVE",
      currency: "AED",
      countrySealVersion: "AE-TEST-SEAL-1"
    },
    {
      code: "SA",
      nameAr: "السعودية",
      nameEn: "Saudi Arabia",
      activationState: "DRAFT",
      currency: "SAR",
      countrySealVersion: null
    }
  ]);
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    }
  };
}

function createBaseContext(contextApi, catalog, overrides) {
  const result = contextApi.createGlobalAccountContext(
    Object.assign(
      {
        accountId: "acct_global_001",
        identityCountry: "JO"
      },
      overrides || {}
    ),
    {
      catalog,
      now: "2026-08-05T14:00:00.000Z",
      serverResolvedContext: {
        legalEntityCountry: "JO",
        dataResidencyRegion: "eu-central-1"
      }
    }
  );

  assert.equal(result.ok, true, result.error || "base context must be created");
  return result.value;
}

test("V13.1 country-context runtime modules exist", () => {
  loadModules();
});

test("a global account never receives JO or any active market implicitly", () => {
  const { catalogApi, contextApi } = loadModules();
  const catalog = createFixtureCatalog(catalogApi);
  const context = createBaseContext(contextApi, catalog);

  assert.equal(context.identityCountry, "JO");
  assert.equal(context.activeMarketCountry, null);
  assert.equal(context.transactionContext, null);
});

test("identity country and active market country remain independent", () => {
  const { catalogApi, contextApi } = loadModules();
  const catalog = createFixtureCatalog(catalogApi);
  const created = contextApi.createGlobalAccountContext(
    {
      accountId: "acct_global_002",
      identityCountry: "JO",
      activeMarketCountry: "AE"
    },
    {
      catalog,
      now: "2026-08-05T14:01:00.000Z",
      serverResolvedContext: {
        legalEntityCountry: "JO",
        dataResidencyRegion: "eu-central-1"
      }
    }
  );

  assert.equal(created.ok, true, created.error);
  assert.equal(created.value.identityCountry, "JO");
  assert.equal(created.value.activeMarketCountry, "AE");
  assert.equal(created.value.transactionContext.marketCountry, "AE");
  assert.equal(created.value.transactionContext.currency, "AED");
  assert.equal(created.value.transactionContext.countrySealVersion, "AE-TEST-SEAL-1");
});

test("changing the active market preserves the global account and identity country", () => {
  const { catalogApi, contextApi } = loadModules();
  const catalog = createFixtureCatalog(catalogApi);
  const original = createBaseContext(contextApi, catalog, { activeMarketCountry: "JO" });

  const changed = contextApi.changeActiveMarket(original, "AE", {
    catalog,
    now: "2026-08-05T14:02:00.000Z"
  });

  assert.equal(changed.ok, true, changed.error);
  assert.notStrictEqual(changed.value, original);
  assert.equal(changed.value.accountId, original.accountId);
  assert.equal(changed.value.identityCountry, original.identityCountry);
  assert.equal(changed.value.activeMarketCountry, "AE");
  assert.equal(changed.value.revision, original.revision + 1);
  assert.equal(original.activeMarketCountry, "JO");
});

test("inactive or unsealed countries cannot become active markets", () => {
  const { catalogApi, contextApi } = loadModules();
  const catalog = createFixtureCatalog(catalogApi);
  const original = createBaseContext(contextApi, catalog, { activeMarketCountry: "JO" });

  const changed = contextApi.changeActiveMarket(original, "SA", {
    catalog,
    now: "2026-08-05T14:03:00.000Z"
  });

  assert.equal(changed.ok, false);
  assert.equal(changed.error, "COUNTRY_MARKET_NOT_ACTIVE");
  assert.equal(original.activeMarketCountry, "JO");
});

test("client input cannot assign legal entity or data residency authority fields", () => {
  const { catalogApi, contextApi } = loadModules();
  const catalog = createFixtureCatalog(catalogApi);

  const legalEntityAttempt = contextApi.createGlobalAccountContext(
    {
      accountId: "acct_global_003",
      identityCountry: "JO",
      legalEntityCountry: "AE"
    },
    { catalog, now: "2026-08-05T14:04:00.000Z" }
  );
  assert.equal(legalEntityAttempt.ok, false);
  assert.equal(legalEntityAttempt.error, "UNTRUSTED_SERVER_CONTROLLED_FIELD");

  const residencyAttempt = contextApi.createGlobalAccountContext(
    {
      accountId: "acct_global_003",
      identityCountry: "JO",
      dataResidencyRegion: "user-selected-region"
    },
    { catalog, now: "2026-08-05T14:04:00.000Z" }
  );
  assert.equal(residencyAttempt.ok, false);
  assert.equal(residencyAttempt.error, "UNTRUSTED_SERVER_CONTROLLED_FIELD");
});

test("a listing keeps an immutable market snapshot after the user changes markets", () => {
  const { catalogApi, contextApi } = loadModules();
  const catalog = createFixtureCatalog(catalogApi);
  const jordanContext = createBaseContext(contextApi, catalog, { activeMarketCountry: "JO" });

  const snapshot = contextApi.createListingMarketSnapshot(
    jordanContext,
    { listingId: "listing_001" },
    { now: "2026-08-05T14:05:00.000Z" }
  );
  assert.equal(snapshot.ok, true, snapshot.error);
  assert.equal(snapshot.value.marketCountry, "JO");
  assert.equal(snapshot.value.currency, "JOD");
  assert.equal(snapshot.value.countrySealVersion, "JO-TEST-SEAL-1");
  assert.equal(Object.isFrozen(snapshot.value), true);

  const changed = contextApi.changeActiveMarket(jordanContext, "AE", {
    catalog,
    now: "2026-08-05T14:06:00.000Z"
  });
  assert.equal(changed.ok, true, changed.error);
  assert.equal(changed.value.activeMarketCountry, "AE");
  assert.equal(snapshot.value.marketCountry, "JO");
  assert.equal(snapshot.value.currency, "JOD");
});

test("local preview persistence stores only an allowlisted non-sensitive selection draft", () => {
  const { catalogApi, contextApi, repositoryApi } = loadModules();
  const catalog = createFixtureCatalog(catalogApi);
  const storage = createMemoryStorage();
  const repository = repositoryApi.createLocalPreviewRepository(storage);
  const context = createBaseContext(contextApi, catalog, { activeMarketCountry: "AE" });

  const result = repository.saveSelection(
    Object.assign({}, context, {
      email: "secret@example.com",
      sessionToken: "secret-token",
      taxCountry: "AE",
      billingCountry: "AE"
    })
  );

  assert.equal(result.ok, true, result.error);
  const raw = storage.getItem(repository.storageKey);
  assert.ok(raw, "safe preview selection must be stored");
  const parsed = JSON.parse(raw);
  assert.deepEqual(
    Object.keys(parsed).sort(),
    [
      "activeMarketCountry",
      "identityCountry",
      "revision",
      "schemaVersion",
      "updatedAt"
    ]
  );
  assert.equal(raw.includes("acct_global_001"), false);
  assert.equal(raw.includes("secret@example.com"), false);
  assert.equal(raw.includes("secret-token"), false);
  assert.equal(raw.includes("legalEntityCountry"), false);
  assert.equal(raw.includes("dataResidencyRegion"), false);
  assert.equal(raw.includes("taxCountry"), false);
  assert.equal(raw.includes("billingCountry"), false);
});

test("production repository fails closed when its backend adapter is unavailable", () => {
  const { repositoryApi } = loadModules();
  const repository = repositoryApi.createProductionRepository(null);

  const loaded = repository.loadContext("acct_global_001");
  assert.equal(loaded.ok, false);
  assert.equal(loaded.error, "BACKEND_UNAVAILABLE");

  const saved = repository.saveActiveMarket({
    accountId: "acct_global_001",
    requestedActiveMarketCountry: "AE",
    expectedRevision: 1
  });
  assert.equal(saved.ok, false);
  assert.equal(saved.error, "BACKEND_UNAVAILABLE");
});

test("controller does not expose an unpersisted market change", () => {
  const { catalogApi, contextApi, controllerApi } = loadModules();
  const catalog = createFixtureCatalog(catalogApi);
  const original = createBaseContext(contextApi, catalog, { activeMarketCountry: "JO" });
  const controller = controllerApi.createCountryContextController({
    catalog,
    contextApi,
    repository: {
      saveSelection() {
        return { ok: false, error: "PERSISTENCE_FAILED" };
      }
    }
  });

  const changed = controller.changeActiveMarket(original, "AE", {
    now: "2026-08-05T14:07:00.000Z"
  });

  assert.equal(changed.ok, false);
  assert.equal(changed.error, "PERSISTENCE_FAILED");
  assert.strictEqual(changed.context, original);
  assert.equal(original.activeMarketCountry, "JO");
});
