"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const qualityGatePath = path.join(__dirname, "..", "scripts", "quality-gate.sh");
const script = fs.readFileSync(qualityGatePath, "utf8");

test("quality gate owns diff verification inside a dedicated fail-closed function", () => {
  assert.match(script, /run_diff_check\(\)\s*\{/);
  assert.match(script, /refs\/remotes\/origin\/main\^\{commit\}/);
  assert.match(script, /git fetch --no-tags --prune origin main:refs\/remotes\/origin\/main/);
  assert.match(script, /git diff --check origin\/main\.\.\.HEAD/);
});

test("diff check is executed through run_clean_gate rather than as loose shell commands", () => {
  assert.match(
    script,
    /run_clean_gate\s+[\\\s\n]*"diff_check"\s+[\\\s\n]*run_diff_check/
  );

  assert.doesNotMatch(
    script,
    /run_clean_gate\s*\\\s*\n\s*"diff_check"\s*\\\s*\n\s*#\s*VVIP_CI_FETCH_BASE_IN_ISOLATED_WORKSPACE/
  );
});
