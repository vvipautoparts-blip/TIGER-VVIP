"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("historical global implementation specification cannot become external-deal payment authority", () => {
  const specPath = "project-control/sources/VVIP_TIGER_Global_Implementation_Specification_AR_v2.md";
  const raw = read(specPath);
  assert.match(raw, /مرجع تنفيذ وتعاقد وتقدير/);
  assert.match(raw, /Hosted Checkout/);
  assert.match(raw, /الدفع لاشتراك المنصة وترويج الإعلان فقط/);

  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");
  const row = registry.split("\n").find((line) => line.includes(specPath)) || "";
  assert.match(row, /HISTORICAL_IMPLEMENTATION_SPECIFICATION/i);
  assert.match(row, /KEEP_PLATFORM_FINANCE/i);
  assert.match(row, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT/i);
  assert.match(row, /platform-owned advertising|platform advertising services/i);
});
