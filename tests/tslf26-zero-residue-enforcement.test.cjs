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
const CLEANGUARD = fs.readFileSync(
  path.join(ROOT, ".github/workflows/tiger-cleanguard.yml"),
  "utf8"
);
const CLI_PATH = path.join(
  ROOT,
  "project-control/value-governance/zero-residue-cli.mjs"
);

test("Quality Gate enforces zero residue and stores proof only in external evidence", () => {
  assert.ok(fs.existsSync(CLI_PATH), "zero-residue CLI must exist");
  assert.match(
    QUALITY_GATE,
    /run_clean_gate\s+\\\n\s*"zero_residue"\s+\\\n\s*node project-control\/value-governance\/zero-residue-cli\.mjs/
  );
  assert.match(QUALITY_GATE, /--check/);
  assert.match(
    QUALITY_GATE,
    /--report-json "\$CLEANROOM_EVIDENCE_ROOT\/zero-residue-proof\.json"/
  );
  assert.ok(
    !QUALITY_GATE.includes("reports/zero-residue-proof.json"),
    "zero-residue evidence must not be written into the repository"
  );
});

test("TIGER CleanGuard executes the same zero-residue verifier in read-only mode", () => {
  assert.match(
    CLEANGUARD,
    /node project-control\/value-governance\/zero-residue-cli\.mjs --check/
  );
  assert.ok(
    !CLEANGUARD.includes("--report-json"),
    "CleanGuard should remain read-only and not write evidence into its checkout"
  );
});
