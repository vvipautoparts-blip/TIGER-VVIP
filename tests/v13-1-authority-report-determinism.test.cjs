"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const validatorPath = path.join(
  repoRoot,
  "project-control/scripts/validate_v13_1_authority.mjs"
);
const authorityRoot = path.join(repoRoot, "project-control/v13.1");

function runValidator() {
  return spawnSync(process.execPath, [validatorPath, "--root", authorityRoot], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

test("V13.1 PASS report is deterministic and contains no runtime timestamp", () => {
  const first = runValidator();
  const second = runValidator();

  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.equal(second.stdout, first.stdout);

  const report = JSON.parse(first.stdout);
  assert.equal(report.status, "PASS");
  assert.equal(Object.hasOwn(report, "checked_at"), false);
});

test("general-access capability count is derived from the canonical capability list", () => {
  const source = fs.readFileSync(validatorPath, "utf8");

  assert.doesNotMatch(
    source,
    /full_general_access_capability_count\s*:\s*4\b/
  );
  assert.match(
    source,
    /full_general_access_capability_count\s*:\s*GENERAL_CAPABILITY_NAMES\.length\s*\+\s*1\b/
  );
});
