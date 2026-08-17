"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const feedPath = path.join(root, "scripts/fusion/f02-feed.js");
const pagePath = path.join(root, "fusion-home-f02.html");

function sources() {
  return {
    feed: fs.readFileSync(feedPath, "utf8"),
    html: fs.readFileSync(pagePath, "utf8")
  };
}

test("F04 Single Surface consumes the real search fabric and removes raw substring authority", () => {
  const { feed } = sources();
  assert.match(feed, /import\(["']\.\/f04-search-fabric\.js["']\)/);
  assert.match(feed, /searchFabric\.searchListings\s*\(/);
  assert.doesNotMatch(feed, /\.includes\(query\)/, "raw includes(query) search must not remain authoritative");
});

test("F04 Single Surface preserves 160ms debounce and renders only search result contract", () => {
  const { feed } = sources();
  assert.match(feed, /setTimeout\([\s\S]*?,\s*160\s*\)/);
  assert.match(feed, /searchResult\.results/);
  assert.match(feed, /searchResult\.rescue/);
});

test("F04 Single Surface has a dedicated bounded rescue status host", () => {
  const { html, feed } = sources();
  assert.match(html, /data-search-rescue/);
  assert.match(feed, /querySelector\(["']\[data-search-rescue\]["']\)/);
});

test("F04 Single Surface fails closed on candidate eligibility and sector selection", () => {
  const { feed } = sources();
  assert.match(feed, /searchEligible:\s*item\.syntheticDemo\s*===\s*true\s*\|\|\s*item\.searchEligible\s*===\s*true/);
  assert.match(feed, /policyEligible:\s*item\.syntheticDemo\s*===\s*true\s*\|\|\s*item\.policyEligible\s*===\s*true/);
  assert.match(feed, /state\.sector\s*===\s*["']all["']\s*\|\|\s*item\.sector\s*===\s*state\.sector/);
});

test("F04 integration preserves core card actions and advertising-only owner disclaimer", () => {
  const { feed } = sources();
  for (const label of ["حفظ", "تواصل", "مشاركة"]) assert.match(feed, new RegExp(label));
  assert.match(feed, /منصة عرض وتواصل/);
  assert.match(feed, /ليست طرفًا/);
  assert.match(feed, /الدفع/);
  assert.match(feed, /التوصيل/);
});
