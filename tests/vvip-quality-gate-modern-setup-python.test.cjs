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

const SETUP_PYTHON_V7_0_0_SHA = "5fda3b95a4ea91299a34e894583c3862153e4b97";
const LEGACY_SETUP_PYTHON_SHA = "ece7cb06caefa5fff74198d8649806c4678c61a1";
const SETUP_NODE_V7_0_0_SHA = "820762786026740c76f36085b0efc47a31fe5020";
const CHECKOUT_V7_0_1_SHA = "3d3c42e5aac5ba805825da76410c181273ba90b1";

test("VVIP Quality Gate uses current hardened setup-python while preserving project Python 3.12", () => {
  assert.match(
    workflow,
    new RegExp(`actions/setup-python@${SETUP_PYTHON_V7_0_0_SHA}`),
    "Quality Gate must pin actions/setup-python v7.0.0 by immutable SHA"
  );
  assert.ok(
    !workflow.includes(`actions/setup-python@${LEGACY_SETUP_PYTHON_SHA}`),
    "legacy setup-python pin must be removed from Quality Gate"
  );

  const pythonBlock = workflow.match(/- name: Set up Python[\s\S]*?(?=\n\s*- name:|$)/)?.[0] ?? "";
  assert.match(pythonBlock, /python-version:\s*["']3\.12["']/);
  assert.ok(!/\n\s*cache:\s*/.test(pythonBlock), "Quality Gate setup-python must not enable dependency caching");

  assert.match(workflow, new RegExp(`actions/setup-node@${SETUP_NODE_V7_0_0_SHA}`));
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
