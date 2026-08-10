"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const resilience = fs.readFileSync(path.join(root, "scripts", "vvip-pr30-resilience.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles", "vvip-production-marketplace.css"), "utf8");

test("resilience delegates authenticated production controls to the production runtime", () => {
  assert.match(resilience, /function\s+isProductionRuntimeSurface\s*\(/);
  assert.match(resilience, /\[data-vvip-unified-home\]/);
  assert.match(resilience, /\[data-my-listings-modal\]/);
  assert.match(resilience, /\[data-production-listing-modal\]/);
  assert.match(resilience, /if\s*\(isProductionRuntimeSurface\(event\.target\)\)\s*return/);
});

test("empty marketplace reset is recovered by the resilience layer", () => {
  assert.match(resilience, /function\s+resetMarketplaceView\s*\(/);
  assert.match(resilience, /\[data-reset-listings\]/);
  assert.match(resilience, /search\.value\s*=\s*["']["']/);
  assert.match(resilience, /dispatchEvent\(new Event\(["']input["']/);
  assert.match(resilience, /\[data-sector-filter=[\\"']all[\\"']\]/);
});

test("mobile bottom navigation is hidden unless authenticated home is active", () => {
  assert.match(css, /\.market-bottom-nav\s*\{\s*display\s*:\s*none\s*\}/);
  assert.match(css, /body\.is-home\s+\.market-bottom-nav\s*\{/);
  assert.match(css, /position\s*:\s*fixed/);
  assert.match(css, /grid-template-columns\s*:\s*repeat\(4\s*,\s*minmax\(0\s*,\s*1fr\)\)/);
  assert.match(css, /@media\(min-width\s*:\s*641px\)\s*\{\s*body\.is-home\s+\.market-bottom-nav\s*\{\s*display\s*:\s*none\s*\}/);
});
