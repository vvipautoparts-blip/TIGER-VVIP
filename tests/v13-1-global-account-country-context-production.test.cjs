"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const catalogApi = require(path.join(root, "scripts/context/v13-country-catalog.js"));
const contextApi = require(path.join(root, "scripts/context/v13-global-account-context.js"));
const repositoryApi = require(path.join(root, "scripts/context/v13-country-context-repository.js"));
const controllerApi = require(path.join(root, "scripts/context/v13-country-context-controller.js"));

function createCatalog() {
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
    }
  ]);
}

function createContext(catalog) {
  const result = contextApi.createGlobalAccountContext(
    {
      accountId: "acct_global_001",
      identityCountry: "JO",
      activeMarketCountry: "JO"
    },
    {
      catalog,
      now: "2026-08-05T14:40:00.000Z",
      serverResolvedContext: {
        legalEntityCountry: "JO",
        dataResidencyRegion: "eu-central-1"
      }
    }
  );
  assert.equal(result.ok, true, result.error);
  return result.value;
}

test("controller persists a production market change with optimistic revision", () => {
  const catalog = createCatalog();
  const original = createContext(catalog);
  let capturedCommand = null;

  const repository = repositoryApi.createProductionRepository({
    loadContext() {
      return { ok: true, value: original };
    },
    saveActiveMarket(command) {
      capturedCommand = command;
      return {
        ok: true,
        value: { confirmationId: "market-change-001" }
      };
    }
  });
  const controller = controllerApi.createCountryContextController({
    catalog,
    contextApi,
    repository
  });

  const changed = controller.changeActiveMarket(original, "AE", {
    now: "2026-08-05T14:41:00.000Z"
  });

  assert.equal(changed.ok, true, changed.error);
  assert.deepEqual(capturedCommand, {
    accountId: "acct_global_001",
    requestedActiveMarketCountry: "AE",
    expectedRevision: original.revision
  });
  assert.equal(changed.context.activeMarketCountry, "AE");
  assert.equal(changed.context.revision, original.revision + 1);
  assert.deepEqual(changed.persistence, { confirmationId: "market-change-001" });
  assert.equal(original.activeMarketCountry, "JO");
});

test("controller keeps the original context when production rejects the change", () => {
  const catalog = createCatalog();
  const original = createContext(catalog);
  const repository = repositoryApi.createProductionRepository({
    loadContext() {
      return { ok: true, value: original };
    },
    saveActiveMarket() {
      return { ok: false, error: "REVISION_CONFLICT" };
    }
  });
  const controller = controllerApi.createCountryContextController({
    catalog,
    contextApi,
    repository
  });

  const changed = controller.changeActiveMarket(original, "AE", {
    now: "2026-08-05T14:42:00.000Z"
  });

  assert.equal(changed.ok, false);
  assert.equal(changed.error, "REVISION_CONFLICT");
  assert.strictEqual(changed.context, original);
  assert.equal(original.activeMarketCountry, "JO");
});
