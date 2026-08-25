"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("imported G17 dependency metadata cannot become external-deal payment authority", () => {
  const depsPath = "project-control/data/task_dependencies.json";
  const deps = JSON.parse(read(depsPath));
  assert.ok(deps.some((row) => row.task_code === "G17-02" && row.depends_on_task_code === "G17-01"));
  assert.ok(deps.some((row) => row.task_code === "G17-03" && row.depends_on_task_code === "G17-02"));

  const importer = read("project-control/scripts/import_project_control.mjs");
  assert.match(importer, /read\(['"]task_dependencies\.json['"]\)/);
  assert.match(importer, /project_control\.task_dependencies/);

  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");
  const row = registry.split("\n").find((line) => line.includes(depsPath)) || "";
  assert.match(row, /HISTORICAL_DERIVED_EXECUTION_DEPENDENCIES/i);
  assert.match(row, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT/i);
  assert.match(row, /G17/i);
  assert.match(row, /platform-owned advertising|platform advertising services/i);
});
