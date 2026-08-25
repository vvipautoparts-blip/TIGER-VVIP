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

const CHECKOUT_V7_0_1_SHA = "3d3c42e5aac5ba805825da76410c181273ba90b1";
const LEGACY_CHECKOUT_SHA = "b4ffde65f46336ab88eb53be808477a3936bae11";

test("VVIP Quality Gate uses the current pinned checkout runtime without persisting credentials", () => {
  assert.match(
    workflow,
    new RegExp(`actions/checkout@${CHECKOUT_V7_0_1_SHA}`),
    "Quality Gate must pin actions/checkout v7.0.1 by immutable SHA"
  );
  assert.ok(
    !workflow.includes(`actions/checkout@${LEGACY_CHECKOUT_SHA}`),
    "legacy Node-20 checkout pin must be removed from Quality Gate"
  );
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /ref:\s*\$\{\{ env\.SOURCE_SHA \}\}/);
  assert.match(workflow, /test "\$actual_sha" = "\$SOURCE_SHA"/);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.ok(
    !workflow.includes("ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION"),
    "Quality Gate must not opt back into deprecated insecure Node action runtimes"
  );
});
