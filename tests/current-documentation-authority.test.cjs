"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("documentation index points to current repository authorities instead of legacy auth/readiness snapshots", () => {
  const index = read("DOCUMENTATION-INDEX.md");
  assert.match(index, /docs\/MASTER_PROJECT_STATE\.md/);
  assert.match(index, /docs\/architecture\/OWNER_AUTHORITY_REGISTRY\.md/);
  assert.match(index, /AGENTS\.md/);
  assert.match(index, /auth-clerk-index\.js/);
  assert.match(index, /scripts\/runtime\/vvip-runtime-loader\.js/);
  assert.doesNotMatch(index, /auth\.js\s*-\s*Firebase auth/i);
  assert.doesNotMatch(index, /FINAL-VERIFICATION\.md\s*-\s*verification checklist/i);
});

for (const rel of [
  "PROJECT-SUMMARY.md",
  "FINAL-VERIFICATION.md",
  "USER-GUIDE.md",
  "UNIFIED-PLATFORM-STATUS.md"
]) {
  test(`${rel} cannot present stale production/readiness or test-credential authority`, () => {
    const text = read(rel);
    assert.match(text, /HISTORICAL_EVIDENCE_ONLY|LEGACY_DOCUMENTATION_TOMBSTONE/i);
    assert.match(text, /docs\/MASTER_PROJECT_STATE\.md/);
    assert.match(text, /OWNER_AUTHORITY_REGISTRY\.md/);
    assert.doesNotMatch(text, /Password123!/);
    assert.doesNotMatch(text, /جاهز\s*100%.*الإنتاج|جاهز للإنتاج|المشروع مكتمل\s*100%/i);
  });
}

test("legacy test credentials are explicitly non-operative and must not be provisioned from documentation", () => {
  for (const rel of ["PROJECT-SUMMARY.md", "FINAL-VERIFICATION.md", "USER-GUIDE.md"]) {
    const text = read(rel);
    assert.match(text, /DO_NOT_USE_TEST_CREDENTIALS/i);
    assert.match(text, /historical git|git history|commit history/i);
  }
});
