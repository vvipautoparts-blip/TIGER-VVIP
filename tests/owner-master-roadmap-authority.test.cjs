"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const yaml = fs.readFileSync(path.join(ROOT, "docs", "owner-control", "VVIP_TIGER_MASTER_EXECUTION_ROADMAP.yaml"), "utf8");
const markdown = fs.readFileSync(path.join(ROOT, "docs", "owner-control", "VVIP_TIGER_MASTER_EXECUTION_ROADMAP.md"), "utf8");
const overlayPath = path.join(ROOT, "docs", "owner-control", "VVIP_TIGER_MASTER_EXECUTION_ROADMAP_AUTHORITY_OVERLAY.md");
const registry = fs.readFileSync(path.join(ROOT, "docs", "architecture", "OWNER_AUTHORITY_REGISTRY.md"), "utf8");

test("master execution roadmap provenance remains intact while a current authority overlay supersedes execution meaning", () => {
  assert.match(yaml, /^source_of_truth:\s*docs\/owner-control\/VVIP_TIGER_MASTER_EXECUTION_ROADMAP\.yaml$/m);
  assert.match(yaml, /\n  - id: P18\n[\s\S]*?\n    name:\s*Payment Gateway\s*$/m);
  assert.match(markdown, /P18[\s\S]*بوابة الدفع والإيصالات/i);

  assert.equal(fs.existsSync(overlayPath), true, "roadmap authority overlay must exist");
  const overlay = fs.readFileSync(overlayPath, "utf8");
  assert.match(overlay, /HISTORICAL_EXECUTION_SNAPSHOT/i);
  assert.match(overlay, /Issue\s+#312/i);
  assert.match(overlay, /OWNER_AUTHORITY_REGISTRY\.md/);
  assert.match(overlay, /current_phase|execution cursor/i);
  assert.match(overlay, /not.*current.*authority|no runtime execution authority|non-operative/i);
});

test("historical P18 cannot authorize buyer-seller payment and is re-scoped to TIGER-owned advertising services only", () => {
  const overlay = fs.readFileSync(overlayPath, "utf8");
  assert.match(overlay, /P18/);
  assert.match(overlay, /KEEP_PLATFORM_FINANCE/);
  assert.match(overlay, /PLATFORM_OWNED_ADVERTISING_SERVICES_ONLY/);
  assert.match(overlay, /buyer\/seller|buyer.*seller|external deal|user-to-user|user-to-provider/i);
  assert.match(overlay, /contact handoff/i);
  assert.match(overlay, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT|SUPERSEDED/i);
});

test("canonical authority registry classifies both roadmap representations and their overlay", () => {
  assert.match(registry, /VVIP_TIGER_MASTER_EXECUTION_ROADMAP\.yaml/);
  assert.match(registry, /VVIP_TIGER_MASTER_EXECUTION_ROADMAP\.md/);
  assert.match(registry, /VVIP_TIGER_MASTER_EXECUTION_ROADMAP_AUTHORITY_OVERLAY\.md/);
  assert.match(registry, /HISTORICAL_EXECUTION_SNAPSHOT|HISTORICAL_EVIDENCE_ONLY/i);
  assert.match(registry, /P18/);
  assert.match(registry, /KEEP_PLATFORM_FINANCE/);
  assert.match(registry, /platform-owned advertising|advertising services/i);
  assert.match(registry, /buyer\/seller|external.*deal|contact handoff/i);
});
