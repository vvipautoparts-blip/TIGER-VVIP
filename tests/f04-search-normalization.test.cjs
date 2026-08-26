"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const moduleUrl = pathToFileURL(path.resolve(__dirname, "../scripts/fusion/f04-search-fabric.js")).href;
async function loadSearch() { return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`); }

test("F04 normalizes Arabic diacritics tatweel letters digits and whitespace", async () => {
  const { normalizeSearchQuery } = await loadSearch();
  const result = normalizeSearchQuery("  مَرْسِيدِســ ٢٠٢٠   عَمّان ");
  assert.equal(result.normalized, "مرسيدس 2020 عمان");
  assert.deepEqual(result.tokens, ["مرسيدس", "2020", "عمان"]);
  assert.deepEqual(result.scriptHints, ["arabic"]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.tokens), true);
  assert.equal(Object.isFrozen(result.scriptHints), true);
});

test("F04 normalizes English case punctuation and whitespace", async () => {
  const { normalizeSearchQuery } = await loadSearch();
  const result = normalizeSearchQuery("  MERCEDES,   2020 -- AMMAN! ");
  assert.equal(result.normalized, "mercedes 2020 amman");
  assert.deepEqual(result.tokens, ["mercedes", "2020", "amman"]);
  assert.deepEqual(result.scriptHints, ["latin"]);
});

test("F04 normalizes Arabic letter variants and Persian digits deterministically", async () => {
  const { normalizeSearchQuery } = await loadSearch();
  const result = normalizeSearchQuery("إربد آودي ۲۰۲۱");
  assert.equal(result.normalized, "اربد اودي 2021");
  assert.deepEqual(result.tokens, ["اربد", "اودي", "2021"]);
});

test("F04 marks mixed Arabic Latin queries without inventing transliteration", async () => {
  const { normalizeSearchQuery } = await loadSearch();
  const result = normalizeSearchQuery("BMW عمان 2024");
  assert.equal(result.normalized, "bmw عمان 2024");
  assert.deepEqual(result.scriptHints, ["arabic", "latin"]);
});

test("F04 fails safely for null objects and oversized input", async () => {
  const { normalizeSearchQuery } = await loadSearch();
  assert.deepEqual(normalizeSearchQuery(null).tokens, []);
  assert.deepEqual(normalizeSearchQuery({ query: "car" }).tokens, []);
  const long = "a".repeat(5000);
  const result = normalizeSearchQuery(long);
  assert.ok(result.raw.length <= 512);
  assert.ok(result.normalized.length <= 512);
});
