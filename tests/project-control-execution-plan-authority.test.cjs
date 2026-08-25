"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("historical global execution plan cannot authorize external-deal G17 payment execution", () => {
  const planPath = "project-control/sources/VVIP_TIGER_Global_Execution_Plan_AR.md";
  const plan = read(planPath);
  assert.match(plan, /معتمد للبناء والتفصيل التنفيذي/);
  assert.match(plan, /G17/);
  assert.match(plan, /Hosted Checkout/);

  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");
  const row = registry.split("\n").find((line) => line.includes(planPath)) || "";
  assert.match(row, /HISTORICAL_EXECUTION_PLAN/i);
  assert.match(row, /KEEP_PLATFORM_FINANCE/i);
  assert.match(row, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT/i);
  assert.match(row, /G17/i);
  assert.match(row, /platform-owned advertising|platform advertising services/i);
});
