"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const workflow = fs.readFileSync(
  path.join(ROOT, ".github/workflows/codeql.yml"),
  "utf8"
);

test("CodeQL checks out and proves the exact PR head SHA", () => {
  assert.ok(
    workflow.includes("SOURCE_SHA: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}"),
    "workflow must derive SOURCE_SHA from pull_request.head.sha"
  );
  assert.ok(
    workflow.includes("ref: ${{ env.SOURCE_SHA }}"),
    "checkout must pin the exact SOURCE_SHA instead of the synthetic PR merge ref"
  );
  assert.match(workflow, /name: Verify exact source SHA/);
  assert.match(workflow, /actual_sha="\$\(git rev-parse HEAD\)"/);
  assert.match(workflow, /test "\$actual_sha" = "\$SOURCE_SHA"/);
});
