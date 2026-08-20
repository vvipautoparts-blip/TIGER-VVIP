"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflowPath = path.join(
  __dirname,
  "../.github/workflows/tiger-gate5-adaptive-network-rehearsal.yml"
);

test("Gate 5 workflow is exact-SHA, local-only, and evidence producing", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");

  assert.match(workflow, /SOURCE_SHA:/);
  assert.match(workflow, /ref:\s*\$\{\{ env\.SOURCE_SHA \}\}/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN\|SUPABASE_DB_PASSWORD\|SUPABASE_PROJECT_REF/);
  assert.match(workflow, /supabase db reset --local/);
  assert.match(workflow, /TIGER_GATE5_DB_REHEARSAL=PASS/);
  assert.match(workflow, /PACKET_LOSS_SIMULATION=NOT_RUN_UNSUPPORTED_BY_DETERMINISTIC_HARNESS/);
  assert.match(workflow, /tiger-gate5-adaptive-network-rehearsal-\$\{\{ env\.SOURCE_SHA \}\}/);
});

test("Gate 5 workflow pins every external action to an immutable commit", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const uses = [...workflow.matchAll(/^\s*uses:\s*([^\s]+)$/gm)].map((match) => match[1]);
  assert.ok(uses.length >= 5);
  for (const action of uses) assert.match(action, /@[0-9a-f]{40}$/);
});