"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("owner authority binds proximity-only three-lane interaction", () => {
  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");

  assert.match(registry, /proximity-only-three-lane-interaction-design\.md/i);
  assert.match(registry, /SHARE\s*=\s*DISTRIBUTE/i);
  assert.match(registry, /CONTACT\s*=\s*HANDOFF\s*->\s*TIGER STOPS/i);
  assert.match(registry, /CONTACT_HANDOFF_IS_TERMINAL=true/);
  assert.match(registry, /EXTERNAL_DEAL_STATE_MACHINE=0/);
  assert.match(registry, /ACTIVE_EXTERNAL_DEAL_PAYMENT=0/);
  assert.match(registry, /ACTIVE_EXTERNAL_DEAL_COMMISSION=0/);
  assert.match(registry, /ACTIVE_SUCCESS_FEE=0/);
  assert.match(registry, /ACTIVE_EXTERNAL_DEAL_SETTLEMENT=0/);
  assert.match(registry, /ACTIVE_EXTERNAL_DEAL_FULFILLMENT=0/);
  assert.match(registry, /AD_REVENUE_DEPENDS_ON_DEAL_OUTCOME=false/);
});

test("owner authority keeps advertising finance independent from external deal outcome", () => {
  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");

  assert.match(registry, /advertising|ad credits|platform-owned services/i);
  assert.match(registry, /independent[^.\n]*external deal[^.\n]*outcome|external deal[^.\n]*outcome[^.\n]*independent/i);
  assert.match(registry, /transaction-value commission/i);
  assert.match(registry, /success fee/i);
});