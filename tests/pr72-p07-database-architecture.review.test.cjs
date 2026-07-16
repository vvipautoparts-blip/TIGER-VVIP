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

function expectFailure(fn, contains) {
  let failed = false;
  try {
    fn();
  } catch (error) {
    failed = true;
    assert(String(error.message || "").includes(contains), `expected message containing '${contains}', got '${error.message}'`);
  }
  assert(failed, `negative check unexpectedly passed: ${contains}`);
}

function validateEvidenceDependencies(manifest) {
  const deps = manifest.supporting_dependencies || manifest.supporting_dependency;
  const list = Array.isArray(deps) ? deps : (deps ? [deps] : []);
  assert(list.length >= 2, "supporting dependencies must include PR73 and PR74");

  const pr73 = list.find((d) => Number(d.pr) === 73);
  const pr74 = list.find((d) => Number(d.pr) === 74);
  assert(pr73, "missing PR73 supporting dependency");
  assert(pr74, "missing PR74 supporting dependency");
  assert(String(pr73.status || "") === "merged_and_post_merge_verified", "PR73 status must be merged_and_post_merge_verified");
  assert(String(pr74.status || "") === "merged_and_post_merge_verified", "PR74 status must be merged_and_post_merge_verified");
  assert(String(pr73.purpose || "").trim().length > 10, "PR73 purpose must be explicit");
  assert(String(pr74.purpose || "").trim().length > 10, "PR74 purpose must be explicit");
}

function validateOwnerDecisionCoverage(coverage) {
  assert(Array.isArray(coverage.owner_decision_contracts), "coverage must include owner_decision_contracts array");
  const contracts = coverage.owner_decision_contracts;
  const required = [
    "mandatory price > 0",
    "mandatory location",
    "120-day listing lifetime",
    "4 posts/week/account",
    "4-month free trial",
    "photos only",
    "maximum 7 photos",
    "fixed 4:3 processed derivative",
    "original discarded",
    "one-to-one communication",
    "audit append-only",
    "public media read only for published listings"
  ];
  for (const name of required) {
    const row = contracts.find((x) => String(x.contract || "").toLowerCase() === name.toLowerCase());
    assert(row, `missing owner decision coverage contract: ${name}`);
    assert(Array.isArray(row.artifacts) && row.artifacts.length > 0, `owner contract '${name}' missing artifacts`);
    assert(String(row.section || "").trim().length > 0, `owner contract '${name}' missing exact section`);
    assert(Array.isArray(row.tests) && row.tests.length > 0, `owner contract '${name}' missing executable tests`);
  }
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

  const listings = dataDictionary.entities.find((e) => String(e.name || "") === "listings");
  assert(listings, "listings entity must exist");
  assert((listings.lifecycle_states || []).includes("expired"), "listings lifecycle must include expired state");

  const manifest = read("docs/owner-control/p07/P07_EVIDENCE_MANIFEST.md");
  assert(manifest.includes("NO PRODUCTION CHANGE"), "manifest must include no-production-change pledge");

  const manifestJson = JSON.parse(read("docs/owner-control/p07/P07_EVIDENCE_MANIFEST.json"));
  validateEvidenceDependencies(manifestJson);

  const storagePolicy = read("docs/owner-control/p07/P07_STORAGE_POLICY_MATRIX_REVIEW_ONLY.md").toLowerCase();
  assert(!storagePolicy.includes("listing image original"), "storage policy must not include durable listing image original contract");
  assert(!storagePolicy.includes("canonical source object"), "storage policy must not include canonical source object contract");
  assert(storagePolicy.includes("temporary upload"), "storage policy must include temporary upload stage");
  assert(storagePolicy.includes("processed 4:3 derivative"), "storage policy must include processed 4:3 derivative stage");
  assert(storagePolicy.includes("discard temporary original"), "storage policy must include temporary-original discard stage");

  const rls = read("docs/owner-control/p07/P07_RLS_DESIGN_MATRIX_REVIEW_ONLY.md").toLowerCase();
  assert(rls.includes("audit_logs"), "RLS matrix must include audit_logs policy");
  assert(rls.includes("append-only") || rls.includes("immutable"), "audit_logs must be append-only/immutable");
  assert(rls.includes("no update") || rls.includes("update: denied"), "audit_logs must deny update");
  assert(rls.includes("no delete") || rls.includes("delete: denied"), "audit_logs must deny delete");
  assert(rls.includes("public read only when parent listing is published"), "listing_media must be public-readable only when parent listing is published");
  assert(rls.includes("no direct client access"), "identity map must deny direct client access");

  const coverage = JSON.parse(read("docs/owner-control/p07/P07_COVERAGE_MATRIX.json"));
  validateOwnerDecisionCoverage(coverage);

  // Negative checks required by owner review.
  expectFailure(() => validateEvidenceDependencies({ supporting_dependencies: [{ pr: 73, status: "merged_and_post_merge_verified", purpose: "only one dependency" }] }), "PR74");
  expectFailure(() => validateOwnerDecisionCoverage({ owner_decision_contracts: [] }), "mandatory price > 0");
  expectFailure(() => {
    const badStorage = "listing image original\ncanonical source object";
    assert(!badStorage.includes("listing image original"), "storage policy must not include durable listing image original contract");
  }, "listing image original");
  expectFailure(() => {
    const badRls = "audit_logs read/write";
    assert(!badRls.includes("read/write"), "audit_logs must not be broad read/write");
  }, "audit_logs must not be broad read/write");

  console.log("PR72 P07 DATABASE ARCHITECTURE REVIEW TEST PASS");
}());
