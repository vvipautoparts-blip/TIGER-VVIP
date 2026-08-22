"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const registryPath = path.join(ROOT, "docs", "architecture", "OWNER_AUTHORITY_REGISTRY.md");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

test("one active owner authority governs discovery commerce and legacy conflicts are explicitly superseded", () => {
  assert.equal(fs.existsSync(registryPath), true, "OWNER_AUTHORITY_REGISTRY.md must exist");
  const registry = fs.readFileSync(registryPath, "utf8");

  assert.match(registry, /Issue\s+#312/i);
  assert.match(registry, /DISCOVERY\s*→\s*RELEVANCE\s*→\s*EXPLANATION\s*→\s*CONTACT HANDOFF\s*→\s*TIGER STOPS/i);
  assert.match(registry, /2026-08-11-vvip-commission-policy-all-sectors-design\.md/);
  assert.match(registry, /TIGERPAY_TP00_CONSTITUTION\.md/);
  assert.match(registry, /SUPERSEDED|HISTORICAL_EVIDENCE_ONLY/i);
  assert.match(registry, /advertising|ad credits|platform-owned services/i);
  assert.match(registry, /no commission|zero brokerage|no percentage/i);
});

test("current ONE FIELD design preserves zero-brokerage and additive-sector invariants", () => {
  const design = read("docs/superpowers/specs/2026-08-22-tiger-one-field-living-discovery-design.md");
  assert.match(design, /Zero brokerage is absolute/i);
  assert.match(design, /No new sector replaces an existing sector or feature/i);
  assert.match(design, /Platform-owned finance remains allowed only for the platform's own advertising\/services/i);
});

test("dependent TigerPay plans cannot re-authorize advertised-goods brokerage through stale implementation authority", () => {
  const registry = fs.readFileSync(registryPath, "utf8");

  assert.match(registry, /2026-08-07-tigerpay-tp00-tp01-implementation-plan\.md/);
  assert.match(registry, /2026-08-07-tigerpay-vault-3-sovereign-treasury-design\.md/);
  assert.match(registry, /KEEP_PLATFORM_FINANCE/);
  assert.match(registry, /order\/listing|hosted checkout|buyer\/seller\/provider|advertised goods\/services/i);
  assert.match(registry, /SUPERSEDED|HISTORICAL_EVIDENCE_ONLY|REDESIGN_DISCOVERY_ONLY/i);
});
