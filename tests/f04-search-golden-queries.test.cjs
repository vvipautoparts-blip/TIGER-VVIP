"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/f04-search-golden.json"), "utf8"));
const moduleUrl = pathToFileURL(path.join(root, "scripts/fusion/f04-search-fabric.js")).href;
async function loadSearch() { return import(`${moduleUrl}?golden=${Date.now()}-${Math.random()}`); }

const dictionaries = Object.freeze({
  locations: Object.freeze([
    Object.freeze({ value: "Amman", aliases: Object.freeze(["amman", "عمان"]), available: true, countries: Object.freeze(["JO"]) }),
    Object.freeze({ value: "Irbid", aliases: Object.freeze(["irbid", "اربد", "إربد"]), available: true, countries: Object.freeze(["JO"]) }),
    Object.freeze({ value: "Dubai", aliases: Object.freeze(["dubai", "دبي"]), available: true, countries: Object.freeze(["AE"]) }),
    Object.freeze({ value: "Hidden City", aliases: Object.freeze(["hidden city"]), available: false, countries: Object.freeze(["JO"]) })
  ]),
  makes: Object.freeze([
    Object.freeze({ value: "Mercedes", aliases: Object.freeze(["mercedes", "مرسيدس"]), available: true }),
    Object.freeze({ value: "BMW", aliases: Object.freeze(["bmw", "بي ام دبليو"]), available: true })
  ]),
  categories: Object.freeze([
    Object.freeze({ value: "Cars", aliases: Object.freeze(["cars", "سيارات"]), available: true }),
    Object.freeze({ value: "Parts", aliases: Object.freeze(["parts", "قطع غيار"]), available: true }),
    Object.freeze({ value: "Unavailable", aliases: Object.freeze(["forbidden category"]), available: false })
  ]),
  aliases: Object.freeze([
    Object.freeze({ field: "model", value: "C200", aliases: Object.freeze(["c200", "سي 200"]), available: true }),
    Object.freeze({ field: "model", value: "X5", aliases: Object.freeze(["x5", "اكس 5"]), available: true })
  ])
});

function listing(id, overrides = {}) {
  return Object.freeze({
    id,
    title: "Vehicle",
    summary: "clean listing",
    location: "Amman",
    countryCode: "JO",
    sector: "automotive",
    sectorLabel: "السيارات",
    category: "Cars",
    brand: "Mercedes",
    model: "C200",
    year: 2020,
    specs: Object.freeze([]),
    searchAliases: Object.freeze([]),
    searchEligible: true,
    policyEligible: true,
    ...overrides
  });
}

const listings = Object.freeze([
  listing("m-amman-2020", { title: "Mercedes C200 Panorama", summary: "Premium low mileage", location: "Amman", brand: "Mercedes", model: "C200", year: 2020 }),
  listing("m-irbid-2021", { title: "Mercedes C200 Family", summary: "clean sedan", location: "Irbid", brand: "Mercedes", model: "C200", year: 2021 }),
  listing("bmw-amman-2020", { title: "BMW X5 Premium", summary: "Panorama SUV بريميوم", location: "Amman", brand: "BMW", model: "X5", year: 2020 }),
  listing("parts-amman", { title: "Mercedes brake parts", summary: "OEM components", category: "Parts", brand: "Mercedes", model: "Brake Kit", year: 2024 }),
  listing("m-dubai-2020", { title: "Mercedes C200 Dubai", location: "Dubai", countryCode: "AE", brand: "Mercedes", model: "C200", year: 2020 }),
  listing("policy-secret", { title: "Secret Mercedes", policyEligible: false }),
  listing("search-hidden", { title: "Hidden Mercedes", searchEligible: false }),
  listing("premium-title", { title: "Premium Vehicle", summary: "ordinary", brand: "Toyota", model: "Camry", year: 2022 }),
  listing("premium-summary", { title: "Vehicle Offer", summary: "premium package", brand: "Toyota", model: "Corolla", year: 2023 })
]);

test("F04 golden bilingual corpus contains at least 30 deterministic cases", () => {
  assert.ok(fixtures.length >= 30, `expected >=30 fixtures, got ${fixtures.length}`);
  assert.equal(new Set(fixtures.map((fixture) => fixture.id)).size, fixtures.length, "fixture IDs must be unique");
  assert.ok(fixtures.some((fixture) => fixture.query === "مرسيدس 2020 عمان"), "constitution query must be present");
});

test("F04 executes every golden query through the real search fabric", async (t) => {
  const { searchListings } = await loadSearch();
  for (const fixture of fixtures) {
    await t.test(fixture.id, () => {
      const out = searchListings({
        query: fixture.query,
        listings,
        dictionaries,
        activeMarketCountry: fixture.activeMarketCountry,
        semanticScores: fixture.semanticScores || {}
      });
      assert.deepEqual(out.intent.filters, fixture.expectedIntent, `${fixture.id}: intent filters`);
      if (fixture.expectedTextTokens) assert.deepEqual(out.intent.textTokens, fixture.expectedTextTokens, `${fixture.id}: text tokens`);
      assert.deepEqual(out.results.slice(0, fixture.expectedTopIds.length).map((item) => item.id), fixture.expectedTopIds, `${fixture.id}: top IDs`);
      if (fixture.expectedTopIds.length === 0) assert.equal(out.results.length, 0, `${fixture.id}: expected zero results`);
      if (fixture.expectedRescue?.spellingIncludes) {
        for (const value of fixture.expectedRescue.spellingIncludes) assert.ok(out.rescue.spelling.includes(value), `${fixture.id}: spelling rescue ${value}`);
      }
      if (fixture.expectedRescue?.locationsIncludes) {
        for (const value of fixture.expectedRescue.locationsIncludes) assert.ok(out.rescue.locations.includes(value), `${fixture.id}: location rescue ${value}`);
      }
      if (fixture.expectedRescue?.categoriesIncludes) {
        for (const value of fixture.expectedRescue.categoriesIncludes) assert.ok(out.rescue.adjacentCategories.includes(value), `${fixture.id}: category rescue ${value}`);
      }
    });
  }
});
