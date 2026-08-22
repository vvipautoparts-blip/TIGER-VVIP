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

test("README cannot present historical deployment evidence as current Production truth", () => {
  const readme = read("README.md");
  assert.match(readme, /docs\/MASTER_PROJECT_STATE\.md/);
  assert.match(readme, /Production runtime status.*separate|Production.*fresh exact-SHA|historical.*Production/i);
  assert.match(readme, /platform-owned advertising|contact handoff|Issue #312/i);
  assert.doesNotMatch(readme, /## Production state\s*\n\s*The current Production Web source is/i);
  assert.doesNotMatch(readme, /semantically remediated in the deployed Production resolver/i);
});

test("legacy TigerPay implementation plan cannot govern advertised-goods or provider transactions", () => {
  const text = read("docs/superpowers/plans/2026-08-07-tigerpay-tp00-tp01-implementation-plan.md");
  assert.match(text, /HISTORICAL_EVIDENCE_ONLY|SUPERSEDED.*Issue #312/i);
  assert.match(text, /platform-owned advertising|platform advertising services/i);
  assert.match(text, /CONTACT HANDOFF.*TIGER STOPS/i);
});

test("TigerPay Vault 3 design is explicitly narrowed to platform-owned finance", () => {
  const text = read("docs/superpowers/specs/2026-08-07-tigerpay-vault-3-sovereign-treasury-design.md");
  assert.match(text, /HISTORICAL_EVIDENCE_ONLY|SUPERSEDED.*Issue #312/i);
  assert.match(text, /platform-owned advertising|platform advertising services/i);
  assert.match(text, /CONTACT HANDOFF.*TIGER STOPS/i);
});
