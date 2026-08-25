"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const workflow = fs.readFileSync(
  path.join(ROOT, ".github/workflows/vvip-quality-gate.yml"),
  "utf8"
);

const SETUP_NODE_V7_0_0_SHA = "820762786026740c76f36085b0efc47a31fe5020";
const LEGACY_SETUP_NODE_SHA = "249970729cb0ef3589644e2896645e5dc5ba9c38";
const CHECKOUT_V7_0_1_SHA = "3d3c42e5aac5ba805825da76410c181273ba90b1";

test("VVIP Quality Gate uses current hardened setup-node while preserving project Node 22", () => {
  assert.match(
    workflow,
    new RegExp(`actions/setup-node@${SETUP_NODE_V7_0_0_SHA}`),
    "Quality Gate must pin actions/setup-node v7.0.0 by immutable SHA"
  );
  assert.ok(
    !workflow.includes(`actions/setup-node@${LEGACY_SETUP_NODE_SHA}`),
    "legacy setup-node pin must be removed from Quality Gate"
  );
  assert.match(workflow, /node-version:\s*["']22["']/);
  assert.match(workflow, /package-manager-cache:\s*false/);
  assert.match(workflow, new RegExp(`actions/checkout@${CHECKOUT_V7_0_1_SHA}`));
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /ref:\s*\$\{\{ env\.SOURCE_SHA \}\}/);
  assert.match(workflow, /test "\$actual_sha" = "\$SOURCE_SHA"/);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.ok(
    !workflow.includes("ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION"),
    "Quality Gate must not opt back into deprecated insecure action runtimes"
  );
});
