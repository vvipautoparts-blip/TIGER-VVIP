"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("generated G17 phase metadata cannot grant external-deal payment authority", () => {
  const phases = JSON.parse(read("project-control/data/phases.json"));
  const g17 = phases.find((phase) => phase.code === "G17");
  assert.ok(g17, "expected historical G17 phase metadata to remain available as evidence");
  assert.match(g17.title, /الاشتراكات|المدفوعات|الإيرادات/);

  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");
  const row = registry.split("\n").find((line) => line.includes("project-control/data/phases.json")) || "";
  assert.match(row, /HISTORICAL_DERIVED_EXECUTION_PHASES/i);
  assert.match(row, /KEEP_PLATFORM_FINANCE/i);
  assert.match(row, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT/i);
  assert.match(row, /G17/i);
  assert.match(row, /platform-owned advertising|platform advertising services/i);
});
