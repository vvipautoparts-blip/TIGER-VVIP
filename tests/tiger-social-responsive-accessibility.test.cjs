"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Social responsive and keyboard contracts keep touch targets and focus continuity safe", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const shell = fs.readFileSync("scripts/social/core-shell.js", "utf8");
  const coreCss = fs.readFileSync("styles/tiger-social/core-shell.css", "utf8");
  const searchCss = fs.readFileSync("styles/tiger-social/search.css", "utf8");

  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(coreCss, /@media \(max-width: 900px\)/);
  assert.match(searchCss, /@media \(max-width: 720px\)/);
  assert.match(coreCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(coreCss, /padding-inline|margin-inline/);

  assert.match(coreCss, /\.social-circle-action[\s\S]*min-width: 44px[\s\S]*min-height: 44px/);
  assert.match(coreCss, /\.social-post-trigger[\s\S]*min-height: 44px/);
  assert.match(coreCss, /\.social-post-action[\s\S]*min-height: 44px/);
  assert.match(coreCss, /\.social-reactions__choice[\s\S]*min-width: 44px[\s\S]*min-height: 44px/);
  assert.match(coreCss, /\.social-friend-action[\s\S]*min-block-size: 44px/);
  assert.match(searchCss, /\.social-search-retry[\s\S]*min-height: 44px/);

  assert.match(coreCss, /\.social-post-trigger:focus-visible/);
  assert.match(shell, /lastPostTrigger/);
  assert.match(shell, /lastPostTrigger[\s\S]*\.focus\(\)/);
});
