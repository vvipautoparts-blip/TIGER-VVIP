"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "docs/owner-control/p07/P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md",
  "docs/owner-control/p07/P07_DATABASE_ERD.mmd",
  "docs/owner-control/p07/P07_DATA_DICTIONARY.json",
  "docs/owner-control/p07/P07_RLS_DESIGN_MATRIX_REVIEW_ONLY.md",
  "docs/owner-control/p07/P07_STORAGE_POLICY_MATRIX_REVIEW_ONLY.md",
  "docs/owner-control/p07/P07_MIGRATION_ORDERING_PLAN_REVIEW_ONLY.md",
  "docs/owner-control/p07/P07_ROLLBACK_PLAN_REVIEW_ONLY.md",
  "docs/owner-control/p07/P07_EVIDENCE_MANIFEST.md",
  "docs/change-control/20260716-pr72-p07-complete-database-architecture.json"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

(function main() {
  for (const rel of REQUIRED_FILES) {
    assert(fs.existsSync(path.join(ROOT, rel)), `missing required file: ${rel}`);
  }

  const architecture = read("docs/owner-control/p07/P07_COMPLETE_DATABASE_ARCHITECTURE_REVIEW.md");
  const requiredChecklist = [
    "1. ERD كامل",
    "2. Machine-readable data dictionary",
    "32. RLS design matrix — Review Only",
    "33. Storage policy matrix — Review Only",
    "36. Evidence Manifest",
    "37. Coverage tests"
  ];

  for (const item of requiredChecklist) {
    assert(architecture.includes(item), `missing architecture coverage item: ${item}`);
  }

  const dataDictionary = JSON.parse(read("docs/owner-control/p07/P07_DATA_DICTIONARY.json"));
  assert(Array.isArray(dataDictionary.entities), "data dictionary must define entities array");
  assert(dataDictionary.entities.length >= 17, "data dictionary must include full entity set");

  const manifest = read("docs/owner-control/p07/P07_EVIDENCE_MANIFEST.md");
  assert(manifest.includes("NO PRODUCTION CHANGE"), "manifest must include no-production-change pledge");

  console.log("PR72 P07 DATABASE ARCHITECTURE REVIEW TEST PASS");
}());
