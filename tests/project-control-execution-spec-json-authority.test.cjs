"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("machine-readable historical execution specification cannot authorize external-deal payment execution", () => {
  const specPath = "project-control/sources/VVIP_TIGER_Global_Execution_Specification_V2_AR.json";
  const raw = read(specPath);
  JSON.parse(raw);
  assert.match(raw, /مرجع معتمد للتخطيط والتنفيذ والتعاقد والمراجعة/);
  assert.match(raw, /Hosted Checkout/);
  assert.match(raw, /دون حفظ أموال صفقات المستخدمين/);

  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");
  const row = registry.split("\n").find((line) => line.includes(specPath)) || "";
  assert.match(row, /HISTORICAL_MACHINE_EXECUTION_SPECIFICATION/i);
  assert.match(row, /KEEP_PLATFORM_FINANCE/i);
  assert.match(row, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT/i);
  assert.match(row, /platform-owned advertising|platform advertising services/i);
});
