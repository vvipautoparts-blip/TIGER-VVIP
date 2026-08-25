"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const QUALITY_GATE = fs.readFileSync(
  path.join(ROOT, "scripts/quality-gate.sh"),
  "utf8"
);
const CLI = fs.readFileSync(
  path.join(ROOT, "project-control/value-governance/zero-residue-cli.mjs"),
  "utf8"
);

test("Quality Gate binds zero-residue proof to the exact source SHA rather than the synthetic snapshot commit", () => {
  assert.match(
    QUALITY_GATE,
    /zero-residue-cli\.mjs[\s\\\n]+--check[\s\\\n]+--source-commit-sha "\$SOURCE_HEAD"/
  );
});

test("zero-residue CLI rejects an authoritative source SHA whose tree differs from the snapshot", () => {
  assert.match(CLI, /sourceTreeSha !== snapshotTreeSha/);
  assert.match(CLI, /ZERO_RESIDUE_SOURCE_TREE_MISMATCH/);
});
