"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("machine-readable historical execution plan cannot authorize external-deal G17 payment execution", () => {
  const planPath = "project-control/sources/VVIP_TIGER_Global_Execution_Plan_AR.json";
  const raw = read(planPath);
  JSON.parse(raw);
  assert.match(raw, /معتمد للبناء والتفصيل التنفيذي/);
  assert.match(raw, /G17-02/);
  assert.match(raw, /Hosted Checkout/);

  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");
  const row = registry.split("\n").find((line) => line.includes(planPath)) || "";
  assert.match(row, /HISTORICAL_MACHINE_EXECUTION_PLAN/i);
  assert.match(row, /KEEP_PLATFORM_FINANCE/i);
  assert.match(row, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT/i);
  assert.match(row, /G17/i);
  assert.match(row, /platform-owned advertising|platform advertising services/i);
});
