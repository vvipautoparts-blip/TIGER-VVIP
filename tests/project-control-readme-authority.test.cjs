"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("historical project-control README cannot promote approved Word sources above Issue #312", () => {
  const guidePath = "project-control/README_AR.md";
  const guide = read(guidePath);
  assert.match(guide, /ملفات Word المعتمدة/);
  assert.match(guide, /master_task_registry\.csv/);

  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");
  const row = registry.split("\n").find((line) => line.includes(guidePath)) || "";
  assert.match(row, /HISTORICAL_PROJECT_CONTROL_OPERATIONS_GUIDE/i);
  assert.match(row, /NO_INDEPENDENT_AUTHORITY/i);
  assert.match(row, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT/i);
  assert.match(row, /Issue #312/i);
});
