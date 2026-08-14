"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const moduleUrl = pathToFileURL(path.resolve(__dirname, "../scripts/fusion/f04-search-fabric.js")).href;
async function loadSearch() { return import(`${moduleUrl}?ranking=${Date.now()}-${Math.random()}`); }

const dictionaries = Object.freeze({
  locations: Object.freeze([Object.freeze({ value: "Amman", aliases: Object.freeze(["amman", "عمان"]) })]),
  makes: Object.freeze([Object.freeze({ value: "Mercedes", aliases: Object.freeze(["mercedes", "مرسيدس"]) })]),
  categories: Object.freeze([Object.freeze({ value: "Cars", aliases: Object.freeze(["cars", "سيارات"]) })]),
  aliases: Object.freeze({})
});

function listing(id, overrides = {}) {
  return {
    id,
    title: "Vehicle",
    summary: "clean listing",
    location: "Amman",
    countryCode: "JO",
    sector: "vehicles",
    sectorLabel: "Vehicles",
    category: "Cars",
    brand: "Mercedes",
    model: "C200",
    year: 2020,
    specs: [],
    searchAliases: [],
    searchEligible: true,
    policyEligible: true,
    ...overrides
  };
}

test("F04 excluded candidates never appear regardless of lexical or semantic relevance", async () => {
  const { searchListings } = await loadSearch();
  const results = searchListings({
    query: "panorama",
    listings: [
      listing("visible", { title: "Panorama" }),
      listing("search-hidden", { title: "Panorama Panorama", searchEligible: false }),
      listing("policy-hidden", { title: "Panorama Panorama", policyEligible: false })
    ],
    dictionaries,
    activeMarketCountry: "JO",
    semanticScores: { "search-hidden": 1, "policy-hidden": 1 }
  }).results;
  assert.deepEqual(results.map((item) => item.id), ["visible"]);
});

test("F04 active-market country mismatch is excluded", async () => {
  const { searchListings } = await loadSearch();
  const out = searchListings({
    query: "vehicle",
    listings: [listing("jo"), listing("ae", { countryCode: "AE" })],
    dictionaries,
    activeMarketCountry: "JO"
  });
  assert.deepEqual(out.results.map((item) => item.id), ["jo"]);
});

test("F04 exact title match outranks summary-only match", async () => {
  const { searchListings } = await loadSearch();
  const out = searchListings({
    query: "panorama",
    listings: [
      listing("summary", { title: "Vehicle", summary: "panorama roof" }),
      listing("title", { title: "Panorama", summary: "roof" })
    ],
    dictionaries,
    activeMarketCountry: "JO"
  });
  assert.deepEqual(out.results.map((item) => item.id), ["title", "summary"]);
});

test("F04 semantic score cannot resurrect excluded candidate", async () => {
  const { searchListings } = await loadSearch();
  const out = searchListings({
    query: "anything",
    listings: [listing("allowed", { title: "anything" }), listing("denied", { policyEligible: false })],
    dictionaries,
    activeMarketCountry: "JO",
    semanticScores: { denied: 9999, allowed: 0 }
  });
  assert.deepEqual(out.results.map((item) => item.id), ["allowed"]);
});

test("F04 structured filters are enforced and ties use stable id", async () => {
  const { searchListings } = await loadSearch();
  const out = searchListings({
    query: "مرسيدس 2020 عمان",
    listings: [
      listing("b"), listing("a"),
      listing("wrong-year", { year: 2021 }),
      listing("wrong-make", { brand: "BMW" })
    ],
    dictionaries,
    activeMarketCountry: "JO"
  });
  assert.deepEqual(out.results.map((item) => item.id), ["a", "b"]);
  assert.equal(Object.isFrozen(out), true);
  assert.equal(Object.isFrozen(out.results), true);
  assert.equal(Object.isFrozen(out.results[0]), true);
});
