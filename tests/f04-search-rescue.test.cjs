"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const moduleUrl = pathToFileURL(path.resolve(__dirname, "../scripts/fusion/f04-search-fabric.js")).href;
async function loadSearch() { return import(`${moduleUrl}?rescue=${Date.now()}-${Math.random()}`); }

const dictionaries = Object.freeze({
  locations: Object.freeze([
    Object.freeze({ value: "Amman", aliases: Object.freeze(["amman", "عمان"]), available: true, countries: Object.freeze(["JO"]) }),
    Object.freeze({ value: "Irbid", aliases: Object.freeze(["irbid", "اربد"]), available: true, countries: Object.freeze(["JO"]) }),
    Object.freeze({ value: "Hidden City", aliases: Object.freeze(["hidden"]), available: false, countries: Object.freeze(["JO"]) })
  ]),
  makes: Object.freeze([
    Object.freeze({ value: "Mercedes", aliases: Object.freeze(["mercedes", "مرسيدس"]), available: true }),
    Object.freeze({ value: "BMW", aliases: Object.freeze(["bmw", "بي ام دبليو"]), available: true })
  ]),
  categories: Object.freeze([
    Object.freeze({ value: "Cars", aliases: Object.freeze(["cars", "سيارات"]), available: true }),
    Object.freeze({ value: "Parts", aliases: Object.freeze(["parts", "قطع"]), available: true }),
    Object.freeze({ value: "Unavailable", aliases: Object.freeze(["forbidden-category"]), available: false })
  ]),
  aliases: Object.freeze([
    Object.freeze({ field: "model", value: "C200", aliases: Object.freeze(["c200", "سي 200"]), available: true })
  ])
});

function listing(id, overrides = {}) {
  return { id, title: "Mercedes C200", summary: "clean", location: "Amman", countryCode: "JO", sector: "vehicles", sectorLabel: "Vehicles", category: "Cars", brand: "Mercedes", model: "C200", year: 2020, specs: [], searchAliases: [], searchEligible: true, policyEligible: true, ...overrides };
}

test("F04 one-edit typo rescue uses bounded trusted vocabulary", async () => {
  const { searchListings } = await loadSearch();
  const out = searchListings({ query: "mercedez", listings: [], dictionaries, activeMarketCountry: "JO" });
  assert.ok(out.rescue.spelling.includes("mercedes"));
  assert.ok(out.rescue.spelling.length <= 5);
});

test("F04 recognizes bilingual location and trusted model aliases", async () => {
  const { searchListings } = await loadSearch();
  const english = searchListings({ query: "Mercedes C200 Amman", listings: [listing("one")], dictionaries, activeMarketCountry: "JO" });
  const arabic = searchListings({ query: "مرسيدس سي 200 عمان", listings: [listing("one")], dictionaries, activeMarketCountry: "JO" });
  assert.deepEqual(english.intent.filters, { make: "Mercedes", model: "C200", location: "Amman" });
  assert.deepEqual(arabic.intent.filters, { make: "Mercedes", model: "C200", location: "Amman" });
  assert.deepEqual(english.results.map((item) => item.id), ["one"]);
  assert.deepEqual(arabic.results.map((item) => item.id), ["one"]);
});

test("F04 zero-result rescue never suggests unavailable policy entries", async () => {
  const { searchListings } = await loadSearch();
  const out = searchListings({ query: "nothing", listings: [], dictionaries, activeMarketCountry: "JO" });
  const serialized = JSON.stringify(out.rescue);
  assert.doesNotMatch(serialized, /Hidden City|Unavailable|forbidden-category|hidden/i);
  assert.ok(out.rescue.locations.includes("Amman"));
  assert.ok(out.rescue.adjacentCategories.includes("Cars"));
});

test("F04 rescue families are deterministic and capped at five", async () => {
  const { searchListings } = await loadSearch();
  const first = searchListings({ query: "mercedez 2020", listings: [], dictionaries, activeMarketCountry: "JO" }).rescue;
  const second = searchListings({ query: "mercedez 2020", listings: [], dictionaries, activeMarketCountry: "JO" }).rescue;
  assert.deepEqual(first, second);
  for (const values of Object.values(first)) {
    assert.ok(Array.isArray(values));
    assert.ok(values.length <= 5);
  }
  assert.equal(Object.isFrozen(first), true);
});
