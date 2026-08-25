"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("importable historical tasks cannot authorize external-deal G17 payment execution", () => {
  const tasksPath = "project-control/data/tasks.json";
  const tasks = JSON.parse(read(tasksPath));
  const g1702 = tasks.find((task) => task.code === "G17-02");

  assert.ok(g1702, "expected historical G17-02 task");
  assert.match(g1702.title || "", /Hosted Checkout/);
  assert.equal(g1702.workflow_status, "backlog");
  assert.match(g1702.source_document || "", /Global_Implementation_Specification_AR_v2\.docx/);

  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");
  const row = registry.split("\n").find((line) => line.includes(tasksPath)) || "";
  assert.match(row, /HISTORICAL_DERIVED_EXECUTION_TASKS/i);
  assert.match(row, /KEEP_PLATFORM_FINANCE/i);
  assert.match(row, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT/i);
  assert.match(row, /import/i);
  assert.match(row, /platform-owned advertising|platform advertising services/i);
});
