"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, "../scripts/authorization/v13-country-scope.js")
).href;

async function loadScope() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

test("platform contains every valid lower scope", async () => {
  const { countryScopeContains } = await loadScope();
  assert.equal(countryScopeContains(
    { level: "platform" },
    { level: "team", countryCode: "JO", sectorId: "vehicles", regionId: "central", areaId: "amman", teamId: "team-1" }
  ), true);
});

test("country scope contains only descendants in the same country", async () => {
  const { normalizeCountryScope, countryScopeContains } = await loadScope();
  const jordan = normalizeCountryScope({ level: "country", countryCode: "JO" });
  assert.equal(countryScopeContains(jordan, {
    level: "sector", countryCode: "JO", sectorId: "vehicles"
  }), true);
  assert.equal(countryScopeContains(jordan, {
    level: "sector", countryCode: "AE", sectorId: "vehicles"
  }), false);
});

test("sibling sectors regions areas and teams are isolated", async () => {
  const { countryScopeContains } = await loadScope();
  const region = { level: "region", countryCode: "JO", sectorId: "vehicles", regionId: "central" };
  assert.equal(countryScopeContains(region, {
    level: "area", countryCode: "JO", sectorId: "vehicles", regionId: "central", areaId: "amman"
  }), true);
  assert.equal(countryScopeContains(region, {
    level: "area", countryCode: "JO", sectorId: "vehicles", regionId: "north", areaId: "irbid"
  }), false);
});

test("missing and extra ancestry fields are invalid rather than wildcards", async () => {
  const { normalizeCountryScope } = await loadScope();
  assert.throws(
    () => normalizeCountryScope({ level: "sector", sectorId: "vehicles" }),
    (error) => error?.code === "INVALID_SCOPE"
  );
  assert.throws(
    () => normalizeCountryScope({ level: "country", countryCode: "JO", sectorId: "vehicles" }),
    (error) => error?.code === "INVALID_SCOPE"
  );
});

test("active market is not an authorization scope field", async () => {
  const { normalizeCountryScope } = await loadScope();
  assert.throws(
    () => normalizeCountryScope({ level: "country", countryCode: "JO", activeMarketCountry: "JO" }),
    (error) => error?.code === "INVALID_SCOPE"
  );
});

test("resource country must match normalized local scope", async () => {
  const { assertResourceCountry } = await loadScope();
  assert.deepEqual(
    assertResourceCountry({ level: "country", countryCode: "JO" }, "JO"),
    { ok: true, code: "OK" }
  );
  assert.deepEqual(
    assertResourceCountry({ level: "country", countryCode: "JO" }, "AE"),
    { ok: false, code: "COUNTRY_SCOPE_MISMATCH" }
  );
  assert.deepEqual(
    assertResourceCountry({ level: "platform" }, "AE"),
    { ok: true, code: "OK" }
  );
});
