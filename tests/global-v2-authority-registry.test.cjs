"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

test("Global Execution Specification V2 cannot override Issue #312 external-commerce authority", () => {
  const registry = read("docs/architecture/OWNER_AUTHORITY_REGISTRY.md");

  assert.match(registry, /project-control\/sources\/VVIP_TIGER_Global_Execution_Specification_V2_AR\.md/);
  assert.match(registry, /HISTORICAL_EVIDENCE_ONLY|HISTORICAL_EXECUTION_SNAPSHOT/i);
  assert.match(registry, /KEEP_PLATFORM_FINANCE/i);
  assert.match(registry, /platform-owned advertising|platform advertising services/i);
  assert.match(registry, /NO_RUNTIME_AUTHORITY_FOR_EXTERNAL_DEAL_PAYMENT|external[- ]deal.*superseded/i);
  assert.match(registry, /CONTACT HANDOFF.*TIGER STOPS/i);
});
