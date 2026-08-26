"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");
const releaseBuilder = fs.readFileSync("tools/vvip_public_release.py", "utf8");

test("Social persistence adapter is loaded by the authoritative app after runtime dependencies", () => {
  const fusionAdapter = index.indexOf('src="scripts/fusion/runtime-adapters.js"');
  const textContract = index.indexOf('src="scripts/social/text-contract.js"');
  const socialAdapter = index.indexOf('src="scripts/social/runtime-adapters.js"');
  const socialShell = index.indexOf('src="scripts/social/core-shell.js"');

  assert.ok(fusionAdapter >= 0, "expected current FUSION adapter to remain available");
  assert.ok(textContract > fusionAdapter, "Social text contract must load after existing runtime adapter layer");
  assert.ok(socialAdapter > textContract, "Social adapter must load after the binding text contract");
  assert.ok(socialShell > socialAdapter, "Social shell must load after Social persistence adapter");
});

test("strict public artifact explicitly allowlists the Social persistence adapter", () => {
  assert.match(releaseBuilder, /"scripts\/social\/text-contract\.js"/);
  assert.match(releaseBuilder, /"scripts\/social\/runtime-adapters\.js"/);
});
