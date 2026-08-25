"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const registry = fs.readFileSync(
  path.join(ROOT, "docs", "architecture", "OWNER_AUTHORITY_REGISTRY.md"),
  "utf8"
);

for (const artifact of [
  "docs/VVIP_TIGER_DB_AUDIT.md",
  "docs/architecture/LEGACY_SUPABASE_SCHEMA_BLOCK.md",
  "docs/product-readiness/P08_WAIT_READINESS_REPORT.md"
]) {
  test(`${artifact} is classified as historical/non-operative evidence`, () => {
    assert.match(registry, new RegExp(artifact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
}

test("historical schema/readiness snapshots cannot reopen superseded commerce decisions", () => {
  assert.match(registry, /historical snapshot|historical evidence|HISTORICAL_EVIDENCE_ONLY/i);
  assert.match(registry, /P08_WAIT_READINESS_REPORT/);
  assert.match(registry, /commission.*not.*open|cannot reopen|superseded/i);
  assert.match(registry, /LEGACY_SUPABASE_SCHEMA_BLOCK/);
  assert.match(registry, /SUPERSEDED_DO_NOT_APPLY_REMOTE/);
  assert.match(registry, /VVIP_TIGER_DB_AUDIT/);
  assert.match(registry, /audit.*not.*migration|not.*current.*authority|historical.*audit/i);
});
