"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const yaml = fs.readFileSync(path.join(ROOT, "docs", "owner-control", "VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml"), "utf8");
const markdown = fs.readFileSync(path.join(ROOT, "docs", "owner-control", "VVIP_TIGER_MASTER_EXECUTION_ROADMAP.md"), "utf8");
const registry = fs.readFileSync(path.join(ROOT, "docs", "architecture", "OWNER_AUTHORITY_REGISTRY.md"), "utf8");

test("master execution roadmap is a preserved historical snapshot, not current owner commerce authority", () => {
  assert.match(yaml, /^authority_status:\s*HISTORICAL_EXECUTION_SNAPSHOT$/m);
  assert.match(yaml, /^current_authority:\s*docs\/architecture\/OWNER_AUTHORITY_REGISTRY\.md$/m);
  assert.match(yaml, /^superseded_by:\s*ISSUE_312_PRIVATE_DISCOVERY_RENDEZVOUS$/m);
  assert.match(yaml, /^runtime_execution_authority:\s*false$/m);

  assert.match(markdown, /HISTORICAL_EXECUTION_SNAPSHOT/i);
  assert.match(markdown, /Issue\s+#312/i);
  assert.match(markdown, /OWNER_AUTHORITY_REGISTRY\.md/);
  assert.doesNotMatch(markdown, /المرجع المنظم الرسمي هو\s*\[VVIP_TIGER_MASTER_EXECUTION_ROADMAP\.yaml\]/i);
});

test("roadmap P18 cannot authorize buyer-seller payment and is limited to TIGER-owned advertising services", () => {
  const p18 = yaml.match(/\n  - id: P18\n([\s\S]*?)(?=\n  - id: P19\n)/);
  assert.ok(p18, "P18 must remain preserved in the historical roadmap");
  assert.match(p18[1], /KEEP_PLATFORM_FINANCE/);
  assert.match(p18[1], /PLATFORM_OWNED_ADVERTISING_SERVICES_ONLY/);
  assert.match(p18[1], /contact handoff|external deal|buyer.*seller/i);
  assert.doesNotMatch(p18[1], /\n    name:\s*Payment Gateway\s*$/m);

  assert.match(markdown, /P18[\s\S]*KEEP_PLATFORM_FINANCE/i);
  assert.match(markdown, /P18[\s\S]*platform-owned advertising|P18[\s\S]*خدمات الإعلانات/i);
});

test("canonical authority registry classifies both roadmap representations and blocks generic P18 revival", () => {
  assert.match(registry, /VVIP_TIGER_MASTER_EXECUTION_ROADMAP\.yaml/);
  assert.match(registry, /VVIP_TIGER_MASTER_EXECUTION_ROADMAP\.md/);
  assert.match(registry, /HISTORICAL_EXECUTION_SNAPSHOT|HISTORICAL_EVIDENCE_ONLY/i);
  assert.match(registry, /P18/);
  assert.match(registry, /KEEP_PLATFORM_FINANCE/);
  assert.match(registry, /platform-owned advertising|advertising services/i);
  assert.match(registry, /buyer\/seller|external.*deal|contact handoff/i);
});
