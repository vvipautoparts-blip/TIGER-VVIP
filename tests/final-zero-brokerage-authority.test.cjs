"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("Issue #312 has one explicit active commerce authority", () => {
  const rel = "docs/architecture/OWNER_AUTHORITY_REGISTRY.md";
  assert.equal(fs.existsSync(path.join(ROOT, rel)), true, `${rel} must exist`);
  const registry = read(rel);
  assert.match(registry, /Issue\s+#312/i);
  assert.match(registry, /DISCOVERY\s*→\s*RELEVANCE\s*→\s*EXPLANATION\s*→\s*CONTACT HANDOFF\s*→\s*TIGER STOPS/i);
  assert.match(registry, /KEEP_PLATFORM_FINANCE/);
  assert.match(registry, /RETIRE_BROKERAGE/);
  assert.match(registry, /REDESIGN_DISCOVERY_ONLY/);
  assert.match(registry, /HISTORICAL_EVIDENCE_ONLY/);
  assert.match(registry, /zero brokerage|no commission|no percentage/i);
});

test("current documentation index cannot route engineers to removed legacy runtime", () => {
  const index = read("DOCUMENTATION-INDEX.md");
  assert.match(index, /OWNER_AUTHORITY_REGISTRY\.md/);
  assert.match(index, /scripts\/runtime\/vvip-runtime-loader\.js/);
  assert.doesNotMatch(index, /Firebase auth\/session snapshot|auth\.js.*Firebase/i);
  assert.doesNotMatch(index, /FINAL-VERIFICATION\.md.*verification checklist/i);
  assert.doesNotMatch(index, /TEST-USERS\.md|TEST-ACCOUNTS-GUIDE\.md/);
});

test("TigerPay constitution is locally scoped to platform-owned finance", () => {
  const tp00 = read("docs/payments/TIGERPAY_TP00_CONSTITUTION.md");
  assert.match(tp00, /Issue\s+#312/i);
  assert.match(tp00, /KEEP_PLATFORM_FINANCE/);
  assert.match(tp00, /SUPERSEDED|REDESIGN_DISCOVERY_ONLY/);
  assert.match(tp00, /platform-owned advertising|ad credits|platform-owned services/i);
  assert.match(tp00, /buyer\/seller\/provider|user-to-user|user-to-provider/i);
  assert.match(tp00, /contact handoff|TIGER STOPS/i);
});
