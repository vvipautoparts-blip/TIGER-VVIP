"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const moduleUrl = pathToFileURL(path.resolve(__dirname, "../scripts/fusion/f04-search-fabric.js")).href;
async function loadSearch() { return import(`${moduleUrl}?intent=${Date.now()}-${Math.random()}`); }

const dictionaries = Object.freeze({
  locations: Object.freeze([
    Object.freeze({ value: "Amman", aliases: Object.freeze(["amman", "عمان"]) }),
    Object.freeze({ value: "Irbid", aliases: Object.freeze(["irbid", "اربد"]) })
  ]),
  makes: Object.freeze([
    Object.freeze({ value: "Mercedes", aliases: Object.freeze(["mercedes", "مرسيدس"]) }),
    Object.freeze({ value: "BMW", aliases: Object.freeze(["bmw", "بي ام دبليو"]) })
  ]),
  categories: Object.freeze([
    Object.freeze({ value: "Cars", aliases: Object.freeze(["cars", "سيارات"]) })
  ]),
  aliases: Object.freeze({})
});

test("F04 extracts canonical Arabic commercial intent from trusted dictionaries", async () => {
  const { normalizeSearchQuery, extractSearchIntent } = await loadSearch();
  const intent = extractSearchIntent(normalizeSearchQuery("مرسيدس 2020 عمان"), dictionaries);
  assert.deepEqual(intent.filters, { make: "Mercedes", year: 2020, location: "Amman" });
  assert.deepEqual(intent.textTokens, []);
  assert.deepEqual(intent.recognized, ["make", "year", "location"]);
  assert.equal(Object.isFrozen(intent), true);
  assert.equal(Object.isFrozen(intent.filters), true);
});

test("F04 English equivalent produces the same canonical filters", async () => {
  const { normalizeSearchQuery, extractSearchIntent } = await loadSearch();
  const intent = extractSearchIntent(normalizeSearchQuery("Mercedes 2020 Amman"), dictionaries);
  assert.deepEqual(intent.filters, { make: "Mercedes", year: 2020, location: "Amman" });
});

test("F04 unknown terms remain text tokens rather than invented filters", async () => {
  const { normalizeSearchQuery, extractSearchIntent } = await loadSearch();
  const intent = extractSearchIntent(normalizeSearchQuery("مرسيدس 2020 عمان بانوراما"), dictionaries);
  assert.deepEqual(intent.textTokens, ["بانوراما"]);
  assert.equal(intent.filters.model, undefined);
});

test("F04 out-of-range numeric years remain text", async () => {
  const { normalizeSearchQuery, extractSearchIntent } = await loadSearch();
  for (const value of ["مرسيدس 1800 عمان", "Mercedes 2200 Amman"]) {
    const intent = extractSearchIntent(normalizeSearchQuery(value), dictionaries);
    assert.equal(intent.filters.year, undefined);
    assert.ok(intent.textTokens.some((token) => token === "1800" || token === "2200"));
  }
});

test("F04 category aliases are bounded and dictionary-driven", async () => {
  const { normalizeSearchQuery, extractSearchIntent } = await loadSearch();
  const intent = extractSearchIntent(normalizeSearchQuery("سيارات عمان"), dictionaries);
  assert.deepEqual(intent.filters, { category: "Cars", location: "Amman" });
  assert.deepEqual(intent.textTokens, []);
});
