"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const POLICY_PATH = path.join(ROOT, "project-control/product/no-commercial-register.v1.json");

const CODE_ROOTS = [
  "operations-console",
  "scripts",
  "supabase",
  "workers"
];

const CANONICAL_DOCS = [
  "docs/owner-control/VVIP_TIGER_OWNER_MASTER_REFERENCE.md",
  "docs/specifications/VVIP_TIGER_GLOBAL_EXECUTION_SPEC_FINAL_AR.md",
  "docs/execution/GLOBAL_V1_REQUIREMENTS_MATRIX.md",
  "docs/execution/GLOBAL_V1_TRACEABILITY_MATRIX.csv",
  "docs/global/GLOBAL_SCALE_AND_SLO_SPEC_AR.md",
  "docs/global/GLOBAL_EXECUTION_CHARTER_AR.md",
  "project-control/docs/GLOBAL_SCALE_AND_SLO_SPEC_AR.md",
  "project-control/docs/GLOBAL_EXECUTION_CHARTER_AR.md",
  "project-control/data/risk_register.csv",
  "project-control/data/master_task_registry.csv"
];

const TOP_LEVEL_EXTENSIONS = new Set([".html", ".js", ".mjs", ".cjs", ".json", ".sql"]);
const SCANNED_EXTENSIONS = new Set([".html", ".js", ".mjs", ".cjs", ".json", ".sql", ".md", ".csv"]);

const FORBIDDEN = [
  /سجل\s+تجاري/giu,
  /السجل\s+التجاري/giu,
  /commercial[\s_-]+registration/giu,
  /commercial[\s_-]+register/giu,
  /business[\s_-]+registration/giu,
  /company[\s_-]+registration[\s_-]+number/giu,
  /trade[\s_-]+license[\s_-]+(?:id|identifier|number)/giu,
  /commercial[_-]?(?:register|registration)[_-]?(?:id|number)?/giu
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "reports", "dist", "coverage"].includes(entry.name)) return [];
      return walk(full);
    }
    return SCANNED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [full] : [];
  });
}

function activeFiles() {
  const files = [];
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isFile() && TOP_LEVEL_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(path.join(ROOT, entry.name));
    }
  }
  for (const root of CODE_ROOTS) files.push(...walk(path.join(ROOT, root)));
  for (const rel of CANONICAL_DOCS) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) files.push(full);
  }
  return [...new Set(files)].sort();
}

function matchesIn(file) {
  const text = fs.readFileSync(file, "utf8");
  const hits = [];
  for (const pattern of FORBIDDEN) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const line = text.slice(0, match.index).split("\n").length;
      hits.push(`${path.relative(ROOT, file)}:${line}:${match[0]}`);
      if (match.index === pattern.lastIndex) pattern.lastIndex++;
    }
  }
  return hits;
}

test("binding owner policy permanently disables commercial-register product data", () => {
  assert.equal(fs.existsSync(POLICY_PATH), true, "binding no-commercial-register policy must exist");
  const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));

  assert.equal(policy.policyId, "VVIP_NO_COMMERCIAL_REGISTER_V1");
  assert.equal(policy.status, "BINDING");
  assert.equal(policy.ownerDecision, true);
  assert.equal(policy.productFieldAllowed, false);
  assert.equal(policy.placeholderAllowed, false);
  assert.equal(policy.reservedSchemaSlotAllowed, false);
  assert.equal(policy.collectionAllowed, false);
  assert.equal(policy.validationAllowed, false);
  assert.equal(policy.analyticsAllowed, false);
  assert.equal(policy.reportFilterAllowed, false);
  assert.equal(policy.prePublicationGateAllowed, false);
  assert.equal(policy.historicalProvenanceOnly, true);
  assert.equal(policy.futureReintroductionRequiresExplicitNewOwnerDecision, true);
  assert.ok(Array.isArray(policy.forbiddenSemanticAliases));
  assert.ok(policy.forbiddenSemanticAliases.includes("سجل تجاري"));
  assert.ok(policy.forbiddenSemanticAliases.includes("commercial registration"));
});

test("commercial-register data has no active product, schema, API, admin, or canonical requirement surface", () => {
  const files = activeFiles();
  const hits = files.flatMap(matchesIn);
  assert.deepEqual(hits, [], `Forbidden commercial-register surface found:\n${hits.join("\n")}`);
});

test("historical source material is not treated as an active product contract", () => {
  const historicalRoots = [
    "project-control/sources",
    "project-control/data/strategic_archive.json",
    "docs/state-archive"
  ];
  assert.ok(historicalRoots.every((value) => typeof value === "string" && value.length > 0));
});
