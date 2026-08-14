"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const modulePath = path.join(root, "scripts/fusion/f04-search-fabric.js");
const moduleUrl = pathToFileURL(modulePath).href;
async function loadSearch() { return import(`${moduleUrl}?perf=${Date.now()}-${Math.random()}`); }

const dictionaries = Object.freeze({
  locations: Object.freeze([Object.freeze({ value: "Amman", aliases: Object.freeze(["amman", "عمان"]), available: true, countries: Object.freeze(["JO"]) })]),
  makes: Object.freeze([Object.freeze({ value: "Mercedes", aliases: Object.freeze(["mercedes", "مرسيدس"]), available: true })]),
  categories: Object.freeze([Object.freeze({ value: "Cars", aliases: Object.freeze(["cars", "سيارات"]), available: true })]),
  aliases: Object.freeze([])
});

function syntheticListings(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `synthetic-${String(index).padStart(6, "0")}`,
    title: index % 97 === 0 ? `Premium Mercedes ${index}` : `Vehicle ${index}`,
    summary: `bounded synthetic listing ${index}`,
    location: "Amman",
    countryCode: "JO",
    sector: "automotive",
    sectorLabel: "Cars",
    category: "Cars",
    brand: index % 2 === 0 ? "Mercedes" : "Other",
    model: `M${index % 50}`,
    year: 2020 + (index % 6),
    specs: ["synthetic"],
    searchAliases: [],
    searchEligible: true,
    policyEligible: true
  }));
}

function percentile(values, ratio) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

test("F04 bounds result count across 100 1000 and 25000 deterministic candidates", async () => {
  const { searchListings } = await loadSearch();
  for (const size of [100, 1000, 25000]) {
    const listings = syntheticListings(size);
    const durations = [];
    for (let run = 0; run < 5; run += 1) {
      const started = performance.now();
      const out = searchListings({ query: "premium", listings, dictionaries, activeMarketCountry: "JO" });
      durations.push(performance.now() - started);
      assert.ok(out.results.length <= 100, `${size}: result bound`);
      assert.equal(Object.isFrozen(out.results), true, `${size}: frozen results`);
    }
    console.log(`F04_PERF_DIAGNOSTIC size=${size} p50_ms=${percentile(durations, 0.50).toFixed(2)} p95_ms=${percentile(durations, 0.95).toFixed(2)}`);
  }
});

test("F04 typo rescue vocabulary is trusted-dictionary bounded, not candidate-derived", async () => {
  const { searchListings } = await loadSearch();
  const listings = syntheticListings(25000).map((item, index) => ({ ...item, title: `zzcandidate${index}` }));
  const out = searchListings({ query: "zzcandidate1x", listings, dictionaries: {}, activeMarketCountry: "JO" });
  assert.deepEqual(out.rescue.spelling, []);
});

test("F04 malformed null and oversized inputs fail safely without uncontrolled exceptions", async () => {
  const { searchListings, normalizeSearchQuery } = await loadSearch();
  assert.doesNotThrow(() => searchListings(null));
  assert.doesNotThrow(() => searchListings({ query: { malformed: true }, listings: null, dictionaries: null }));
  assert.deepEqual(searchListings(null).results, []);
  const long = "x".repeat(10000);
  const normalized = normalizeSearchQuery(long);
  assert.ok(normalized.raw.length <= 512);
  assert.ok(normalized.normalized.length <= 512);
});

test("F04 module exposes no global mutable candidate cache", () => {
  const source = fs.readFileSync(modulePath, "utf8");
  assert.doesNotMatch(source, /globalThis\s*\.\s*(cache|listings|candidates)/i);
  assert.doesNotMatch(source, /window\s*\.\s*(cache|listings|candidates)/i);
});
