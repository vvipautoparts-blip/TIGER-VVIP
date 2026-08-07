"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflow = fs.readFileSync(
  path.join(__dirname, "..", ".github", "workflows", "v14-release-candidate.yml"),
  "utf8"
);

test("V14 release candidate builds outside the checked-out source tree", () => {
  assert.match(workflow, /uses:\s*actions\/checkout@v7/);
  assert.match(workflow, /--source\s+\.\s*\\/);
  assert.match(workflow, /--output\s+"\$RUNNER_TEMP\/vvip-candidate"\s*\\/);
  assert.doesNotMatch(workflow, /--output\s+dist\/candidate/);
});

test("V14 release candidate uploads the exact external build directory", () => {
  assert.match(workflow, /path:\s*\$\{\{\s*runner\.temp\s*\}\}\/vvip-candidate/);
  assert.doesNotMatch(workflow, /path:\s*dist\/candidate/);
});
